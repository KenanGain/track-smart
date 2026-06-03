import { useMemo, useState } from 'react';
import {
    ArrowLeft, Check, Undo2, FileText, ShieldCheck, Send, UserPlus,
    Clock, Inbox, AlertCircle, ChevronDown, Mail, Phone, MessageSquarePlus,
    Link2, Copy, ExternalLink, Calendar, Hourglass,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCOUNTS_DB } from '@/pages/accounts/accounts.data';
import type { Applicant } from './ats.data';
import { AskOrderModal, RequestLine } from './AtsAssignmentsPage';
import { loadApplicationForms, type ApplicationFormDef, type FormField } from './application-forms.data';
import { CONSENT_BY_ID, type ConsentCategory } from './consent-forms.data';
import { loadTemplates, type DriverHiringTemplate, type TemplateStep } from '@/pages/settings/driver-hiring-templates.data';
import {
    getApplicant, getApplication, setStepStatus, addRequest, addAsDriver, inviteDriver, applicationProgress,
    APP_STATUS_META, STEP_STATUS_META,
    type HiringApplication,
} from './hiring-application.data';

/**
 * Internal Application detail — the recruiter's view of a hiring application.
 * Step tracker + read-only submission viewer with Approve / Return, a Request
 * panel (ask the driver for a document or detail), the activity log, and
 * Add-as-driver once everything is submitted.
 */
export function ApplicationDetailPage({ applicantId, onNavigate }: { applicantId: string; onNavigate?: (path: string) => void }) {
    const applicant = useMemo(() => getApplicant(applicantId), [applicantId]);
    const [app, setApp] = useState<HiringApplication | undefined>(() => getApplication(applicantId));
    const refresh = () => setApp(getApplication(applicantId));

    const template = useMemo<DriverHiringTemplate | undefined>(
        () => loadTemplates().find(t => t.id === app?.templateId), [app?.templateId]);
    const formById = useMemo(() => {
        const m = new Map<string, ApplicationFormDef>();
        for (const f of loadApplicationForms()) m.set(f.id, f);
        return m;
    }, []);

    const [openStepId, setOpenStepId] = useState<string | null>(null);
    const [returnNoteFor, setReturnNoteFor] = useState<string | null>(null);
    const [returnNote, setReturnNote] = useState('');
    const [askOpen, setAskOpen] = useState(false);

    if (!applicant || !app || !template) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
                <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <AlertCircle className="mx-auto mb-3 text-amber-500" size={36} />
                    <h1 className="text-lg font-bold text-slate-900">Application not found</h1>
                    <button type="button" onClick={() => onNavigate?.('/ats-main')} className="mt-4 text-sm font-semibold text-blue-600 hover:underline">Back to Assignments</button>
                </div>
            </div>
        );
    }

    const steps = template.steps;
    const progress = applicationProgress(app, template);
    const statusMeta = APP_STATUS_META[app.status];
    const carrier = ACCOUNTS_DB.find(c => c.id === app.carrierId);
    const allSubmitted = steps.length > 0 && steps.every(s => { const st = app.steps[s.id]?.status; return st === 'submitted' || st === 'approved'; });

    const labelFor = (s: TemplateStep): string => {
        if (s.label) return s.label;
        if (s.kind === 'consent') return CONSENT_BY_ID[s.formId as ConsentCategory]?.title ?? 'Consent';
        const f = formById.get(s.formId);
        return f?.displayTitle || f?.name || 'Form';
    };

    const approve = (stepId: string) => { setStepStatus(applicantId, stepId, 'approved'); refresh(); };
    const doReturn = (stepId: string) => {
        setStepStatus(applicantId, stepId, 'returned', returnNote.trim() || 'Please review and resubmit.');
        setReturnNoteFor(null); setReturnNote(''); refresh();
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="border-b border-slate-200 bg-white px-8 py-4">
                <button type="button" onClick={() => onNavigate?.('/ats-main')} className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600">
                    <ArrowLeft size={13} /> Back to Assignments
                </button>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-lg font-bold text-white shadow-sm">
                            {applicant.firstName[0]}{applicant.lastName[0]}
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-slate-900">{applicant.firstName} {applicant.lastName}</h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {applicant.positionApplied} · {applicant.licenseType}{carrier ? ` · ${carrier.dbaName || carrier.legalName}` : ''} · {template.name}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold', statusMeta.cls)}>{statusMeta.label}</span>
                        <button type="button" disabled={!allSubmitted} onClick={() => { if (app.carrierId) { addAsDriver(applicantId, app.carrierId); refresh(); } }}
                            className={cn('inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-bold text-white shadow-sm',
                                allSubmitted && app.status !== 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'cursor-not-allowed bg-slate-300')}>
                            <UserPlus size={15} /> {app.status === 'approved' ? 'Added as driver' : 'Add as driver'}
                        </button>
                    </div>
                </div>
                {/* Progress bar */}
                <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>{progress.completed} of {progress.total} steps submitted</span>
                        <span className="tabular-nums">{progress.pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress.pct}%` }} />
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-5xl px-8 py-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
                {/* Step tracker */}
                <div className="space-y-3">
                    <h2 className="text-sm font-bold text-slate-900">Application steps</h2>
                    {steps.map((s, i) => {
                        const state = app.steps[s.id];
                        const st = state?.status ?? 'not_started';
                        const meta = STEP_STATUS_META[st];
                        const open = openStepId === s.id;
                        const canReview = st === 'submitted' || st === 'approved' || st === 'returned';
                        return (
                            <div key={s.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                                <button type="button" onClick={() => setOpenStepId(open ? null : s.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-500">{i + 1}</span>
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                                        {s.kind === 'consent' ? <ShieldCheck size={15} /> : <FileText size={15} />}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[13px] font-bold text-slate-800">{labelFor(s)}</span>
                                        {state?.submittedAt && <span className="text-[10px] text-slate-400">Submitted {new Date(state.submittedAt).toLocaleDateString()}</span>}
                                    </span>
                                    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold', meta.cls)}>{meta.label}</span>
                                    <ChevronDown size={15} className={cn('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
                                </button>

                                {open && (
                                    <div className="border-t border-slate-100 px-4 py-4">
                                        {!canReview ? (
                                            <p className="py-4 text-center text-[13px] text-slate-400">The driver hasn't submitted this step yet.</p>
                                        ) : (
                                            <>
                                                {s.kind === 'consent' ? (
                                                    <ConsentReview signature={state?.signature} />
                                                ) : (
                                                    <SubmissionReview fields={formById.get(s.formId)?.fields ?? []} values={state?.values} />
                                                )}
                                                {st === 'returned' && state?.returnNote && (
                                                    <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-700"><span className="font-bold">Returned:</span> {state.returnNote}</p>
                                                )}
                                                {st !== 'approved' && (
                                                    <div className="mt-4">
                                                        {returnNoteFor === s.id ? (
                                                            <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50/40 p-3">
                                                                <textarea value={returnNote} onChange={e => setReturnNote(e.target.value)} rows={2} placeholder="What should the driver fix?"
                                                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none" />
                                                                <div className="flex justify-end gap-2">
                                                                    <button type="button" onClick={() => { setReturnNoteFor(null); setReturnNote(''); }} className="rounded-md px-3 py-1.5 text-[12px] font-semibold text-slate-500 hover:text-slate-800">Cancel</button>
                                                                    <button type="button" onClick={() => doReturn(s.id)} className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-rose-700"><Undo2 size={13} /> Return to driver</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <button type="button" onClick={() => approve(s.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[12px] font-bold text-white hover:bg-emerald-700"><Check size={14} /> Approve</button>
                                                                <button type="button" onClick={() => { setReturnNoteFor(s.id); setReturnNote(''); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50"><Undo2 size={14} /> Return for changes</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Side rail: invite + applicant + request + activity */}
                <div className="space-y-5">
                    <InvitePanel app={app} firstName={applicant.firstName}
                        defaultEmail={applicant.email}
                        onInvite={(email) => { inviteDriver(applicantId, email); refresh(); }}
                        onOpenPortal={() => onNavigate?.(`/apply/${applicantId}`)} />
                    <ApplicantCard applicant={applicant} />
                    <RequestsCard requests={app.requests} onNew={() => setAskOpen(true)} />
                    <ActivityLog app={app} />
                </div>
            </div>

            {askOpen && (
                <AskOrderModal
                    applicant={applicant}
                    steps={steps}
                    formById={formById}
                    requests={app.requests}
                    onSend={(req) => { addRequest(applicantId, req); refresh(); }}
                    onClose={() => setAskOpen(false)}
                />
            )}
        </div>
    );
}

// ── Read-only submission viewer ──────────────────────────────────────────────

function fmtValue(v: unknown): string {
    if (v == null || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (Array.isArray(v)) {
        if (v.length === 0) return '—';
        if (typeof v[0] === 'string') return (v as string[]).join(', ');
        return `${v.length} entr${v.length === 1 ? 'y' : 'ies'}`;
    }
    if (typeof v === 'object') {
        const files = (v as { files?: string[] }).files;
        if (Array.isArray(files)) return files.length ? files.join(', ') : '— (no file)';
        return JSON.stringify(v);
    }
    return String(v);
}

function SubmissionReview({ fields, values }: { fields: FormField[]; values?: Record<string, unknown> }) {
    if (!values || Object.keys(values).length === 0) {
        return <p className="py-3 text-center text-[13px] text-slate-400">No values captured.</p>;
    }
    return (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {fields.map(f => (
                <div key={f.id} className="min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{f.label}</dt>
                    <dd className="truncate text-[13px] text-slate-800">{fmtValue(values[f.id])}</dd>
                </div>
            ))}
        </dl>
    );
}

function ConsentReview({ signature }: { signature?: string }) {
    return (
        <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Signature</div>
            {signature
                ? <img src={signature} alt="signature" className="mt-1 h-24 rounded-md border border-slate-200 bg-white object-contain p-1" />
                : <p className="mt-1 text-[13px] text-slate-400">No signature captured.</p>}
        </div>
    );
}

// ── Invite / portal panel ────────────────────────────────────────────────────

function InvitePanel({ app, firstName, defaultEmail, onInvite, onOpenPortal }: {
    app: HiringApplication;
    firstName: string;
    defaultEmail: string;
    onInvite: (email: string) => void;
    onOpenPortal: () => void;
}) {
    const link = app.invite?.link ?? `https://apply.tracksmart.app/${app.applicantId}`;
    const invited = !!app.invite;
    const [email, setEmail] = useState(app.invite?.email ?? defaultEmail);
    const [copied, setCopied] = useState(false);
    const copy = () => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); };

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-bold text-slate-900">Driver invite</h3>
                {invited && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                        <Check size={11} /> Sent {new Date(app.invite!.sentAt).toLocaleDateString()}
                    </span>
                )}
            </div>
            <div className="space-y-3 p-4">
                {!invited && (
                    <p className="text-[12px] text-slate-500">{firstName} hasn't been invited yet. Send the secure link so they can start their application.</p>
                )}
                <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Driver email</label>
                    <div className="relative">
                        <Mail size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                            className="h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2 text-[13px] focus:border-blue-500 focus:outline-none" />
                    </div>
                </div>
                <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Application link</label>
                    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50/60 px-2.5 py-1.5">
                        <Link2 size={12} className="shrink-0 text-slate-400" />
                        <span className="truncate text-[11px] text-slate-600">{link}</span>
                        <button type="button" onClick={copy} className="ml-auto inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700">
                            {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onInvite(email)} disabled={!email.trim()}
                        className={cn('inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-bold text-white', email.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'cursor-not-allowed bg-slate-300')}>
                        <Send size={13} /> {invited ? 'Resend invite' : 'Send invite'}
                    </button>
                    <button type="button" onClick={onOpenPortal} title="Preview the driver portal"
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">
                        <ExternalLink size={13} /> Portal
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Applicant info card ──────────────────────────────────────────────────────

function ApplicantCard({ applicant }: { applicant: Applicant }) {
    const rows: { Icon: typeof Mail; label: string; value: string }[] = [
        { Icon: Mail, label: 'Email', value: applicant.email || '—' },
        { Icon: Phone, label: 'Phone', value: applicant.phone || '—' },
        { Icon: Calendar, label: 'Applied', value: applicant.appliedDate || '—' },
        { Icon: Hourglass, label: 'In pipeline', value: `${applicant.daysInPipeline} day${applicant.daysInPipeline === 1 ? '' : 's'}` },
    ];
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3"><h3 className="text-sm font-bold text-slate-900">Applicant</h3></div>
            <dl className="divide-y divide-slate-50 px-4 py-1">
                {rows.map(r => (
                    <div key={r.label} className="flex items-center gap-2 py-2">
                        <r.Icon size={13} className="shrink-0 text-slate-400" />
                        <dt className="text-[12px] text-slate-500">{r.label}</dt>
                        <dd className="ml-auto truncate text-[12px] font-semibold text-slate-800">{r.value}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

// ── Requests card (opens the shared Ask/Order composer) ──────────────────────

function RequestsCard({ requests, onNew }: { requests: HiringApplication['requests']; onNew: () => void }) {
    const open = requests.filter(r => r.status === 'open').length;
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-bold text-slate-900">Requests {open > 0 && <span className="ml-1 text-[11px] font-bold text-amber-600">· {open} open</span>}</h3>
                <button type="button" onClick={onNew} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700">
                    <MessageSquarePlus size={13} /> Ask / Order
                </button>
            </div>
            <div className="p-4">
                {requests.length === 0 ? (
                    <p className="flex items-center gap-2 text-[12px] text-slate-400"><Inbox size={14} /> No requests yet. Ask the driver for a step, document, key number, or e-signature.</p>
                ) : (
                    <ul className="space-y-2.5">
                        {requests.map(r => <RequestLine key={r.id} r={r} />)}
                    </ul>
                )}
            </div>
        </div>
    );
}

// ── Activity log ─────────────────────────────────────────────────────────────

function ActivityLog({ app }: { app: HiringApplication }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3"><h3 className="text-sm font-bold text-slate-900">Activity</h3></div>
            <div className="p-4">
                {app.events.length === 0 ? (
                    <p className="flex items-center gap-2 text-[12px] text-slate-400"><Inbox size={14} /> No activity yet.</p>
                ) : (
                    <ul className="space-y-3">
                        {app.events.map(ev => (
                            <li key={ev.id} className="flex items-start gap-2.5">
                                <Clock size={13} className="mt-0.5 shrink-0 text-slate-300" />
                                <div className="min-w-0">
                                    <p className="text-[12px] text-slate-700">{ev.detail || ev.type.replace(/_/g, ' ')}</p>
                                    <p className="text-[10px] text-slate-400">{ev.by} · {new Date(ev.at).toLocaleString()}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
