import { useMemo, useState } from 'react';
import {
    ArrowLeft, Check, Undo2, FileText, ShieldCheck, Send, UserPlus,
    Clock, AlertCircle, ChevronDown, Mail, Phone, MessageSquarePlus,
    Link2, Copy, ExternalLink, Calendar, Hourglass, ListChecks, UploadCloud, KeyRound, XCircle,
    ClipboardList, Shield, PenTool, Database, Move,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCOUNTS_DB } from '@/pages/accounts/accounts.data';
import type { Applicant } from './ats.data';
import { AskOrderModal, RequestLine } from './AtsAssignmentsPage';
import { loadApplicationForms, type ApplicationFormDef, type FormField } from './application-forms.data';
import { DRIVER_DATA_KEYS } from './form-data-keys';
import { complianceFieldConfig, resolveFormDocType } from './form-doc-resolver';
import { CONSENT_BY_ID, type ConsentCategory } from './consent-forms.data';
import { loadTemplates, type DriverHiringTemplate, type TemplateStep } from '@/pages/settings/driver-hiring-templates.data';
import {
    getApplicant, getApplication, setStepSkipped, addRequest, addAsDriver, inviteDriver, applicationProgress,
    uploadRequirement, setRequirementState, setApplicationStatus, logRequirementAction,
    attachSignature, detachSignature, setSignatureVerified, setSignatureOnFile,
    APP_STATUS_META, STEP_STATUS_META,
    type HiringApplication, type AppStatus,
} from './hiring-application.data';
import { buildRequirements, requirementSummary, type Requirement } from './hiring-requirements';
import { detectDqDriverType, loadDqProfiles, resolveDqProfile, loadDqOverrides, DQ_DRIVER_TYPES } from './dq-profiles.data';
import { computeDqFile, type DqFileResult } from './dq-file-checklist';
import { RequirementList } from './RequirementList';
import { History } from 'lucide-react';

type DetailTabId = 'overview' | 'workflow' | 'documents' | 'compliance' | 'signature' | 'requests' | 'events';

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
    const [askOpen, setAskOpen] = useState(false);
    const [tab, setTab] = useState<DetailTabId>('overview');

    // Unified document + compliance requirements (same model as Hiring ATS).
    const stepsForReq = useMemo(() => template?.steps ?? [], [template]);
    const formSteps = useMemo(() => stepsForReq.filter(s => (s.kind ?? 'form') === 'form'), [stepsForReq]);
    const consentSteps = useMemo(() => stepsForReq.filter(s => s.kind === 'consent'), [stepsForReq]);
    const requirements = useMemo(
        () => applicant && app ? buildRequirements(applicant, app, stepsForReq, formById) : [],
        [applicant, app, stepsForReq, formById],
    );
    const reqUpload = (r: Requirement) => { if (applicant) { uploadRequirement(applicant.id, r.id, r.label); refresh(); } };
    const reqVerify = (r: Requirement) => { if (applicant) { setRequirementState(applicant.id, r.id, { status: 'verified' }); refresh(); } };
    const reqUnverify = (r: Requirement) => { if (applicant) { setRequirementState(applicant.id, r.id, { status: 'uploaded' }); refresh(); } };
    const reqSend   = (r: Requirement) => { if (applicant) { logRequirementAction(applicant.id, r.label, 'Sent document'); refresh(); } };
    const reqAskVerify = (_r: Requirement) => { setAskOpen(true); };

    // E-signature setup handlers
    const sigAttach   = (stepId: string, label: string) => { if (applicant) { attachSignature(applicant.id, stepId, label); refresh(); } };
    const sigDetach   = (stepId: string, label: string) => { if (applicant) { detachSignature(applicant.id, stepId, label); refresh(); } };
    const sigVerify   = (stepId: string, label: string, v: boolean) => { if (applicant) { setSignatureVerified(applicant.id, stepId, v, label); refresh(); } };
    const sigSetOnFile = (sig: string | undefined) => { if (applicant) { setSignatureOnFile(applicant.id, sig); refresh(); } };
    const sigAttachAll = (items: { stepId: string; label: string }[]) => { if (applicant) { items.forEach(it => attachSignature(applicant.id, it.stepId, it.label)); refresh(); } };

    const reqSummary = requirementSummary(requirements);
    const docReqs    = requirements.filter(r => r.kind === 'document');
    const compReqs   = requirements.filter(r => r.kind === 'compliance');

    // DQ profile + completion for header badge and overview
    const dqProfiles = useMemo(() => loadDqProfiles(), []);
    const dqResolved = useMemo(
        () => applicant && template ? resolveDqProfile(applicant, template.name, dqProfiles, loadDqOverrides()) : { profile: undefined, auto: true, type: 'local' as const },
        [applicant, template, dqProfiles],
    );
    const dqFile = useMemo(
        () => applicant && app && template ? computeDqFile(applicant, app, template.steps, formById, dqResolved.profile?.sections) : null,
        [applicant, app, template, formById, dqResolved],
    );

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

    // Per-driver step removal (the only step-level control kept on the Workflow tab).
    const toggleSkip = (stepId: string, skipped: boolean) => {
        if (skipped && !window.confirm('Remove this step for this driver? It will be excluded from their progress.')) return;
        setStepSkipped(applicantId, stepId, skipped); refresh();
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="border-b border-slate-200 bg-white px-8 pt-4 pb-5">
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
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold text-violet-700">
                                    {DQ_DRIVER_TYPES.find(t => t.id === detectDqDriverType(applicant))?.label ?? 'Standard'} Driver
                                </span>
                                {dqFile && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                                        DQ: {dqFile.pct}% · {dqFile.rollup.missing} missing
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Single status control — sets the entire application status. */}
                        <div className={cn('relative inline-flex items-center rounded-lg border', statusMeta.cls)}>
                            <span className="pointer-events-none pl-3 text-[10px] font-bold uppercase tracking-wider opacity-70">Status</span>
                            <select
                                value={app.status}
                                onChange={(e) => { setApplicationStatus(applicantId, e.target.value as AppStatus); refresh(); }}
                                className="cursor-pointer appearance-none bg-transparent py-2 pl-2 pr-8 text-xs font-bold focus:outline-none"
                            >
                                {(Object.keys(APP_STATUS_META) as AppStatus[]).map(s => (
                                    <option key={s} value={s} className="bg-white text-slate-700">{APP_STATUS_META[s].label}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60" />
                        </div>
                        <button type="button" onClick={() => setAskOpen(true)}
                            className="inline-flex h-10 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-100">
                            <MessageSquarePlus size={15} /> Ask / Order
                            {app.requests.filter(r => r.status === 'open').length > 0 && (
                                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
                                    {app.requests.filter(r => r.status === 'open').length}
                                </span>
                            )}
                        </button>
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

            {/* ── KPI strip ───────────────────────────────────────────────── */}
            <div className="border-b border-slate-200 bg-white">
                <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
                    {([
                        { label: 'Present',    value: reqSummary.fulfilled, tone: 'text-emerald-700', bg: 'bg-emerald-50/60', dot: 'bg-emerald-500' },
                        { label: 'Missing',    value: reqSummary.missing,   tone: 'text-rose-700',    bg: 'bg-rose-50/60',    dot: 'bg-rose-500' },
                        { label: 'Skipped',    value: requirements.filter(r => r.status === 'skipped').length, tone: 'text-slate-500', bg: 'bg-white', dot: 'bg-slate-300' },
                        { label: 'Completion', value: `${reqSummary.pct}%`, tone: 'text-blue-700',    bg: 'bg-blue-50/60',    dot: 'bg-blue-500' },
                    ] as const).map(item => (
                        <div key={item.label} className={cn('p-3.5', item.bg)}>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', item.dot)} />
                                {item.label}
                            </div>
                            <div className={cn('mt-1.5 text-xl font-black tabular-nums leading-none', item.tone)}>{item.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Tab strip ───────────────────────────────────────────────── */}
            <div className="border-b border-slate-200 bg-white px-8">
                <DetailTabs tab={tab} setTab={setTab}
                    counts={{
                        overview:    progress.completed,
                        workflow:    steps.length,
                        documents:   docReqs.filter(r => r.status === 'missing').length,
                        compliance:  compReqs.filter(r => r.status === 'missing').length,
                        signature:   consentSteps.length,
                        requests:    app.requests.filter(r => r.status === 'open').length,
                        events:      app.events.length,
                    }}
                />
            </div>

            <div className="px-8 py-6">
                <div className="min-w-0">
                    {tab === 'overview' && (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                            <ApplicationOverviewView
                                applicant={applicant}
                                app={app}
                                template={template}
                                carrierName={carrier?.dbaName || carrier?.legalName}
                                progress={progress}
                                formCount={formSteps.length}
                                consentCount={consentSteps.length}
                                missingDocuments={reqSummary.missing}
                                keyNumbers={compReqs.length}
                                dqFile={dqFile}
                            />
                            <div className="space-y-4">
                                <InvitePanel app={app} firstName={applicant.firstName}
                                    defaultEmail={applicant.email}
                                    onInvite={(email) => { inviteDriver(applicantId, email); refresh(); }}
                                    onOpenPortal={() => onNavigate?.(`/apply/${applicantId}`)} />
                                <ApplicantCard applicant={applicant} />
                            </div>
                        </div>
                    )}
                    {tab === 'workflow' && (
                    <div className="space-y-3">
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
                                        <span className={cn('block truncate text-[13px] font-bold', state?.skipped ? 'text-slate-400 line-through' : 'text-slate-800')}>{labelFor(s)}</span>
                                        {state?.submittedAt && <span className="text-[10px] text-slate-400">Submitted {new Date(state.submittedAt).toLocaleDateString()}</span>}
                                    </span>
                                    {state?.skipped
                                        ? <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">Removed</span>
                                        : <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold', meta.cls)}>{meta.label}</span>}
                                    <ChevronDown size={15} className={cn('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
                                </button>

                                {open && (
                                    <div className="border-t border-slate-100 px-4 py-4">
                                        {/* Per-driver step control: remove (make optional) or restore. */}
                                        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                                            <span className="text-[12px] text-slate-500">
                                                {state?.skipped
                                                    ? 'Removed for this driver — excluded from progress.'
                                                    : 'Not relevant for this driver? Remove this step.'}
                                            </span>
                                            <button type="button" onClick={() => toggleSkip(s.id, !state?.skipped)}
                                                className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-semibold',
                                                    state?.skipped ? 'border-blue-300 text-blue-700 hover:bg-blue-50' : 'border-slate-300 text-slate-600 hover:bg-white')}>
                                                {state?.skipped ? <><Undo2 size={13} /> Restore step</> : <><XCircle size={13} /> Remove step</>}
                                            </button>
                                        </div>
                                        {state?.skipped ? (
                                            <p className="py-2 text-center text-[13px] text-slate-400">This step is removed for this driver.</p>
                                        ) : !canReview ? (
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
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    </div>
                    )}

                    {tab === 'signature' && (
                        <SignaturesView app={app} steps={steps} formById={formById}
                            driverName={`${applicant.firstName} ${applicant.lastName}`}
                            onAttach={sigAttach} onDetach={sigDetach} onVerify={sigVerify}
                            onSetOnFile={sigSetOnFile} onAttachAll={sigAttachAll} onAsk={() => setAskOpen(true)} />
                    )}
                    {tab === 'documents' && (
                        <RequirementList requirements={docReqs} onUpload={reqUpload} onVerify={reqVerify} onUnverify={reqUnverify} onOrder={() => setAskOpen(true)}
                            onAskVerify={reqAskVerify} onSend={reqSend} title="Documents" />
                    )}
                    {tab === 'compliance' && (
                        <RequirementList requirements={compReqs} onUpload={reqUpload} onVerify={reqVerify} onUnverify={reqUnverify} onOrder={() => setAskOpen(true)}
                            onAskVerify={reqAskVerify} onSend={reqSend} title="Key Numbers & Compliance" />
                    )}
                    {tab === 'requests' && <RequestsView requests={app.requests} onNew={() => setAskOpen(true)} />}
                    {tab === 'events' && <EventLogView app={app} />}
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

// ── Signature tab — e-signature setup. One signature "on file" (the copy), then
//    a list of forms the hiring manager attaches / moves that signature to. ─────
interface SignatureRow {
    key: string;
    stepId: string;
    formName: string;
    detail?: string;
    signature?: string;     // currently attached signature, if any
    verified?: boolean;
    date?: string;
    attachable: boolean;    // consent steps can have the on-file signature attached
}

function collectSignatures(app: HiringApplication, steps: TemplateStep[], formById: Map<string, ApplicationFormDef>): SignatureRow[] {
    const rows: SignatureRow[] = [];
    for (const s of steps) {
        const st = app.steps[s.id];
        if (st?.skipped) continue;
        if (s.kind === 'consent') {
            const consent = CONSENT_BY_ID[s.formId as ConsentCategory];
            rows.push({
                key: s.id, stepId: s.id,
                formName: consent?.title ?? s.label ?? 'Consent form',
                detail: consent?.citation,
                signature: st?.signature, verified: st?.signatureVerified, date: st?.submittedAt,
                attachable: true,
            });
        } else {
            const form = formById.get(s.formId);
            for (const f of form?.fields ?? []) {
                if (f.type !== 'signature') continue;
                const val = st?.values?.[f.id];
                rows.push({
                    key: `${s.id}:${f.id}`, stepId: s.id,
                    formName: form?.displayTitle || form?.name || s.label || 'Form',
                    detail: f.label,
                    signature: typeof val === 'string' && val.startsWith('data:') ? val : undefined,
                    date: st?.submittedAt,
                    attachable: false,
                });
            }
        }
    }
    return rows;
}

interface SignatureHandlers {
    onAttach: (stepId: string, label: string) => void;
    onDetach: (stepId: string, label: string) => void;
    onVerify: (stepId: string, label: string, verified: boolean) => void;
    onAsk: () => void;
}

function SignatureFormRow({ row, onFile, h }: { row: SignatureRow; onFile?: string; h: SignatureHandlers }) {
    const attached = !!row.signature;
    const [label, status, cls] = row.verified
        ? ['Verified', 'Verified', 'border-emerald-200 bg-emerald-50 text-emerald-700']
        : attached
            ? ['Attached', 'Attached', 'border-blue-200 bg-blue-50 text-blue-700']
            : ['Pending', 'Pending', 'border-amber-200 bg-amber-50 text-amber-700'];
    void label;

    return (
        <li className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-slate-50/40 transition-colors">
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                row.verified ? 'bg-emerald-50 text-emerald-600' : attached ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400')}>
                <PenTool size={15} />
            </span>
            <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold text-slate-800">{row.formName}</div>
                {row.detail && <div className="truncate text-[11px] text-slate-500">{row.detail}</div>}
            </div>

            {/* Signature preview thumbnail */}
            {attached
                ? <img src={row.signature} alt="signature" className="h-9 w-28 shrink-0 rounded-md border border-slate-200 bg-white object-contain p-0.5" />
                : <div className="flex h-9 w-28 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/60 text-[10px] italic text-slate-300">no signature</div>}

            <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', cls)}>
                {row.verified && <Check size={10} />}{status}
            </span>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-1.5">
                {row.attachable ? (
                    attached ? (
                        <>
                            {row.verified
                                ? <SigBtn Icon={Undo2} label="Unverify" tone="warn" onClick={() => h.onVerify(row.stepId, row.formName, false)} />
                                : <SigBtn Icon={ShieldCheck} label="Verify" tone="good" onClick={() => h.onVerify(row.stepId, row.formName, true)} />}
                            <SigBtn Icon={Move} label="Move" onClick={() => h.onDetach(row.stepId, row.formName)} />
                            <SigBtn Icon={MessageSquarePlus} label="Ask" onClick={h.onAsk} />
                        </>
                    ) : (
                        <>
                            <SigBtn Icon={Link2} label="Attach" tone="primary" disabled={!onFile} onClick={() => h.onAttach(row.stepId, row.formName)} />
                            <SigBtn Icon={MessageSquarePlus} label="Ask" onClick={h.onAsk} />
                        </>
                    )
                ) : (
                    attached
                        ? <span className="text-[11px] font-semibold text-slate-400">Signed by driver</span>
                        : <SigBtn Icon={MessageSquarePlus} label="Ask" onClick={h.onAsk} />
                )}
            </div>
        </li>
    );
}

function SigBtn({ Icon, label, onClick, tone = 'ghost', disabled }: {
    Icon: React.ElementType; label: string; onClick?: () => void; tone?: 'ghost' | 'primary' | 'good' | 'warn'; disabled?: boolean;
}) {
    return (
        <button type="button" onClick={onClick} disabled={disabled}
            className={cn('inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                tone === 'primary' ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                    : tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700')}>
            <Icon size={11} /> {label}
        </button>
    );
}

function SignaturesView({ app, steps, formById, driverName, onAttach, onDetach, onVerify, onSetOnFile, onAttachAll, onAsk }: {
    app: HiringApplication;
    steps: TemplateStep[];
    formById: Map<string, ApplicationFormDef>;
    driverName: string;
    onAttach: (stepId: string, label: string) => void;
    onDetach: (stepId: string, label: string) => void;
    onVerify: (stepId: string, label: string, verified: boolean) => void;
    onSetOnFile: (sig: string | undefined) => void;
    onAttachAll: (items: { stepId: string; label: string }[]) => void;
    onAsk: () => void;
}) {
    const rows = collectSignatures(app, steps, formById);
    const onFile = app.signatureOnFile;
    const attachable = rows.filter(r => r.attachable);
    const attachedCount = attachable.filter(r => r.signature).length;
    const verifiedCount = attachable.filter(r => r.verified).length;
    const pendingItems = attachable.filter(r => !r.signature).map(r => ({ stepId: r.stepId, label: r.formName }));
    const h: SignatureHandlers = { onAttach, onDetach, onVerify, onAsk };

    if (rows.length === 0) {
        return <EmptyTab icon={PenTool} text="This application has no consent forms or signature fields." />;
    }

    return (
        <div className="space-y-4">
            {/* ── Signature on file (the master copy) ─────────────────────── */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">E-signature on file</h3>
                        <p className="text-[11px] text-slate-500">The driver's signature — attach or move it to the forms below.</p>
                    </div>
                    {onFile && pendingItems.length > 0 && (
                        <button type="button" onClick={() => onAttachAll(pendingItems)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[12px] font-bold text-white hover:bg-blue-700">
                            <Link2 size={13} /> Attach to all ({pendingItems.length})
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                    {onFile ? (
                        <>
                            <div className="rounded-lg border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 px-4 pt-2 pb-1">
                                <img src={onFile} alt="signature on file" className="h-16 w-52 object-contain" />
                                <div className="mt-0.5 border-t border-dashed border-slate-300 pt-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">{driverName}</div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="inline-flex w-fit items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                    <Check size={10} /> On file
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <SigBtn Icon={Copy} label="Recapture" onClick={() => onSetOnFile(makeSignature(driverName))} />
                                    <SigBtn Icon={XCircle} label="Remove" tone="warn" onClick={() => onSetOnFile(undefined)} />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3 text-[12px] text-slate-500">
                                <span className="flex h-12 w-40 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50/60 text-[11px] italic text-slate-300">No signature yet</span>
                                Capture the driver's signature to start attaching it to forms.
                            </div>
                            <button type="button" onClick={() => onSetOnFile(makeSignature(driverName))}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-[13px] font-bold text-white hover:bg-blue-700">
                                <PenTool size={14} /> Capture signature
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Forms requiring signature ───────────────────────────────── */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                    <h3 className="text-sm font-bold text-slate-900">Forms requiring signature</h3>
                    <div className="flex items-center gap-2 text-[11px] font-semibold">
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-700">{attachedCount} attached</span>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">{verifiedCount} verified</span>
                    </div>
                </div>
                <ul className="divide-y divide-slate-100">
                    {rows.map(row => <SignatureFormRow key={row.key} row={row} onFile={onFile} h={h} />)}
                </ul>
            </div>
        </div>
    );
}

/** A lightweight cursive "signature" rendered as an inline SVG data URL. */
function makeSignature(name: string): string {
    const svg =
        `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='72'>` +
        `<text x='14' y='48' font-family='Segoe Script, Brush Script MT, cursive' font-size='34' font-style='italic' fill='#1e293b'>${name}</text>` +
        `<path d='M10 56 q60 10 120 0 t110 -2' stroke='#94a3b8' stroke-width='1' fill='none' opacity='0.4'/>` +
        `</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ── Application data tabs (Data Fields · Documents · Key Numbers) ─────────────

type FieldRow = { stepId: string; stepLabel: string; formName: string; submitted: boolean; field: FormField; value: unknown };
type IconCmp = React.ComponentType<{ size?: number; className?: string }>;

const DISPLAY_TYPES = new Set<FormField['type']>(['heading', 'paragraph', 'bullet-list', 'alert']);
const isDocField = (f: FormField) => f.type === 'document' || f.type === 'compliance';
const isDataField = (f: FormField) => !DISPLAY_TYPES.has(f.type) && f.type !== 'document' && f.type !== 'compliance' && f.type !== 'signature';
function isEmptyVal(v: unknown): boolean {
    return v == null || v === '' || (Array.isArray(v) && v.length === 0);
}
type UploadSet = { number?: string; files: string[]; expiry?: string; issueDate?: string; issueState?: string; issueCountry?: string; historical?: boolean };
/** Normalize a document OR compliance field value into a flat list of upload sets. */
function uploadSets(value: unknown): UploadSet[] {
    if (!value || typeof value !== 'object') return [];
    const o = value as Record<string, unknown> & { entries?: Record<string, unknown>[]; historical?: Record<string, unknown>[]; files?: string[] };
    const pick = (e: Record<string, unknown>): UploadSet => ({
        number: typeof e.number === 'string' ? e.number : undefined,
        files: Array.isArray(e.files) ? (e.files as string[]).filter(Boolean) : [],
        expiry: e.expiry as string | undefined, issueDate: e.issueDate as string | undefined,
        issueState: e.issueState as string | undefined, issueCountry: e.issueCountry as string | undefined,
        historical: !!e.historical,
    });
    if (Array.isArray(o.entries)) return o.entries.map(pick);
    const sets: UploadSet[] = [pick(o)];
    if (Array.isArray(o.historical)) for (const h of o.historical) sets.push({ ...pick(h), historical: true });
    return sets;
}

function DetailTabs({ tab, setTab, counts }: {
    tab: DetailTabId; setTab: (t: DetailTabId) => void; counts: Partial<Record<DetailTabId, number>>;
}) {
    const tabs: { id: DetailTabId; label: string; icon: IconCmp }[] = [
        { id: 'overview',   label: 'Overview',    icon: ListChecks },
        { id: 'workflow',   label: 'Workflow',    icon: ClipboardList },
        { id: 'documents',  label: 'Documents',   icon: UploadCloud },
        { id: 'compliance', label: 'Compliance',  icon: Shield },
        { id: 'signature',  label: 'Signature',   icon: PenTool },
        { id: 'requests',   label: 'Requests',    icon: MessageSquarePlus },
        { id: 'events',     label: 'Event Log',   icon: History },
    ];
    return (
        <div className="flex items-center gap-1 overflow-x-auto -mb-px">
            {tabs.map(t => {
                const on = tab === t.id;
                const Icon = t.icon;
                return (
                    <button key={t.id} type="button" onClick={() => setTab(t.id)}
                        className={cn('inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                            on ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800')}>
                        <Icon size={14} /> {t.label}
                        {(counts[t.id] ?? 0) > 0 && (
                            <span className={cn('inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                                on ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600')}>
                                {counts[t.id]}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

function EmptyTab({ icon: Icon, text }: { icon: IconCmp; text: string }) {
    return (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center">
            <Icon className="mx-auto mb-2 h-6 w-6 text-slate-300" />
            <p className="text-[13px] text-slate-400">{text}</p>
        </div>
    );
}

function ApplicationOverviewView({ applicant, app, template, carrierName, progress, formCount, consentCount, missingDocuments, keyNumbers, dqFile }: {
    applicant: Applicant;
    app: HiringApplication;
    template: DriverHiringTemplate;
    carrierName?: string;
    progress: { completed: number; total: number; pct: number };
    formCount: number;
    consentCount: number;
    missingDocuments: number;
    keyNumbers: number;
    dqFile?: DqFileResult | null;
}) {
    const openRequests = app.requests.filter(r => r.status === 'open').length;
    const latestEvent = app.events[0];
    const summary = [
        { label: 'Workflow', value: `${progress.completed}/${progress.total}`, note: `${progress.pct}% submitted`, Icon: ListChecks },
        { label: 'Forms', value: String(formCount), note: `${consentCount} signatures`, Icon: ClipboardList },
        { label: 'Documents', value: String(missingDocuments), note: missingDocuments === 1 ? 'item missing' : 'items missing', Icon: UploadCloud },
        { label: 'Compliance', value: String(keyNumbers), note: 'key number fields', Icon: KeyRound },
        { label: 'Requests', value: String(openRequests), note: openRequests === 1 ? 'open request' : 'open requests', Icon: MessageSquarePlus },
        ...(dqFile ? [{ label: 'DQ File', value: `${dqFile.pct}%`, note: `${dqFile.rollup.missing} item${dqFile.rollup.missing === 1 ? '' : 's'} missing`, Icon: ListChecks }] : []),
    ];

    return (
        <div className="space-y-5">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Application file</p>
                            <h2 className="mt-1 text-base font-bold text-slate-900">{template.name}</h2>
                            <p className="mt-1 text-[12px] text-slate-500">
                                {applicant.positionApplied} - {applicant.licenseType}{carrierName ? ` - ${carrierName}` : ''}
                            </p>
                        </div>
                        <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold', APP_STATUS_META[app.status].cls)}>
                            {APP_STATUS_META[app.status].label}
                        </span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-3 lg:grid-cols-6">
                    {summary.map(item => (
                        <div key={item.label} className="bg-white p-4">
                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                <item.Icon size={13} /> {item.label}
                            </div>
                            <div className="mt-2 text-2xl font-black leading-none text-slate-900">{item.value}</div>
                            <div className="mt-1 text-[11px] font-medium text-slate-500">{item.note}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900">Application Information</h3>
                    <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {[
                            ['Applicant', `${applicant.firstName} ${applicant.lastName}`],
                            ['Email', applicant.email || '-'],
                            ['Phone', applicant.phone || '-'],
                            ['Applied', applicant.appliedDate || '-'],
                            ['Template', template.name],
                            ['Invite', app.invite ? `Sent ${new Date(app.invite.sentAt).toLocaleDateString()}` : 'Not sent'],
                        ].map(([label, value]) => (
                            <div key={label} className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
                                <dd className="mt-0.5 truncate text-[13px] font-semibold text-slate-800">{value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900">Review Status</h3>
                    <div className="mt-3 space-y-3">
                        <div>
                            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                                <span>{progress.completed} of {progress.total} steps submitted</span>
                                <span>{progress.pct}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-blue-500" style={{ width: `${progress.pct}%` }} />
                            </div>
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                            <span className="font-bold">Next action:</span>{' '}
                            {missingDocuments > 0
                                ? 'Request or upload the missing application documents.'
                                : openRequests > 0
                                    ? 'Follow up on open driver requests.'
                                    : progress.completed < progress.total
                                        ? 'Wait for the driver to finish remaining workflow steps.'
                                        : 'Review submitted forms and approve the application.'}
                        </div>
                        {latestEvent && (
                            <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Latest event</div>
                                <p className="mt-0.5 text-[13px] font-semibold text-slate-800">{latestEvent.detail || latestEvent.type.replace(/_/g, ' ')}</p>
                                <p className="text-[11px] text-slate-400">{latestEvent.by} - {new Date(latestEvent.at).toLocaleString()}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetaGrid({ s }: { s: UploadSet }) {
    const meta: [string, string][] = [];
    if (s.issueDate) meta.push(['Issue date', s.issueDate]);
    if (s.expiry) meta.push(['Expiry', s.expiry]);
    if (s.issueState) meta.push(['State / Prov.', s.issueState]);
    if (s.issueCountry) meta.push(['Country', s.issueCountry]);
    if (meta.length === 0) return null;
    return (
        <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
            {meta.map(([l, v]) => <div key={l}><dt className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{l}</dt><dd className="text-[12px] text-slate-700">{v}</dd></div>)}
        </dl>
    );
}

function UploadSetRow({ s, idx, numberLabel }: { s: UploadSet; idx?: number; numberLabel?: string }) {
    return (
        <div>
            {idx !== undefined && <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{s.historical ? 'Previous' : 'Set'} {idx}</p>}
            {numberLabel !== undefined && (
                <p className="text-[13px]"><span className="font-semibold text-slate-700">{numberLabel}: </span><span className="text-slate-800">{s.number || '—'}</span></p>
            )}
            {s.files.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1.5">
                    {s.files.map(f => <span key={f} className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"><FileText size={11} /> {f}</span>)}
                </div>
            ) : <p className="mt-1 text-[12px] text-slate-400">No file uploaded</p>}
            <MetaGrid s={s} />
        </div>
    );
}

export function DataFieldsView({ fieldRows, canonical }: { fieldRows: FieldRow[]; canonical: Record<string, unknown> }) {
    const dataRows = fieldRows.filter(r => isDataField(r.field) && !isEmptyVal(r.value));
    const byForm = new Map<string, FieldRow[]>();
    for (const r of dataRows) { const a = byForm.get(r.formName) ?? []; a.push(r); byForm.set(r.formName, a); }
    const canonRows = DRIVER_DATA_KEYS.filter(k => !isEmptyVal(canonical[k.key]));
    if (dataRows.length === 0 && canonRows.length === 0) return <EmptyTab icon={Database} text="No data captured yet — the driver hasn't filled in any fields." />;
    return (
        <div className="space-y-4">
            {canonRows.length > 0 && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
                    <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-700"><Database size={13} /> Driver data — captured once, reused everywhere</p>
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3">
                        {canonRows.map(k => (
                            <div key={k.key} className="min-w-0">
                                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{k.label}</dt>
                                <dd className="truncate text-[13px] font-medium text-slate-800">{fmtValue(canonical[k.key])}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            )}
            {[...byForm.entries()].map(([formName, rows]) => (
                <div key={formName} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[13px] font-bold text-slate-800">{formName}</div>
                    <div className="px-4 py-3">
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
                            {rows.map(r => (
                                <div key={r.field.id} className="min-w-0">
                                    <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{r.field.label}</dt>
                                    <dd className="truncate text-[13px] text-slate-800">{fmtValue(r.value)}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function DocumentsView({ fieldRows }: { fieldRows: FieldRow[] }) {
    const rows = fieldRows.filter(r => isDocField(r.field));
    if (rows.length === 0) return <EmptyTab icon={UploadCloud} text="This application has no document fields." />;
    return (
        <div className="space-y-3">
            {rows.map(r => {
                const dt = r.field.type === 'compliance'
                    ? complianceFieldConfig(r.field.complianceKeyNumberId).docType
                    : resolveFormDocType(r.field.documentTypeId);
                const sets = uploadSets(r.value);
                return (
                    <div key={r.stepId + r.field.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                            <UploadCloud size={15} className="shrink-0 text-slate-400" />
                            <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-800">{r.field.label}{dt && dt.name !== r.field.label ? <span className="font-medium text-slate-400"> · {dt.name}</span> : null}</span>
                            <span className="shrink-0 text-[11px] text-slate-400">{r.formName}</span>
                        </div>
                        <div className="space-y-2 px-4 py-3">
                            {sets.filter(s => s.files.length || s.number).length === 0
                                ? <p className="text-[12px] text-slate-400">Not uploaded yet.</p>
                                : sets.map((s, i) => <UploadSetRow key={i} s={s} idx={sets.length > 1 ? i + 1 : undefined} />)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export function KeyNumbersView({ fieldRows }: { fieldRows: FieldRow[] }) {
    const rows = fieldRows.filter(r => r.field.type === 'compliance');
    if (rows.length === 0) return <EmptyTab icon={KeyRound} text="This application has no key-number / compliance fields." />;
    return (
        <div className="space-y-3">
            {rows.map(r => {
                const { keyNumber, docType } = complianceFieldConfig(r.field.complianceKeyNumberId);
                const sets = uploadSets(r.value).filter(s => s.number || s.files.length || s.issueDate || s.expiry);
                return (
                    <div key={r.stepId + r.field.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                            <KeyRound size={15} className="shrink-0 text-violet-500" />
                            <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-800">{keyNumber?.name || r.field.label}</span>
                            {docType && <span className="shrink-0 text-[11px] text-slate-400">+ {docType.name}</span>}
                        </div>
                        <div className="space-y-2 px-4 py-3">
                            {sets.length === 0
                                ? <p className="text-[12px] text-slate-400">Not captured yet.</p>
                                : sets.map((s, i) => (
                                    <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/40 p-2.5">
                                        <UploadSetRow s={s} idx={sets.length > 1 ? i + 1 : undefined} numberLabel={keyNumber?.name || 'Number'} />
                                    </div>
                                ))}
                        </div>
                    </div>
                );
            })}
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

// ── Requests view ────────────────────────────────────────────────────────────

function RequestsView({ requests, onNew }: { requests: HiringApplication['requests']; onNew: () => void }) {
    const open = requests.filter(r => r.status === 'open').length;
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">Driver Requests</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">Application-level asks for forms, uploads, file fields, key numbers, and signatures.</p>
                </div>
                <button type="button" onClick={onNew} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[12px] font-bold text-white hover:bg-blue-700">
                    <MessageSquarePlus size={13} /> Ask / Order
                    {open > 0 && <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-bold text-blue-700">{open}</span>}
                </button>
            </div>
            {requests.length === 0 ? (
                <div className="px-4 py-10">
                    <EmptyTab icon={MessageSquarePlus} text="No requests yet. Ask the driver for a step, document, key number, file upload, or e-signature." />
                </div>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {requests.map(r => (
                        <li key={r.id} className="px-4 py-3">
                            <RequestLine r={r} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function EventLogView({ app }: { app: HiringApplication }) {
    if (app.events.length === 0) {
        return <EmptyTab icon={History} text="No event log entries yet." />;
    }
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">Event Log</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">Invite, request, upload, review, and status history for this application.</p>
                </div>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600">
                    {app.events.length} events
                </span>
            </div>
            <ul className="divide-y divide-slate-100">
                {app.events.map(ev => (
                    <li key={ev.id} className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[160px_minmax(0,1fr)_120px] sm:items-start">
                        <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                            <Clock size={13} className="text-slate-300" />
                            {new Date(ev.at).toLocaleDateString()}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-slate-800">{ev.detail || ev.type.replace(/_/g, ' ')}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">{new Date(ev.at).toLocaleTimeString()}</p>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500 sm:text-right">{ev.by}</div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
