import { useMemo, useRef, useState } from "react";
import {
    Briefcase, Search, Check, X as XIcon, Plus, ChevronRight,
    Inbox, Clock, UserCheck, UserX,
    TrendingUp, Calendar, Filter, Download, ArrowLeft,
    AlertCircle, AlertOctagon, FileText, ClipboardList,
    StickyNote, Bell, History, Printer, SkipForward, Save,
    User, ShieldAlert, ShieldCheck, BadgeCheck, Eye, Pencil, Upload, CalendarClock,
    Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    MOCK_APPLICANTS, PIPELINE_BLUEPRINT, STAGE_META, STEP_STATUS_META, TONE_CLS,
    type Applicant, type PipelineStepId, type Stage, type LicenseType,
    type StepStatus, type WorkflowStep,
} from "./ats.data";
import { CONSENT_BY_ID, type ConsentForm } from "./consent-forms.data";
import {
    TEMPLATE_BY_ID, DEFAULT_TEMPLATE, BOOKING_TYPE_META,
    type HiringTemplate, type TemplateStep,
    type BookingSlot, type RequirementMode,
} from "./hiring-templates.data";
import { SignaturePad } from "./SignaturePad";
import { DriverApplicationWizard } from "./DriverApplicationWizard";
import { CustomFormWizard } from "./CustomFormWizard";
import { loadApplicationForms, type ApplicationFormDef } from "./application-forms.data";
import { getApplication, applicationProgress, elapsedLabel, APP_STATUS_META, addRequest, inviteDriver, uploadRequirement, setRequirementState, setStepStatus, loadApplicants, saveApplicants, type HiringApplication, type AppStepStatus } from "./hiring-application.data";
import { loadTemplates, type TemplateStep as DriverTemplateStep } from "@/pages/settings/driver-hiring-templates.data";
import { AskOrderModal } from "./AtsAssignmentsPage";
import {
    computeDqFile,
    type DqStatus, type DqChecklistItem,
} from "./dq-file-checklist";
import {
    loadDqProfiles, loadDqOverrides, setDqOverride, resolveDqProfile,
    DQ_DRIVER_TYPES, type DqProfile,
} from "./dq-profiles.data";
import { buildRequirements, type Requirement } from "./hiring-requirements";
import { RequirementList } from "./RequirementList";
import { FileDown, Send, MessageSquarePlus, ListChecks, Copy, ExternalLink, Mail, Phone, Hourglass } from "lucide-react";

/**
 * Application Tracking System (ATS).
 *
 * Two-screen demo:
 *   - Applicant list (`AtsPage` body) — KPI strip + funnel + filter + list.
 *   - Applicant detail (`ApplicantDetailView`) — progress tracker + 5-tab body
 *     (Details / Documents / Notes / Alerts / Event Log). The Details tab body
 *     swaps in a step-specific screen (Application Review · Substance Testing
 *     · Decision · generic Screening Order) based on the active workflow step.
 */

export function AtsPage() {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selected = useMemo(
        () => selectedId ? MOCK_APPLICANTS.find(a => a.id === selectedId) ?? null : null,
        [selectedId],
    );

    if (selected) {
        return <ApplicantDetailView applicant={selected} onBack={() => setSelectedId(null)} />;
    }
    return <ApplicantListView onOpen={setSelectedId} />;
}

// ─────────────────────────────────────────────────────────────────────────
// List view
// ─────────────────────────────────────────────────────────────────────────

function ApplicantListView({ onOpen }: { onOpen: (id: string) => void }) {
    const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all');
    const [typeFilter, setTypeFilter] = useState<LicenseType | 'all'>('all');
    const [stepFilter, setStepFilter] = useState<PipelineStepId | 'all'>('all');
    const [search, setSearch] = useState('');
    // Add Applicant flow: pick a form, then open the wizard with it.
    const [pickerOpen, setPickerOpen] = useState(false);
    const [wizardForm, setWizardForm] = useState<ApplicationFormDef | null>(null);

    const counts = useMemo(() => {
        const out: Record<Stage, number> = { applications_received: 0, in_progress: 0, hired: 0, not_hired: 0 };
        for (const a of MOCK_APPLICANTS) out[a.stage] += 1;
        return out;
    }, []);

    const avgTimeToHire = useMemo(() => {
        const hired = MOCK_APPLICANTS.filter(a => a.stage === 'hired');
        if (hired.length === 0) return 0;
        return Math.round(hired.reduce((s, a) => s + a.daysInPipeline, 0) / hired.length);
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return MOCK_APPLICANTS.filter(a => {
            if (stageFilter !== 'all' && a.stage !== stageFilter) return false;
            if (typeFilter !== 'all' && a.licenseType !== typeFilter) return false;
            if (stepFilter !== 'all') {
                const step = a.steps.find(s => s.id === stepFilter);
                if (!step || step.status === 'not_started') return false;
            }
            if (q && !`${a.firstName} ${a.lastName}`.toLowerCase().includes(q)) return false;
            return true;
        }).sort((a, b) => b.appliedDate.localeCompare(a.appliedDate));
    }, [stageFilter, typeFilter, stepFilter, search]);

    const total = MOCK_APPLICANTS.length;
    const stageIconFor = (s: Stage) => s === 'applications_received' ? Inbox : s === 'in_progress' ? Clock : s === 'hired' ? UserCheck : UserX;

    return (
        <div className="flex-1 bg-slate-50 min-h-screen">
            {/* ── Page header ─────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200 px-8 py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-sm">
                            <Briefcase size={20} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl font-semibold text-slate-900">Application Tracking System</h1>
                            <p className="text-xs text-slate-500 mt-0.5">DOT-compliant driver hiring pipeline</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-slate-50 shadow-sm">
                            <Download size={14} /> Export
                        </button>
                        <button type="button" onClick={() => setPickerOpen(true)} className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-blue-700 shadow-sm">
                            <Plus size={14} /> Add Applicant
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-8 py-6 space-y-5">
                {/* ── KPI strip ──────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <KpiTile label="Total applicants" value={total} accent="bg-slate-500"
                        active={stageFilter === 'all'} onClick={() => setStageFilter('all')}
                        hover="Every applicant in the system, regardless of stage." />
                    {(['applications_received','in_progress','hired','not_hired'] as Stage[]).map(s => {
                        const meta = STAGE_META[s];
                        const Icon = stageIconFor(s);
                        return (
                            <KpiTile
                                key={s}
                                label={meta.label}
                                value={counts[s]}
                                accent={TONE_CLS[meta.tone].dot}
                                tone={TONE_CLS[meta.tone].text}
                                active={stageFilter === s}
                                onClick={() => setStageFilter(stageFilter === s ? 'all' : s)}
                                Icon={Icon}
                                hover={meta.description}
                            />
                        );
                    })}
                    <KpiTile label="Avg time-to-hire" value={`${avgTimeToHire}d`} accent="bg-violet-500" Icon={TrendingUp}
                        hover="Average days from application date to offer accepted, across hired applicants." />
                </div>

                {/* ── Stage funnel ───────────────────────────────────── */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Hiring funnel</h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Click a stage to filter the applicant list below. {total} applicants in window.
                            </p>
                        </div>
                        {stageFilter !== 'all' && (
                            <button type="button" onClick={() => setStageFilter('all')} className="text-[11px] font-bold text-blue-600 hover:text-blue-800">
                                Clear stage filter
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4">
                        {(['applications_received','in_progress','hired','not_hired'] as Stage[]).map(s => {
                            const meta = STAGE_META[s];
                            const tone = TONE_CLS[meta.tone];
                            const active = stageFilter === s;
                            const Icon = stageIconFor(s);
                            const sharePct = total > 0 ? Math.round((counts[s] / total) * 100) : 0;
                            return (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setStageFilter(active ? 'all' : s)}
                                    className={cn(
                                        'text-left rounded-lg border border-slate-200 border-l-4 bg-white p-3 hover:shadow-sm transition-all',
                                        tone.ring,
                                        active && 'ring-2 ' + tone.border,
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className={cn('h-6 w-6 rounded-full flex items-center justify-center', tone.chip)}>
                                            <Icon className="w-3.5 h-3.5" />
                                        </span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                                            {meta.label}
                                        </span>
                                    </div>
                                    <div className="flex items-baseline justify-between">
                                        <span className={cn('text-2xl font-black tabular-nums leading-none', tone.text)}>
                                            {counts[s]}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 tabular-nums">{sharePct}%</span>
                                    </div>
                                    <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={cn('h-full', tone.dot)} style={{ width: `${sharePct}%` }} />
                                    </div>
                                    <p className="mt-1.5 text-[10px] text-slate-500 leading-snug">{meta.description}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Filter row ────────────────────────────────────── */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="relative flex-1 min-w-[240px] max-w-md">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name…"
                                className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
                            />
                        </div>
                        <FilterSelect icon={Filter} label="License type" value={typeFilter}
                            onChange={v => setTypeFilter(v as LicenseType | 'all')}
                            options={[
                                { value: 'all',     label: 'All license types' },
                                { value: 'CDL-A',   label: 'CDL Class A' },
                                { value: 'CDL-B',   label: 'CDL Class B' },
                                { value: 'CDL',     label: 'CDL (Generic)' },
                                { value: 'Non-CDL', label: 'Non-CDL' },
                            ]} />
                        <FilterSelect icon={Filter} label="Pipeline step" value={stepFilter}
                            onChange={v => setStepFilter(v as PipelineStepId | 'all')}
                            options={[
                                { value: 'all', label: 'All pipeline steps' },
                                ...PIPELINE_BLUEPRINT.map(s => ({ value: s.id, label: s.label })),
                            ]} />
                        <span className="ml-auto text-[11px] font-medium text-slate-500 whitespace-nowrap">
                            {filtered.length === total
                                ? `${filtered.length} applicants`
                                : `${filtered.length} of ${total} applicants`}
                            {(stageFilter !== 'all' || typeFilter !== 'all' || stepFilter !== 'all' || search.trim()) && (
                                <button type="button" onClick={() => { setStageFilter('all'); setTypeFilter('all'); setStepFilter('all'); setSearch(''); }}
                                    className="ml-2 font-bold text-blue-600 hover:text-blue-800 underline-offset-2 hover:underline">
                                    Reset
                                </button>
                            )}
                        </span>
                    </div>
                </div>

                {/* ── Applicants — row cards ─────────────────────────── */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Applicants</h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">Click a row to open the applicant's full hiring file.</p>
                        </div>
                    </div>
                    {/* Pipeline stage labels — shown once as a header so rows stay clean. */}
                    {filtered.length > 0 && (
                        <div className="hidden border-b border-slate-100 bg-slate-50/40 px-6 py-2 lg:block">
                            <div className="grid grid-cols-[240px_minmax(0,1fr)] items-center gap-6">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Applicant</span>
                                <div className="overflow-x-auto">
                                    <div className="flex min-w-[640px]">
                                        {PIPELINE_BLUEPRINT.map(s => (
                                            <div key={s.id} className="flex-1 px-1 text-center text-[10px] font-bold uppercase leading-snug tracking-wider text-slate-500">
                                                {s.lines.map((ln, li) => <div key={li}>{ln}</div>)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {filtered.length === 0 ? (
                        <div className="px-6 py-16 text-center text-sm text-slate-500">No applicants match the current filters.</div>
                    ) : (
                        <ul className="divide-y divide-slate-200">
                            {filtered.map(a => (
                                <AtsApplicantRow key={a.id} applicant={a} onOpen={() => onOpen(a.id)} />
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {pickerOpen && (
                <ApplicationFormPicker
                    onPick={(f) => { setWizardForm(f); setPickerOpen(false); }}
                    onClose={() => setPickerOpen(false)}
                />
            )}
            {wizardForm && wizardForm.kind === 'standard' && (
                <DriverApplicationWizard
                    appForm={wizardForm}
                    onClose={() => setWizardForm(null)}
                />
            )}
            {wizardForm && wizardForm.kind === 'custom' && (
                <CustomFormWizard
                    appForm={wizardForm}
                    onClose={() => setWizardForm(null)}
                />
            )}
        </div>
    );
}

/** The Hiring-ATS pipeline stages (PSP · MVR · Criminal Background · Substance ·
 *  DOT/Employment · Decision) as Ask/Order targets — so "Order" orders a SCREENING
 *  here, not an application form. */
function atsOrderSteps(): DriverTemplateStep[] {
    return PIPELINE_BLUEPRINT.map(b => ({ id: b.id, kind: 'form' as const, formId: b.id, label: b.label, required: true }));
}

// ── Applicant row (pipeline + dates + Ask/Order actions) ──

function AtsApplicantRow({ applicant: a, onOpen }: {
    applicant: Applicant; onOpen: () => void;
}) {
    const meta = STAGE_META[a.stage];
    const tone = TONE_CLS[meta.tone];
    const [askOpen, setAskOpen] = useState(false);
    const [bump, setBump] = useState(0);
    const app = useMemo(() => getApplication(a.id), [a.id, bump]);
    const formById = useMemo(() => {
        const m = new Map<string, ApplicationFormDef>();
        for (const f of loadApplicationForms()) m.set(f.id, f);
        return m;
    }, []);
    const openReq = app?.requests.filter(r => r.status === 'open').length ?? 0;
    const openAlerts = a.alerts.filter(al => !al.resolvedAt).length;

    return (
        <li className="px-6 py-4 transition-colors hover:bg-slate-50/60">
            <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
                <div className="min-w-0">
                    <button type="button" onClick={onOpen} className="block truncate text-left text-base font-semibold text-blue-600 hover:underline">
                        {a.firstName} {a.lastName}
                    </button>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-slate-500">
                        <span className="font-mono">{a.licenseType}</span>
                        <span className="text-slate-300">·</span>
                        <Calendar size={11} className="text-slate-400" />
                        <span className="font-mono">{a.appliedDate}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', tone.chip)}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
                            {meta.label}
                        </span>
                        {openAlerts > 0 && (
                            <span className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                                <AlertCircle size={10} /> {openAlerts}
                            </span>
                        )}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <PipelineProgress steps={a.steps} hideLabels />
                </div>
            </div>

            {/* Dates + actions footer */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1"><Calendar size={11} className="text-slate-400" /> Applied {a.appliedDate}</span>
                    <span className="inline-flex items-center gap-1"><Clock size={11} className="text-slate-400" /> {a.daysInPipeline}d in pipeline</span>
                    {app?.invite && <span className="inline-flex items-center gap-1"><Send size={11} className="text-slate-400" /> Invited {elapsedLabel(app.invite.sentAt)} ago</span>}
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={onOpen}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                        <FileText size={13} /> Open file
                    </button>
                    {app && (
                        <button type="button" onClick={() => setAskOpen(true)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                            <MessageSquarePlus size={13} /> Ask / Order
                            {openReq > 0 && <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-100 px-1 text-[9px] font-bold text-blue-700">{openReq}</span>}
                        </button>
                    )}
                </div>
            </div>

            {askOpen && app && (
                <AskOrderModal
                    applicant={a}
                    steps={atsOrderSteps()}
                    formById={formById}
                    requests={app.requests}
                    onSend={(req) => { addRequest(a.id, req); setBump(n => n + 1); }}
                    onClose={() => setAskOpen(false)}
                />
            )}
        </li>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Add Applicant — application-form picker
// ─────────────────────────────────────────────────────────────────────────

function ApplicationFormPicker({ onPick, onClose }: {
    onPick: (form: ApplicationFormDef) => void;
    onClose: () => void;
}) {
    const forms = loadApplicationForms();
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-6" onClick={onClose}>
            <div className="w-full max-w-md rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                    <h2 className="text-sm font-bold text-slate-900">Choose an application form</h2>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <XIcon size={16} />
                    </button>
                </div>
                <div className="max-h-[60vh] space-y-2 overflow-y-auto p-4">
                    {forms.map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => onPick(f)}
                            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left hover:border-blue-300 hover:bg-blue-50/50"
                        >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100">
                                <FileText size={16} className="text-slate-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[13px] font-semibold text-slate-900">{f.name}</span>
                                    {f.isDefault && (
                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                            Default
                                        </span>
                                    )}
                                </div>
                                <div className="truncate text-[11px] text-slate-500">
                                    {f.description || '13 standard steps'}
                                </div>
                            </div>
                            <ChevronRight size={15} className="shrink-0 text-slate-300" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Detail view
// ─────────────────────────────────────────────────────────────────────────

type DetailTabId = 'details' | 'documents' | 'forms' | 'consent_forms' | 'dq_file' | 'notes' | 'alerts' | 'event_log';

function ApplicantDetailView({ applicant, onBack }: { applicant: Applicant; onBack: () => void }) {
    const [activeTab, setActiveTab] = useState<DetailTabId>('details');
    const [activeStepId, setActiveStepId] = useState<PipelineStepId>(applicant.activeStepId);
    const [, setStepBump] = useState(0);
    const activeStep = applicant.steps.find(s => s.id === activeStepId)!;

    // Change a pipeline step's status (persisted) — the per-step status editor.
    const setStepStatusFor = (stepId: PipelineStepId, status: StepStatus) => {
        const step = applicant.steps.find(s => s.id === stepId);
        if (!step) return;
        step.status = status;
        const next = applicant.steps.find(s => s.status !== 'completed' && s.status !== 'skipped');
        applicant.activeStepId = (next ?? applicant.steps[applicant.steps.length - 1]).id;
        saveApplicants(loadApplicants().map(a => a.id === applicant.id ? applicant : a));
        setStepBump(n => n + 1);
    };
    const openAlerts = applicant.alerts.filter(a => !a.resolvedAt).length;
    const [templateId] = useState<string>(applicant.assignedTemplateId);
    const [photo, setPhoto] = useState<string | undefined>(applicant.photoUrl);

    // Linked hiring application (Application Tracking) — powers Ask/Order from here too.
    const [askOpen, setAskOpen] = useState(false);
    const [appBump, setAppBump] = useState(0);
    const hiringApp = useMemo(() => getApplication(applicant.id), [applicant.id, appBump]);
    const hiringTpl = useMemo(() => hiringApp ? loadTemplates().find(t => t.id === hiringApp.templateId) : undefined, [hiringApp]);
    const formByIdHiring = useMemo(() => {
        const m = new Map<string, ApplicationFormDef>();
        for (const f of loadApplicationForms()) m.set(f.id, f);
        return m;
    }, []);
    const openRequests = hiringApp?.requests.filter(r => r.status === 'open').length ?? 0;

    // Keep the applicant's assignedTemplateId in sync with the local picker so
    // every step body (which reads from it) re-renders with the new template.
    applicant.assignedTemplateId = templateId;

    const activeTpl: HiringTemplate = TEMPLATE_BY_ID[templateId] ?? DEFAULT_TEMPLATE;
    const enabledSteps = activeTpl.steps.filter(s => s.enabled).length;

    const formSteps = useMemo(() => (hiringTpl?.steps ?? []).filter(s => (s.kind ?? 'form') === 'form'), [hiringTpl]);
    const consentSteps = useMemo(() => (hiringTpl?.steps ?? []).filter(s => s.kind === 'consent'), [hiringTpl]);

    // Unified document + compliance requirements (one list, fulfilment state on the application).
    const requirements = useMemo(
        () => buildRequirements(applicant, hiringApp, hiringTpl?.steps ?? [], formByIdHiring),
        [applicant, hiringApp, hiringTpl, formByIdHiring],
    );
    const reqUpload = (r: Requirement) => { uploadRequirement(applicant.id, r.id, r.label); setAppBump(n => n + 1); };
    const reqVerify = (r: Requirement) => { setRequirementState(applicant.id, r.id, { status: 'verified' }); setAppBump(n => n + 1); };
    const reqMissing = requirements.filter(r => r.status === 'missing').length;

    // DQ file checklist — the right profile (by driver type / override) resolved live.
    const [dqRefresh, setDqRefresh] = useState(0);
    const dqProfiles = useMemo(() => loadDqProfiles(), [dqRefresh]);
    const dqResolved = useMemo(
        () => resolveDqProfile(applicant, hiringTpl?.name, dqProfiles, loadDqOverrides()),
        [applicant, hiringTpl, dqProfiles, dqRefresh],
    );
    const dqFile = useMemo(
        () => computeDqFile(applicant, hiringApp, hiringTpl?.steps ?? [], formByIdHiring, dqResolved.profile?.sections),
        [applicant, hiringApp, hiringTpl, formByIdHiring, dqResolved],
    );

    const tabs: { id: DetailTabId; label: string; Icon: React.ElementType; count?: number }[] = [
        { id: 'details',       label: 'Details',       Icon: User },
        { id: 'forms',         label: 'Forms',         Icon: ClipboardList, count: formSteps.length },
        { id: 'consent_forms', label: 'Consent Forms', Icon: BadgeCheck,   count: consentSteps.length },
        { id: 'documents',     label: 'Documents & Compliance', Icon: FileText, count: reqMissing },
        { id: 'dq_file',       label: 'DQ File',       Icon: ListChecks,   count: dqFile.rollup.missing },
        { id: 'notes',         label: 'Notes',         Icon: StickyNote,   count: applicant.notes.length },
        { id: 'alerts',        label: 'Alerts',        Icon: Bell,         count: openAlerts },
        { id: 'event_log',     label: 'Event Log',     Icon: History,      count: applicant.eventLog.length },
    ];

    return (
        <div className="flex-1 bg-slate-50 min-h-screen">
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200 px-8 pt-4 pb-5">
                {/* Breadcrumb row — Back link sits on its own line, matching
                    the rest of the app's detail-page convention. */}
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-3"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to List
                </button>

                <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Identity block */}
                    <div className="flex items-center gap-4 min-w-0">
                        <ApplicantAvatar name={`${applicant.firstName} ${applicant.lastName}`} url={photo} onChange={setPhoto} />
                        <div className="min-w-0">
                            <div className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-0.5">Application file</div>
                            <h1 className="text-xl font-semibold text-slate-900 truncate">
                                {applicant.firstName} {applicant.middleName ? applicant.middleName + ' ' : ''}{applicant.lastName}
                            </h1>
                            <p className="text-xs text-slate-500 mt-1">
                                {applicant.positionApplied} · Applied {applicant.appliedDate} · {applicant.daysInPipeline}d in pipeline
                            </p>
                        </div>
                    </div>

                    {/* Action toolbar */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {hiringApp && (
                            <button type="button" onClick={() => setAskOpen(true)}
                                className="h-9 px-3 rounded-md border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-blue-100 shadow-sm">
                                <MessageSquarePlus className="h-4 w-4" /> Ask / Order
                                {openRequests > 0 && <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">{openRequests}</span>}
                            </button>
                        )}
                        <button type="button" className="h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-sm font-medium inline-flex items-center gap-1.5 hover:bg-slate-50 shadow-sm">
                            <Printer className="h-4 w-4" /> Print
                        </button>
                        <button type="button" className="h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-sm font-medium inline-flex items-center gap-1.5 hover:bg-slate-50 shadow-sm">
                            <SkipForward className="h-4 w-4" /> Skip / Complete
                        </button>
                        <button type="button" className="h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-sm font-medium inline-flex items-center gap-1.5 hover:bg-slate-50 shadow-sm">
                            <Save className="h-4 w-4" /> Save
                        </button>
                        <button type="button" className="h-9 px-4 rounded-md bg-blue-600 text-white text-sm font-medium inline-flex items-center gap-1.5 hover:bg-blue-700 shadow-sm">
                            Next Step <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Linked hiring application (from Application Tracking) ── */}
            <LinkedApplicationBar applicant={applicant} />

            {/* ── Template selector strip ───────────────────────────── */}
            <div className="bg-white border-b border-slate-200 px-8 py-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
                            Hiring template
                        </div>
                        {/* Locked to the template assigned at the application level — not a free pick. */}
                        <div className="inline-flex h-9 min-w-[280px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800">
                            <span className="truncate">{hiringTpl?.name ?? activeTpl.name}</span>
                            <span className="shrink-0 rounded bg-slate-200/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">Assigned</span>
                        </div>
                        <span className="text-[11px] text-slate-500 truncate">{activeTpl.description}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold whitespace-nowrap">
                        <span className="text-slate-500"><span className="tabular-nums text-slate-900">{enabledSteps}</span> steps</span>
                        <span className="text-slate-500"><span className="tabular-nums text-slate-900">{activeTpl.steps.reduce((s, x) => s + (x.enabled ? x.consents.length : 0), 0)}</span> consents</span>
                        <span className="text-slate-500"><span className="tabular-nums text-slate-900">{activeTpl.steps.reduce((s, x) => s + (x.enabled ? x.documents.length : 0), 0)}</span> docs</span>
                        <span className="text-slate-500"><span className="tabular-nums text-slate-900">{activeTpl.steps.reduce((s, x) => s + (x.enabled ? x.bookings.length : 0), 0)}</span> bookings</span>
                    </div>
                </div>
            </div>

            {/* ── Progress tracker ──────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200 px-8 py-5 overflow-x-auto">
                <div className="min-w-[820px]">
                    <PipelineProgress steps={applicant.steps} activeId={activeStepId} onSelect={setActiveStepId} />
                </div>
            </div>

            {/* ── Tab strip ────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200 px-8">
                <div className="flex items-center gap-1 -mb-px">
                    {tabs.map(tab => {
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                                    active
                                        ? 'text-blue-600 border-blue-600'
                                        : 'text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300',
                                )}
                            >
                                <tab.Icon size={15} className={active ? 'text-blue-600' : 'text-slate-400'} />
                                <span>{tab.label}</span>
                                {typeof tab.count === 'number' && tab.count > 0 && (
                                    <span className={cn(
                                        'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold',
                                        active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600',
                                    )}>{tab.count}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Tab content + side rail ───────────────────────────── */}
            <div className={cn('px-8 py-6', hiringApp && 'grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]')}>
                <div className="min-w-0">
                    {activeTab === 'details'       && <DetailsTab applicant={applicant} activeStep={activeStep} onSetStepStatus={(s) => setStepStatusFor(activeStep.id, s)} />}
                    {activeTab === 'documents'     && <RequirementList requirements={requirements} onUpload={reqUpload} onVerify={reqVerify} onOrder={() => setAskOpen(true)} />}
                    {activeTab === 'forms'         && <FormsTab app={hiringApp} steps={formSteps} formById={formByIdHiring} onOrder={() => setAskOpen(true)} onSetFormStatus={(stepId, s) => { setStepStatus(applicant.id, stepId, s); setAppBump(n => n + 1); }} />}
                    {activeTab === 'consent_forms' && <ConsentFormsTab app={hiringApp} steps={consentSteps} onOrder={() => setAskOpen(true)} />}
                    {activeTab === 'dq_file'       && (
                        <DqFileTab
                            sections={dqFile.sections} rollup={dqFile.rollup} onOrder={() => setAskOpen(true)}
                            profiles={dqProfiles} appliedProfile={dqResolved.profile} auto={dqResolved.auto} driverType={dqResolved.type}
                            onSetProfile={(pid) => { setDqOverride(applicant.id, pid); setDqRefresh(n => n + 1); }}
                        />
                    )}
                    {activeTab === 'notes'         && <NotesTab applicant={applicant} />}
                    {activeTab === 'alerts'        && <AlertsTab applicant={applicant} />}
                    {activeTab === 'event_log'     && <EventLogTab applicant={applicant} />}
                </div>
                {hiringApp && (
                    <DetailSideRail
                        applicant={applicant} app={hiringApp}
                        onAsk={() => setAskOpen(true)}
                        onResend={() => { inviteDriver(applicant.id, hiringApp.invite?.email ?? applicant.email); setAppBump(n => n + 1); }}
                        onPortal={() => window.open(hiringApp.invite?.link ?? `https://apply.tracksmart.app/${applicant.id}`, '_blank')}
                    />
                )}
            </div>

            {askOpen && hiringApp && (
                <AskOrderModal
                    applicant={applicant}
                    steps={atsOrderSteps()}
                    formById={formByIdHiring}
                    requests={hiringApp.requests}
                    onSend={(req) => { addRequest(applicant.id, req); setAppBump(n => n + 1); }}
                    onClose={() => setAskOpen(false)}
                />
            )}
        </div>
    );
}

// ── Linked hiring application (bridges the Application Tracking flow) ────────

function LinkedApplicationBar({ applicant }: { applicant: Applicant }) {
    const app = getApplication(applicant.id);
    const tpl = app ? loadTemplates().find(t => t.id === app.templateId) : undefined;
    const progress = app ? applicationProgress(app, tpl) : undefined;
    const submitted = !!progress && progress.total > 0 && progress.completed === progress.total;

    return (
        <div className="border-b border-slate-200 bg-blue-50/40 px-8 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600"><Send size={14} /></span>
                    <div className="min-w-0">
                        <p className="text-[12px] font-bold text-slate-800">
                            {app ? 'Linked to Application Tracking' : 'Not yet invited via Application Tracking'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                            {app ? (
                                <>
                                    {app.invite ? `Invited ${elapsedLabel(app.invite.sentAt)} ago` : 'Created'}
                                    {tpl ? ` · ${tpl.name}` : ''}
                                    {progress ? ` · ${progress.completed}/${progress.total} steps submitted` : ''}
                                    {' · '}
                                    <span className="font-semibold text-slate-700">
                                        {submitted ? 'Application submitted — ready for Application Review' : 'Driver still completing the application'}
                                    </span>
                                </>
                            ) : (
                                'Application Tracking is the first step — invite the driver to fill the hiring template; their submitted application then lands here for review.'
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {app && <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold', APP_STATUS_META[app.status].cls)}>{APP_STATUS_META[app.status].label}</span>}
                </div>
            </div>
        </div>
    );
}

// ── Side rail (Driver invite · Applicant · Requests · Activity) ─────────────

function RailRow({ Icon, label, value }: { Icon: React.ElementType; label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-2 border-b border-slate-50 pb-1.5 last:border-0 last:pb-0">
            <span className="inline-flex items-center gap-1.5 text-slate-500"><Icon size={12} className="text-slate-400" /> {label}</span>
            <span className="truncate font-semibold text-slate-800">{value}</span>
        </div>
    );
}

function DetailSideRail({ applicant, app, onAsk, onResend, onPortal }: {
    applicant: Applicant; app: HiringApplication; onAsk: () => void; onResend: () => void; onPortal: () => void;
}) {
    const openReqs = app.requests.filter(r => r.status === 'open');
    const link = app.invite?.link ?? `https://apply.tracksmart.app/${applicant.id}`;
    return (
        <aside className="space-y-4 lg:sticky lg:top-4 lg:h-fit">
            {/* Driver invite */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Driver invite</h3>
                    {app.invite && <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700"><Check size={10} /> Sent {new Date(app.invite.sentAt).toLocaleDateString()}</span>}
                </div>
                <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Driver email</div>
                <div className="mt-1 flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1.5 text-[12px] text-slate-700"><Mail size={12} className="shrink-0 text-slate-400" /> <span className="truncate">{app.invite?.email ?? applicant.email}</span></div>
                <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Application link</div>
                <div className="mt-1 flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1.5 text-[11px] text-slate-500">
                    <span className="truncate">{link}</span>
                    <button type="button" onClick={() => navigator.clipboard?.writeText(link)} className="ml-auto inline-flex shrink-0 items-center gap-1 font-semibold text-slate-600 hover:text-blue-700"><Copy size={11} /> Copy</button>
                </div>
                <div className="mt-3 flex gap-2">
                    <button type="button" onClick={onResend} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 text-[12px] font-bold text-white hover:bg-blue-700"><Send size={13} /> Resend invite</button>
                    <button type="button" onClick={onPortal} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[12px] font-bold text-slate-700 hover:bg-slate-50"><ExternalLink size={13} /> Portal</button>
                </div>
            </div>

            {/* Applicant */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">Applicant</h3>
                <div className="mt-2 space-y-2 text-[12px]">
                    <RailRow Icon={Mail} label="Email" value={applicant.email} />
                    <RailRow Icon={Phone} label="Phone" value={applicant.phone ?? '—'} />
                    <RailRow Icon={Calendar} label="Applied" value={applicant.appliedDate} />
                    <RailRow Icon={Hourglass} label="In pipeline" value={`${applicant.daysInPipeline} days`} />
                </div>
            </div>

            {/* Requests */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Requests {openReqs.length > 0 && <span className="text-[11px] font-bold text-amber-600">· {openReqs.length} open</span>}</h3>
                    <button type="button" onClick={onAsk} className="inline-flex h-7 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-[11px] font-bold text-white hover:bg-blue-700"><MessageSquarePlus size={12} /> Ask / Order</button>
                </div>
                {openReqs.length === 0 ? (
                    <p className="mt-2 text-[11px] text-slate-400">No open requests.</p>
                ) : (
                    <ul className="mt-2 space-y-2.5">
                        {openReqs.map(r => (
                            <li key={r.id} className="border-b border-slate-50 pb-2 text-[12px] last:border-0 last:pb-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="inline-flex items-center rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-700">{r.itemKind ?? r.kind}</span>
                                    {r.itemName && <span className="font-bold text-slate-800">{r.itemName}</span>}
                                </div>
                                <p className="mt-0.5 text-[11px] text-slate-500">{r.message}</p>
                                <p className="text-[10px] text-slate-400">via {r.channel} · {new Date(r.sentAt).toLocaleDateString()} · {r.status}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Activity */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">Activity</h3>
                <ul className="mt-2 space-y-2.5">
                    {app.events.slice(0, 8).map(e => (
                        <li key={e.id} className="flex gap-2 text-[12px]">
                            <Clock size={12} className="mt-0.5 shrink-0 text-slate-300" />
                            <div className="min-w-0">
                                <p className="text-slate-700">{e.detail ?? e.type.replace(/_/g, ' ')}</p>
                                <p className="text-[10px] text-slate-400">{e.by} · {new Date(e.at).toLocaleString()}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </aside>
    );
}

// ── Details tab ───────────────────────────────────────────────────────────

function DetailsTab({ applicant, activeStep, onSetStepStatus }: { applicant: Applicant; activeStep: WorkflowStep; onSetStepStatus: (s: StepStatus) => void }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-5">
            <RequiredActionsPanel applicant={applicant} activeStep={activeStep} onSetStepStatus={onSetStepStatus} />
            <div className="min-w-0 space-y-5">
                {activeStep.id === 'application_review' && <ApplicationReviewBody applicant={applicant} />}
                {activeStep.id === 'substance_testing'  && <SubstanceTestingBody applicant={applicant} />}
                {activeStep.id === 'decision'           && <DecisionBody applicant={applicant} />}
                {(activeStep.id === 'psp' || activeStep.id === 'mvr' || activeStep.id === 'criminal_background' || activeStep.id === 'dot_employment_verification')
                    && <ScreeningOrderBody applicant={applicant} stepId={activeStep.id} />}
                <StepRequirementsPanel stepId={activeStep.id} applicant={applicant} />
            </div>
        </div>
    );
}

function RequiredActionsPanel({ applicant, activeStep, onSetStepStatus }: { applicant: Applicant; activeStep: WorkflowStep; onSetStepStatus: (s: StepStatus) => void }) {
    const statusMeta = STEP_STATUS_META[activeStep.status];
    const statusTone = TONE_CLS[statusMeta.tone];
    const STATUS_OPTIONS = Object.keys(STEP_STATUS_META) as StepStatus[];
    return (
        <aside className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-fit sticky top-4">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/60">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current step</div>
                <h3 className="text-sm font-bold text-slate-900 mt-1">{activeStep.label}</h3>
                <div className="mt-1.5 flex items-center gap-2">
                    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', statusTone.chip)}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', statusTone.dot)} />
                        {statusMeta.label}
                    </span>
                </div>
                {/* Change-status editor for this step */}
                <div className="mt-2.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Change status</label>
                    <select value={activeStep.status} onChange={e => onSetStepStatus(e.target.value as StepStatus)}
                        className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[12px] font-semibold text-slate-700 focus:border-blue-400 focus:outline-none">
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STEP_STATUS_META[s].label}</option>)}
                    </select>
                </div>
            </div>
            <div className="p-4 space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Required actions</div>
                {activeStep.id === 'application_review' && (
                    <ul className="text-[12px] text-slate-700 space-y-1.5 list-disc pl-4">
                        <li>Verify all required personal-info fields are populated and non-placeholder.</li>
                        <li>Confirm SSN/SIN is captured and stored encrypted.</li>
                        <li>Review every Company Question — escalate compliance blockers.</li>
                        <li>Capture structured driving-experience records (no placeholder text).</li>
                    </ul>
                )}
                {activeStep.id === 'substance_testing' && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
                        <div className="font-bold mb-1 flex items-center gap-1"><AlertCircle size={12} /> Scheduling process</div>
                        Scroll down to the TYPE OF TEST section to confirm the selection between DOT and NON-DOT before clicking Next.
                    </div>
                )}
                {activeStep.id === 'decision' && (
                    <ul className="text-[12px] text-slate-700 space-y-1.5 list-disc pl-4">
                        <li>Confirm every screening step has been completed, skipped with reason, or marked not required.</li>
                        <li>Resolve every Critical alert (or apply an authorized override).</li>
                        <li>Pick Hired or Not Hired and save — this creates a Decision event in the audit log.</li>
                    </ul>
                )}
                {(activeStep.id === 'psp' || activeStep.id === 'mvr' || activeStep.id === 'criminal_background' || activeStep.id === 'dot_employment_verification') && (
                    <ul className="text-[12px] text-slate-700 space-y-1.5 list-disc pl-4">
                        <li>Select a vendor and place the order.</li>
                        <li>Track order status against the SLA — escalate if no result returns.</li>
                        <li>Attach the result PDF to this step when complete.</li>
                    </ul>
                )}
                <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                    <div className="font-bold uppercase tracking-wider text-slate-400 text-[10px] mb-1">Applicant summary</div>
                    <div>{applicant.firstName} {applicant.lastName}</div>
                    <div className="font-mono text-slate-400">{applicant.email}</div>
                    <div className="font-mono text-slate-400">{applicant.phone}</div>
                </div>
            </div>
        </aside>
    );
}

// ── Step-requirements panel (template-driven consents + docs) ────────────
// Pulls the active step's template config from DEFAULT_TEMPLATE (admin-edited
// in /settings/ats-templates) and renders:
//   1. Consents to sign — each card opens a modal that displays the full
//      regulatory text and lets the recruiter mark it signed.
//   2. Document slots — required / optional / conditional badges per slot,
//      with upload + view buttons. Source chip indicates whether the
//      applicant, recruiter, or vendor produces the doc.

function findTemplateStep(templateId: string, stepId: PipelineStepId): TemplateStep | undefined {
    const tpl = TEMPLATE_BY_ID[templateId] ?? DEFAULT_TEMPLATE;
    return tpl.steps.find(s => s.stepId === stepId);
}

function modeBadgeCls(mode: RequirementMode): string {
    return mode === 'required'    ? 'bg-rose-50 text-rose-700 border-rose-200'
         : mode === 'conditional' ? 'bg-amber-50 text-amber-700 border-amber-200'
         :                          'bg-slate-100 text-slate-600 border-slate-200';
}

function StepRequirementsPanel({
    stepId, applicant,
}: {
    stepId: PipelineStepId;
    applicant: Applicant;
}) {
    const tpl = findTemplateStep(applicant.assignedTemplateId, stepId);
    const [bookings, setBookings] = useState<Record<string, { date: string; venue: string; status: 'booked' | 'completed' }>>({});

    if (!tpl || tpl.bookings.length === 0) return null;

    return (
        <PanelCard title="Bookings & appointments" subtitle="Book the substance test, DOT physical, road test, orientation, or fingerprinting.">
            <ul className="divide-y divide-slate-100">
                {tpl.bookings.map((b: BookingSlot) => {
                    const meta = BOOKING_TYPE_META[b.type];
                    const booked = bookings[b.id];
                    return (
                        <li key={b.id} className="px-5 py-3 flex items-start gap-3">
                            <span className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                                booked?.status === 'completed' ? 'bg-emerald-50 text-emerald-600'
                              : booked                          ? 'bg-amber-50 text-amber-600'
                              :                                   'bg-blue-50 text-blue-600')}>
                                <CalendarClock size={16} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[13px] font-bold text-slate-900 truncate">{b.label}</span>
                                    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border', modeBadgeCls(b.mode))}>{b.mode}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">{meta.label}</span>
                                    {booked?.status === 'completed' && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                                            <BadgeCheck size={10} /> Completed
                                        </span>
                                    )}
                                    {booked && booked.status !== 'completed' && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                            <Clock size={10} /> {booked.date}
                                        </span>
                                    )}
                                </div>
                                {b.helper && <p className="text-[11px] text-slate-500 mt-0.5">{b.helper}</p>}
                                {b.venue && <p className="text-[10px] text-slate-500 mt-0.5">Venue: {b.venue}</p>}
                                {booked && (
                                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Booked for {booked.date} · {booked.venue}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {!booked && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
                                            setBookings(bks => ({ ...bks, [b.id]: { date, venue: b.venue ?? '—', status: 'booked' } }));
                                        }}
                                        className="h-7 px-3 rounded-md bg-blue-600 text-white text-[11px] font-semibold inline-flex items-center gap-1 hover:bg-blue-700"
                                    >
                                        <CalendarClock size={11} /> Book
                                    </button>
                                )}
                                {booked && booked.status !== 'completed' && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setBookings(bks => ({ ...bks, [b.id]: { ...bks[b.id], status: 'completed' } }))}
                                            className="h-7 px-3 rounded-md bg-emerald-600 text-white text-[11px] font-semibold inline-flex items-center gap-1 hover:bg-emerald-700"
                                        >
                                            <Check size={11} /> Mark done
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setBookings(bks => { const { [b.id]: _, ...rest } = bks; return rest; })}
                                            className="h-7 px-2.5 rounded-md border border-slate-200 bg-white text-slate-700 text-[11px] font-semibold hover:bg-slate-50"
                                        >
                                            Cancel
                                        </button>
                                    </>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </PanelCard>
    );
}

function ConsentReader({
    consent, signMode, initialSignature, onSign, onClose,
}: {
    consent: ConsentForm;
    signMode: boolean;
    initialSignature?: string;
    onSign?: (dataUrl: string | null) => void;
    onClose: () => void;
}) {
    const [sig, setSig] = useState<string | null>(initialSignature ?? null);
    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            <ShieldCheck size={11} className="text-emerald-500" /> {signMode ? 'Sign consent' : 'Consent preview'}
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">{consent.title}</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">{consent.subtitle} · {consent.citation}</p>
                    </div>
                    <button type="button" onClick={onClose} className="h-8 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50">
                        Close
                    </button>
                </div>
                <div className="px-5 py-4 overflow-y-auto space-y-3 text-[13px] text-slate-700 leading-relaxed">
                    {consent.body.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
                </div>
                {signMode && (
                    <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/60 space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Applicant signature</div>
                        <SignaturePad value={sig} onChange={setSig} helper="Sign with mouse or touch. The captured image is stored against this consent and the audit log records the action." />
                    </div>
                )}
                <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-500 inline-flex items-center gap-1.5">
                        <AlertCircle size={12} className="text-amber-500" />
                        {consent.requiresSignature ? 'Applicant must sign — a signed PDF is generated and attached to the file.' : 'Acknowledgment only.'}
                    </span>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onClose} className="h-8 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50">
                            Cancel
                        </button>
                        {signMode && (
                            <button
                                type="button"
                                disabled={!sig}
                                onClick={() => { onSign?.(sig); }}
                                className="h-8 px-4 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                            >
                                <Check size={12} /> Save signature
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Application Review body ───────────────────────────────────────────────

function ApplicationReviewBody({ applicant }: { applicant: Applicant }) {
    const cq = applicant.companyQuestions;
    const placeholderCheck = (v: string) => /^(qa|test|none|n\/?a|placeholder)$/i.test(v.trim());

    return (
        <>

            <PanelCard title="Required fields" subtitle="Red-asterisked fields block progression to the next step.">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-5 py-4">
                    <FormField label="First Name" required value={applicant.firstName} />
                    <FormField label="Middle Name"          value={applicant.middleName ?? ''} />
                    <FormField label="Last Name" required   value={applicant.lastName} />
                    <FormField label="Date of Birth" required value={applicant.dateOfBirth} mono />
                    <FormField label="SSN / SIN" required   value={applicant.ssnMasked} mono />
                    <FormField label="Email" required       value={applicant.email} mono />
                    <FormField label="Street Address" required value={applicant.streetAddress} flag={placeholderCheck(applicant.streetAddress) ? 'Placeholder' : undefined} />
                    <FormField label="Phone"                value={applicant.phone ?? ''} mono />
                    <FormField label="City" required        value={applicant.city} flag={placeholderCheck(applicant.city) ? 'Placeholder' : undefined} />
                    <FormField label="State / Province" required value={applicant.state} />
                    <FormField label="Zip / Postal" required value={applicant.postalCode} mono />
                    <FormField label="Country"              value={applicant.country} />
                </div>
            </PanelCard>

            <PanelCard title="Personal information" subtitle="Read-only view of submitted application data.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 text-[12px]">
                    <KV label="Name"                              value={`${applicant.firstName} ${applicant.lastName}`} />
                    <KV label="Address"                           value={applicant.streetAddress} flag={placeholderCheck(applicant.streetAddress) ? 'Placeholder' : undefined} />
                    <KV label="City, State Zip"                   value={`${applicant.city}, ${applicant.state} ${applicant.postalCode}`} />
                    <KV label="Addresses (last 3 years)"          value={applicant.addressesLast3Years ?? '—'} />
                    <KV label="Country"                           value={applicant.country} />
                    <KV label="SSN / SIN"                         value={applicant.ssnMasked} mono />
                    <KV label="Position applied"                  value={applicant.positionApplied} />
                    <KV label="Date of Birth"                     value={applicant.dateOfBirth} mono />
                    <KV label="Email"                             value={applicant.email} mono />
                    <KV label="Primary Phone"                     value={applicant.phone ?? '—'} mono />
                    <KV label="Cell Phone"                        value={applicant.cellPhone ?? '—'} mono />
                    <KV label="Preferred method of contact"       value={applicant.preferredContactMethod ?? '—'} />
                    <KV label="Best time to contact"              value={applicant.bestTimeToContact ?? '—'} />
                </div>
            </PanelCard>

            <PanelCard title="Company questions" subtitle="GENERAL INFORMATION">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 text-[12px]">
                    <KV label="Legally eligible for US employment?" value={cq.legallyEligibleUS ? 'Yes' : 'No'} flag={!cq.legallyEligibleUS ? 'Critical' : undefined} />
                    <KV label="Currently employed?"                 value={cq.currentlyEmployed ? 'Yes' : 'No'} />
                    {!cq.currentlyEmployed && <KV label="Last employment end" value={cq.lastEmploymentEnd ?? '—'} mono />}
                    <KV label="Read / write / speak English?"       value={cq.speaksEnglish ? 'Yes' : 'No'} flag={!cq.speaksEnglish ? 'Warning' : undefined} />
                    <KV label="Worked here before?"                 value={cq.workedHereBefore ? 'Yes' : 'No'} />
                    <KV label="Current TWIC card?"                  value={cq.twicCard ? 'Yes' : 'No'} />
                    <KV label="Relatives employed here"             value={cq.relativesEmployed ?? '—'} />
                    <KV label="Known by other name?"                value={cq.otherName ? cq.otherName : 'No'} />
                    <KV label="How did you hear about us?"          value={cq.referralSource ?? '—'} />
                    <KV label="Emergency contact name"              value={cq.emergencyContactName ?? '—'} />
                    <KV label="Emergency address"                   value={cq.emergencyAddress ?? '—'} />
                    <KV label="Emergency phone"                     value={cq.emergencyPhone ?? '—'} mono />
                </div>
            </PanelCard>

            <PanelCard title="Driving experience" subtitle="For each equipment class, enter equipment type, dates, and approximate total miles.">
                {applicant.drivingExperience.length === 0 ? (
                    <div className="px-5 py-6 text-center text-[12px] text-slate-500">No structured driving experience captured yet.</div>
                ) : (
                    <div className="px-5 py-4">
                        <table className="w-full text-[12px]">
                            <thead className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                                <tr>
                                    <th className="text-left py-2">Equipment class</th>
                                    <th className="text-left py-2">Type</th>
                                    <th className="text-left py-2">Start</th>
                                    <th className="text-left py-2">End</th>
                                    <th className="text-right py-2">Miles</th>
                                    <th className="text-right py-2">Verified</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {applicant.drivingExperience.map(r => (
                                    <tr key={r.id}>
                                        <td className="py-2 font-semibold text-slate-700">{r.equipmentClass}</td>
                                        <td className="py-2">
                                            {placeholderCheck(r.equipmentType)
                                                ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">Placeholder · {r.equipmentType}</span>
                                                : r.equipmentType}
                                        </td>
                                        <td className="py-2 font-mono text-slate-500">{r.startDate ?? '—'}</td>
                                        <td className="py-2 font-mono text-slate-500">{r.endDate ?? '—'}</td>
                                        <td className="py-2 text-right tabular-nums">{r.totalMiles?.toLocaleString() ?? '—'}</td>
                                        <td className="py-2 text-right">
                                            {r.verified
                                                ? <span className="text-[10px] font-bold text-emerald-700 inline-flex items-center gap-1"><BadgeCheck size={12} /> Verified</span>
                                                : <span className="text-[10px] font-bold text-slate-400">No</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </PanelCard>

            {applicant.applicantType === 'Owner-Operator' && (
                <PanelCard title="Equipment — Owner/Operator only" subtitle="Tractor-specific details for owner-operators.">
                    <div className="px-5 py-4 text-[12px] text-slate-500">Owner-operator equipment intake form — not implemented in this demo.</div>
                </PanelCard>
            )}
        </>
    );
}

// ── Substance Testing body ───────────────────────────────────────────────

function SubstanceTestingBody({ applicant }: { applicant: Applicant }) {
    const t = applicant.substanceTest;
    const [subTab, setSubTab] = useState<'details' | 'schedule' | 'order'>('details');
    return (
        <>

            <PanelCard title="Substance Test" subtitle={`Order status: ${t.orderStatus}`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 px-5 py-4 text-[12px]">
                    <KV label="Name"       value={t.donorName} />
                    <KV label="License #"  value={t.licenseNumber ?? '—'} mono />
                    <KV label="Phone #"    value={t.phone ?? '—'} mono />
                    <KV label="Employer"   value={t.employer} />
                    <KV label="Test type"  value={t.testType ?? '—'} flag={t.testType ? undefined : 'Critical'} />
                    <KV label="Clinic"     value={t.clinicName ?? '—'} flag={t.clinicName ? undefined : 'Critical'} />
                </div>
            </PanelCard>

            <PanelCard
                title="Order — Donor info"
                subtitle="Embedded vendor view (Concentra · Craig Safety Technologies)."
                right={
                    <div className="flex items-center gap-1">
                        {(['details','schedule','order'] as const).map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setSubTab(t)}
                                className={cn(
                                    'h-7 px-2.5 rounded-md text-[11px] font-bold border transition-colors',
                                    subTab === t ? 'bg-blue-50 text-blue-700 border-blue-200' : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                                )}
                            >
                                {t === 'details' ? 'Details' : t === 'schedule' ? 'Schedule Test' : 'Order Details'}
                            </button>
                        ))}
                    </div>
                }
            >
                <div className="px-5 py-4 space-y-4">
                    <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3 text-[12px] text-slate-700">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Donor info</div>
                        <div className="font-semibold text-slate-900">{t.donorName}</div>
                        <div>Employer: {t.employer}</div>
                    </div>

                    {subTab === 'details' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Radio label="DOT" checked={t.testType === 'DOT'}     onChange={() => {/* demo */}} />
                            <Radio label="NON-DOT" checked={t.testType === 'NON_DOT'} onChange={() => {/* demo */}} />
                        </div>
                    )}
                    {subTab === 'schedule' && (
                        <div className="text-[12px] text-slate-500">Clinic-finder + schedule date picker would render here.</div>
                    )}
                    {subTab === 'order' && (
                        <div className="text-[12px] text-slate-500">Vendor order confirmation + tracking number would render here.</div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <button type="button" className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-slate-50 shadow-sm">
                            <Printer size={14} /> Print
                        </button>
                        <button type="button" className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-blue-700 shadow-sm">
                            NEXT: SELECT A CLINIC <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </PanelCard>
        </>
    );
}

// ── Decision body ────────────────────────────────────────────────────────

function DecisionBody({ applicant }: { applicant: Applicant }) {
    const blockers: string[] = [];
    if (!applicant.companyQuestions.legallyEligibleUS) blockers.push('Applicant is not legally eligible for US employment.');
    if (applicant.steps.some(s => s.status === 'failed')) blockers.push('At least one screening step has failed.');
    if (applicant.steps.some(s => s.id !== 'decision' && (s.status === 'not_started' || s.status === 'ordered' || s.status === 'in_progress' || s.status === 'needs_review')))
        blockers.push('One or more screening steps still pending.');

    return (
        <>

            <PanelCard title="Decision" subtitle="Status drives applicant-to-employee conversion. Hired is blocked when critical issues are unresolved.">
                <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Status <span className="text-rose-600">*</span></label>
                        <select
                            defaultValue={applicant.decisionStatus}
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
                        >
                            <option value="pending">— Choose —</option>
                            <option value="hired">Hired</option>
                            <option value="not_hired">Not Hired</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Reason</label>
                        <input
                            type="text"
                            defaultValue={applicant.decisionReason ?? ''}
                            placeholder="Required for Not Hired or override"
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
                        />
                    </div>
                </div>
                {blockers.length > 0 && (
                    <div className="mx-5 mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-900">
                        <div className="font-bold mb-1.5 flex items-center gap-1.5">
                            <ShieldAlert size={14} /> Decision blockers
                        </div>
                        <ul className="list-disc pl-5 space-y-1">
                            {blockers.map((b, i) => <li key={i}>{b}</li>)}
                        </ul>
                    </div>
                )}
                {blockers.length === 0 && (
                    <div className="mx-5 mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-[12px] text-emerald-900 inline-flex items-center gap-2">
                        <ShieldCheck size={14} />
                        All compliance checks cleared — Hired can be saved.
                    </div>
                )}
                <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <button type="button" className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-slate-50 shadow-sm">
                            <Printer size={14} /> Print Background Disclosure
                        </button>
                        <button type="button" className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-slate-50 shadow-sm">
                            <Printer size={14} /> Print
                        </button>
                    </div>
                    <button type="button" disabled={blockers.length > 0} className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-blue-700 shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed">
                        <Save size={14} /> Save decision
                    </button>
                </div>
            </PanelCard>
        </>
    );
}

// ── Generic screening-order body (PSP / MVR / Criminal BG / DOT Verif) ────

function ScreeningOrderBody({ applicant, stepId }: { applicant: Applicant; stepId: PipelineStepId }) {
    const screeningType: 'psp' | 'mvr' | 'criminal_background' | 'dot_employment_verification' = stepId as any;
    const order = applicant.screeningOrders.find(o => o.type === screeningType);

    return (
        <>

            <PanelCard title={`${PIPELINE_BLUEPRINT.find(b => b.id === stepId)?.label} order`} subtitle="Vendor order, status, and result attachments.">
            {order ? (
                <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-[12px]">
                    <KV label="Vendor"            value={order.vendor} />
                    <KV label="Status"            value={order.status} />
                    <KV label="Ordered at"        value={order.orderedAt ?? '—'} mono />
                    <KV label="Completed at"     value={order.completedAt ?? '—'} mono />
                    <KV label="Result summary"   value={order.resultSummary ?? '—'} flag={order.status === 'failed' ? 'Critical' : undefined} />
                </div>
            ) : (
                <div className="px-5 py-6 text-center text-[12px] text-slate-500">
                    No order placed yet for this step.
                </div>
            )}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button type="button" className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-slate-50 shadow-sm">
                    <Printer size={14} /> Print
                </button>
                <button type="button" className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-blue-700 shadow-sm">
                    <ClipboardList size={14} /> Place / re-order
                </button>
            </div>
        </PanelCard>
        </>
    );
}

// ── Compliance / Forms / Consent Forms tabs (filled application data) ────────

type AppFormField = ApplicationFormDef['fields'][number];

/** Small View / Download / Order / Upload / Sign action button. */
function ActBtn({ Icon, label, onClick, tone = 'ghost' }: {
    Icon: React.ElementType; label: string; onClick?: () => void; tone?: 'ghost' | 'primary';
}) {
    return (
        <button type="button" onClick={onClick}
            className={cn('inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold transition-colors',
                tone === 'primary'
                    ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700')}>
            <Icon size={12} /> {label}
        </button>
    );
}

function fmtFieldValue(f: AppFormField, value: unknown): string {
    if (value == null || value === '') return '—';
    if (f.type === 'signature') return 'Signed';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.length ? value.map(String).join(', ') : '—';
    if (typeof value === 'object') {
        const v = value as { files?: unknown[]; entries?: Array<{ number?: unknown }> };
        if (Array.isArray(v.files)) return `${v.files.length} file${v.files.length === 1 ? '' : 's'}`;
        if (Array.isArray(v.entries)) {
            const nums = v.entries.map(e => e?.number).filter(Boolean);
            return nums.length ? nums.map(String).join(', ') : `${v.entries.length} entr${v.entries.length === 1 ? 'y' : 'ies'}`;
        }
        return '—';
    }
    return String(value);
}

const FORM_STATUS_OPTIONS: AppStepStatus[] = ['not_started', 'in_progress', 'submitted', 'approved', 'returned'];
const FORM_STATUS_LABEL: Record<AppStepStatus, string> = {
    not_started: 'Not started', in_progress: 'In progress', submitted: 'Submitted', approved: 'Approved', returned: 'Returned',
};

export function FormsTab({ app, steps, formById, onOrder, onSetFormStatus }: {
    app?: HiringApplication; steps: DriverTemplateStep[]; formById: Map<string, ApplicationFormDef>;
    onOrder?: () => void; onSetFormStatus?: (stepId: string, status: AppStepStatus) => void;
}) {
    if (!app) return <EmptyTab Icon={ClipboardList} title="No linked application" subtitle="Invite the driver via Application Tracking to capture their application forms." />;
    if (steps.length === 0) return <EmptyTab Icon={ClipboardList} title="No application forms" subtitle="This template has no application forms." />;
    return (
        <div className="space-y-4">
            {steps.map(step => {
                const form = formById.get(step.formId);
                const st = app.steps[step.id];
                const status = st?.status ?? 'not_started';
                const values = (st?.values ?? {}) as Record<string, unknown>;
                const fields = (form?.fields ?? []).filter(f => String(f.type) !== 'heading');
                const filled = fields.some(f => { const v = values[f.id]; return v != null && v !== ''; });
                return (
                    <PanelCard key={step.id}
                        title={form?.displayTitle || form?.name || step.label || 'Form'}
                        subtitle={filled ? `Submitted${st?.submittedAt ? ' · ' + new Date(st.submittedAt).toLocaleDateString() : ''}` : 'Not submitted yet'}
                        right={(
                            <div className="flex flex-wrap items-center gap-1.5">
                                <select value={status} onChange={e => onSetFormStatus?.(step.id, e.target.value as AppStepStatus)}
                                    title="Change form status"
                                    className="h-7 rounded-md border border-slate-300 bg-white px-1.5 text-[11px] font-semibold text-slate-700 focus:border-blue-400 focus:outline-none">
                                    {FORM_STATUS_OPTIONS.map(s => <option key={s} value={s}>{FORM_STATUS_LABEL[s]}</option>)}
                                </select>
                                <ActBtn Icon={Eye} label="View" />
                                <ActBtn Icon={Download} label="Download" />
                                <ActBtn Icon={MessageSquarePlus} label="Order" onClick={onOrder} />
                            </div>
                        )}>
                        {filled ? (
                            <div className="grid grid-cols-1 gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-2">
                                {fields.map(f => (
                                    <div key={f.id} className="min-w-0">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{f.label}</div>
                                        <div className="truncate text-[13px] text-slate-800">{fmtFieldValue(f, values[f.id])}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="px-5 py-4 text-[12px] text-slate-400">The driver hasn't submitted this form yet.</p>
                        )}
                    </PanelCard>
                );
            })}
        </div>
    );
}

export function ConsentFormsTab({ app, steps, onOrder }: { app?: HiringApplication; steps: DriverTemplateStep[]; onOrder?: () => void }) {
    const [reader, setReader] = useState<{ form: ConsentForm; signMode: boolean } | null>(null);
    if (!app) return <EmptyTab Icon={BadgeCheck} title="No linked application" subtitle="Invite the driver to capture consent signatures." />;
    if (steps.length === 0) return <EmptyTab Icon={BadgeCheck} title="No consent forms" subtitle="This template has no consent forms." />;
    return (
        <>
        <PanelCard title="Consent forms" subtitle="Disclosures the applicant must e-sign — view, download, sign, or re-order.">
            <ul className="divide-y divide-slate-100">
                {steps.map(step => {
                    const consent = CONSENT_BY_ID[step.formId as keyof typeof CONSENT_BY_ID];
                    const st = app.steps[step.id];
                    const signed = !!st?.signature || st?.status === 'submitted' || st?.status === 'approved';
                    return (
                        <li key={step.id} className="flex items-start gap-3 px-5 py-3">
                            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', signed ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400')}>
                                {signed ? <BadgeCheck size={16} /> : <FileText size={16} />}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-[13px] font-bold text-slate-800">{consent?.title ?? step.label ?? 'Consent'}</p>
                                    <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold', signed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500')}>
                                        {signed ? 'Signed' : 'Pending'}
                                    </span>
                                </div>
                                {consent && <p className="text-[11px] text-slate-500">{consent.subtitle} · {consent.citation}</p>}
                                {st?.signature && <img src={st.signature} alt="signature" className="mt-1.5 h-10 rounded border border-slate-200 bg-white object-contain" />}
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    {consent && <ActBtn Icon={Eye} label="View" onClick={() => setReader({ form: consent, signMode: false })} />}
                                    {consent && <ActBtn Icon={FileDown} label="Download" />}
                                    {consent && <ActBtn Icon={Pencil} label={signed ? 'Re-sign' : 'Sign'} tone="primary" onClick={() => setReader({ form: consent, signMode: true })} />}
                                    <ActBtn Icon={MessageSquarePlus} label="Order" onClick={onOrder} />
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </PanelCard>
        {reader && <ConsentReader consent={reader.form} signMode={reader.signMode} onClose={() => setReader(null)} onSign={() => setReader(null)} />}
        </>
    );
}

// ── DQ File checklist tab (live: do we have each required record?) ───────────

function DqStatusIcon({ status }: { status: DqStatus }) {
    if (status === 'present') return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check size={13} strokeWidth={3} /></span>;
    if (status === 'missing') return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-600"><XIcon size={13} strokeWidth={3} /></span>;
    return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-400">–</span>;
}

function DqStatusBadge({ status }: { status: DqStatus }) {
    const [label, cls] = status === 'present' ? ['Present', 'border-emerald-200 bg-emerald-50 text-emerald-700']
        : status === 'missing' ? ['Missing', 'border-rose-200 bg-rose-50 text-rose-700']
            : ['N/A', 'border-slate-200 bg-slate-50 text-slate-400'];
    return <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold', cls)}>{label}</span>;
}

export function DqFileTab({ sections, rollup, onOrder, profiles, appliedProfile, auto, driverType, onSetProfile }: {
    sections: { title: string; items: { item: DqChecklistItem; status: DqStatus }[] }[];
    rollup: { present: number; missing: number; required: number };
    onOrder?: () => void;
    profiles: DqProfile[];
    appliedProfile?: DqProfile;
    auto: boolean;
    driverType: string;
    onSetProfile: (profileId: string | null) => void;
}) {
    const pct = rollup.required ? Math.round((rollup.present / rollup.required) * 100) : 0;
    const complete = rollup.missing === 0;
    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Driver Qualification (DQ) File</h3>
                        <p className="text-[11px] text-slate-500">Live check of every required DQ record against the driver's application data and uploaded documents.</p>
                    </div>
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold', complete ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700')}>
                        {complete ? <><Check size={13} /> DQ file complete</> : <><AlertCircle size={13} /> {rollup.missing} missing</>}
                    </span>
                </div>
                {/* Applied checklist profile + override */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                    <div className="flex items-center gap-2 text-[12px]">
                        <span className="font-bold text-slate-600">Checklist</span>
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">{appliedProfile?.name ?? 'None'}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {auto ? `Auto · ${DQ_DRIVER_TYPES.find(t => t.id === driverType)?.label ?? driverType}` : 'Manual'}
                        </span>
                    </div>
                    <select value={auto ? '' : (appliedProfile?.id ?? '')} onChange={e => onSetProfile(e.target.value || null)}
                        className="h-8 rounded-md border border-slate-300 bg-white px-2 text-[12px] font-semibold text-slate-700 focus:border-blue-400 focus:outline-none">
                        <option value="">Auto (by driver type)</option>
                        {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>{rollup.present} of {rollup.required} required present</span>
                        <span className="tabular-nums">{pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className={cn('h-full rounded-full transition-all', complete ? 'bg-emerald-500' : 'bg-blue-500')} style={{ width: `${pct}%` }} />
                    </div>
                </div>
            </div>

            {sections.map(sec => {
                const present = sec.items.filter(i => i.status === 'present').length;
                const required = sec.items.filter(i => i.status !== 'na').length;
                const secMissing = required - present;
                return (
                    <PanelCard key={sec.title} title={sec.title} subtitle={`${present}/${required} present`}
                        right={secMissing > 0
                            ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">{secMissing} missing</span>
                            : <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Complete</span>}>
                        <ul className="divide-y divide-slate-100">
                            {sec.items.map((row, i) => (
                                <li key={i} className="flex items-center gap-3 px-5 py-2.5">
                                    <DqStatusIcon status={row.status} />
                                    <span className={cn('min-w-0 flex-1 truncate text-[13px]', row.status === 'missing' ? 'font-semibold text-slate-800' : 'text-slate-600')}>
                                        {row.item.label}
                                        {row.item.conditional && <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">if applicable</span>}
                                    </span>
                                    <DqStatusBadge status={row.status} />
                                    {row.status === 'missing' && (
                                        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                                            <ActBtn Icon={Upload} label="Upload" />
                                            <ActBtn Icon={MessageSquarePlus} label="Order" onClick={onOrder} />
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </PanelCard>
                );
            })}
        </div>
    );
}

// ── Documents / Notes / Alerts / Event Log tabs ──────────────────────────

function NotesTab({ applicant }: { applicant: Applicant }) {
    if (applicant.notes.length === 0) {
        return <EmptyTab Icon={StickyNote} title="No notes yet" subtitle="Internal recruiter / compliance notes appear here." />;
    }
    return (
        <PanelCard title="Notes">
            <ul className="divide-y divide-slate-100">
                {applicant.notes.map(n => (
                    <li key={n.id} className="px-5 py-3">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-[11px] font-bold text-slate-700">{n.author}</span>
                            <span className="text-[10px] font-mono text-slate-400">{n.createdAt}</span>
                        </div>
                        <p className="text-[12px] text-slate-600 mt-1">{n.body}</p>
                        <span className="mt-1 inline-flex text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{n.visibility}</span>
                    </li>
                ))}
            </ul>
        </PanelCard>
    );
}

function AlertsTab({ applicant }: { applicant: Applicant }) {
    if (applicant.alerts.length === 0) {
        return <EmptyTab Icon={Bell} title="No alerts" subtitle="Compliance / data / screening issues will surface here." />;
    }
    return (
        <PanelCard title="Alerts">
            <ul className="divide-y divide-slate-100">
                {applicant.alerts.map(a => {
                    const tone = a.severity === 'critical' ? TONE_CLS.rose : a.severity === 'warning' ? TONE_CLS.amber : TONE_CLS.blue;
                    return (
                        <li key={a.id} className="px-5 py-3 flex items-start gap-3">
                            <span className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', tone.chip)}>
                                <AlertOctagon size={14} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[12px] font-bold text-slate-900">{a.title}</span>
                                    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider', tone.chip)}>{a.severity}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{a.category}</span>
                                    {a.resolvedAt && <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">Resolved</span>}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">{a.detail}</p>
                                <p className="text-[10px] font-mono text-slate-400 mt-0.5">Created {a.createdAt}{a.resolvedAt ? ` · resolved ${a.resolvedAt}` : ''}</p>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </PanelCard>
    );
}

function EventLogTab({ applicant }: { applicant: Applicant }) {
    const sorted = [...applicant.eventLog].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return (
        <PanelCard title="Event log" subtitle="Immutable audit history for this application.">
            <ul className="divide-y divide-slate-100">
                {sorted.map(e => (
                    <li key={e.id} className="px-5 py-3 flex items-start gap-3">
                        <span className="h-8 w-8 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
                            <History size={14} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[12px] font-bold text-slate-900">{e.title}</span>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{e.type.replace(/_/g, ' ')}</span>
                            </div>
                            {e.detail && <p className="text-[11px] text-slate-500 mt-0.5">{e.detail}</p>}
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">{e.user} · {new Date(e.timestamp).toLocaleString()}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </PanelCard>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Shared low-level components
// ─────────────────────────────────────────────────────────────────────────

function KpiTile({
    label, value, accent, tone, Icon, active, onClick, hover,
}: {
    label: string;
    value: React.ReactNode;
    accent: string;
    tone?: string;
    Icon?: React.ElementType;
    active?: boolean;
    onClick?: () => void;
    hover?: string;
}) {
    const interactive = !!onClick;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!interactive}
            className={cn(
                'group relative bg-white border border-slate-200 rounded-lg overflow-hidden text-left transition-all',
                interactive && 'hover:shadow-sm hover:border-slate-300 cursor-pointer',
                active && 'ring-2 ring-blue-300 border-blue-300',
                !interactive && 'cursor-default',
            )}
            title={hover}
        >
            <div className={cn('h-0.5 w-full', accent)} />
            <div className="px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                    <span className={cn('text-xl font-black leading-none tabular-nums', tone ?? 'text-slate-900')}>
                        {value}
                    </span>
                    {Icon && <Icon size={14} className="text-slate-400" />}
                </div>
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1 leading-tight">{label}</div>
            </div>
        </button>
    );
}

function FilterSelect({
    icon: Icon, label, value, onChange, options,
}: {
    icon?: React.ElementType;
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <div className="relative">
            {Icon && <Icon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />}
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                aria-label={label}
                className={cn(
                    'h-9 pr-8 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300',
                    Icon ? 'pl-7' : 'pl-3',
                )}
            >
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );
}

function PanelCard({
    title, subtitle, right, children,
}: {
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/60">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                    {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
                {right}
            </div>
            {children}
        </div>
    );
}

function FormField({ label, value, required, mono, flag }: { label: string; value: string; required?: boolean; mono?: boolean; flag?: string }) {
    return (
        <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                {label} {required && <span className="text-rose-600">*</span>}
            </label>
            <input
                type="text"
                defaultValue={value}
                className={cn(
                    'w-full h-9 px-3 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300',
                    flag ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200',
                    mono && 'font-mono',
                )}
            />
            {flag && (
                <div className="mt-1 text-[10px] font-bold text-amber-700 inline-flex items-center gap-1">
                    <AlertCircle size={10} /> {flag}
                </div>
            )}
        </div>
    );
}

function KV({ label, value, mono, flag }: { label: string; value: string; mono?: boolean; flag?: string }) {
    const tone = flag === 'Critical' ? 'text-rose-700' : flag === 'Warning' ? 'text-amber-700' : flag === 'Placeholder' ? 'text-amber-700' : 'text-slate-700';
    return (
        <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-1">
            <span className="text-[11px] text-slate-500">{label}</span>
            <span className={cn('font-semibold text-right break-all', mono && 'font-mono', tone)}>
                {value}
                {flag && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider">{flag}</span>}
            </span>
        </div>
    );
}

function Radio({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
    return (
        <label className={cn(
            'flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors',
            checked ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-slate-200 hover:bg-slate-50 text-slate-700',
        )}>
            <input type="radio" checked={checked} onChange={onChange} className="accent-blue-600" />
            <span className="text-[12px] font-semibold">{label}</span>
        </label>
    );
}

function ApplicantAvatar({ name, url, onChange }: { name: string; url?: string; onChange?: (next: string | undefined) => void }) {
    const ref = useRef<HTMLInputElement | null>(null);
    const initials = name.split(/\s+/).filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase();
    const onPick = () => ref.current?.click();
    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => onChange?.(reader.result as string);
        reader.readAsDataURL(f);
    };
    return (
        <>
            <button
                type="button"
                onClick={onPick}
                title="Click to upload applicant photo"
                className="group relative h-14 w-14 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-sm shrink-0 overflow-hidden hover:ring-2 hover:ring-blue-300 transition"
            >
                {url
                    ? <img src={url} alt={name} className="h-full w-full object-cover" />
                    : <span className="text-base font-semibold">{initials || '?'}</span>}
                {/* Hover overlay — camera icon, no permanent "EDIT" badge */}
                <span className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="h-4 w-4 text-white" />
                </span>
            </button>
            <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onFile} />
        </>
    );
}

function EmptyTab({ Icon, title, subtitle }: { Icon: React.ElementType; title: string; subtitle?: string }) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Icon className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-700">{title}</div>
            {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
        </div>
    );
}

// ── Pipeline progress (clickable when activeId is provided) ──────────────

export function PipelineProgress({
    steps, activeId, onSelect, hideLabels,
}: {
    steps: WorkflowStep[];
    activeId?: PipelineStepId;
    onSelect?: (id: PipelineStepId) => void;
    /** Hide the per-step labels (used in the list, where labels show once as a header). */
    hideLabels?: boolean;
}) {
    const dotForStatus = (s: StepStatus, isActive: boolean) => {
        const ring = isActive ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-white' : '';
        if (s === 'completed' || s === 'skipped') return `${ring} bg-emerald-500 border-emerald-500 text-white`;
        if (s === 'in_progress')                  return `${ring} bg-blue-500 border-blue-500 text-white animate-pulse`;
        if (s === 'ordered')                      return `${ring} bg-amber-500 border-amber-500 text-white`;
        if (s === 'failed')                       return `${ring} bg-rose-500 border-rose-500 text-white`;
        if (s === 'needs_review')                 return `${ring} bg-amber-500 border-amber-500 text-white`;
        return                                          `${ring} bg-white border-slate-300 text-slate-300`;
    };
    const connectorTone = (left: StepStatus, right: StepStatus) => {
        if ((left === 'completed' || left === 'skipped') && (right === 'completed' || right === 'skipped' || right === 'in_progress' || right === 'ordered' || right === 'needs_review')) return 'bg-emerald-400';
        if (left === 'failed' || right === 'failed') return 'bg-rose-300';
        if (left === 'completed' || left === 'skipped') return 'bg-emerald-300';
        return 'bg-slate-300';
    };
    const iconFor = (s: StepStatus) => {
        if (s === 'completed') return <Check size={14} strokeWidth={3} />;
        if (s === 'skipped')   return <SkipForward size={12} strokeWidth={3} />;
        if (s === 'failed')    return <XIcon size={14} strokeWidth={3} />;
        if (s === 'ordered')   return <Clock size={12} strokeWidth={3} />;
        if (s === 'in_progress') return <span className="block h-2 w-2 rounded-full bg-white" />;
        if (s === 'needs_review') return <AlertCircle size={12} strokeWidth={3} />;
        return null;
    };

    return (
        <div className="w-full min-w-[640px]">
            <div className="flex items-start">
                {steps.map((step, i) => {
                    const isLast = i === steps.length - 1;
                    const isActive = activeId === step.id;
                    const interactive = !!onSelect;
                    return (
                        <div key={step.id} className="flex-1 flex flex-col items-center relative">
                            <div className="flex items-center w-full">
                                {i > 0 && (
                                    <div className={cn('flex-1 h-0.5 mr-1', connectorTone(steps[i - 1].status, step.status))} />
                                )}
                                <button
                                    type="button"
                                    onClick={() => onSelect?.(step.id)}
                                    disabled={!interactive}
                                    className={cn(
                                        'h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                                        dotForStatus(step.status, isActive),
                                        interactive && 'cursor-pointer hover:scale-110',
                                    )}
                                    title={`${step.label} · ${STEP_STATUS_META[step.status].label}`}
                                >
                                    {iconFor(step.status)}
                                </button>
                                {!isLast && (
                                    <div className={cn('flex-1 h-0.5 ml-1', connectorTone(step.status, steps[i + 1].status))} />
                                )}
                            </div>
                            {!hideLabels && (
                                <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center leading-snug px-1">
                                    {step.lines.map((ln, li) => <div key={li}>{ln}</div>)}
                                    {(step.status === 'skipped' || step.status === 'ordered' || step.status === 'failed') && (
                                        <div className={cn(
                                            'mt-1 text-[9px] font-bold',
                                            step.status === 'skipped' ? 'text-emerald-600' : step.status === 'ordered' ? 'text-amber-600' : 'text-rose-600',
                                        )}>
                                            {STEP_STATUS_META[step.status].label.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Silence unused warning while we keep the icon ready for future use.
