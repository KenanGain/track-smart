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
    ALL_TEMPLATES, TEMPLATE_BY_ID, DEFAULT_TEMPLATE, BOOKING_TYPE_META,
    type HiringTemplate, type TemplateStep, type TemplateDocument, type TemplateConsent,
    type BookingSlot, type RequirementMode,
} from "./hiring-templates.data";
import { SignaturePad, PhotoUpload } from "./SignaturePad";
import { useCompanyBranding } from "./company-branding.data";
import { downloadConsentPdf } from "./generateConsentPdf";
import { DriverApplicationWizard } from "./DriverApplicationWizard";
import { CustomFormWizard } from "./CustomFormWizard";
import { loadApplicationForms, type ApplicationFormDef } from "./application-forms.data";
import { FileDown } from "lucide-react";

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
                    {filtered.length === 0 ? (
                        <div className="px-6 py-16 text-center text-sm text-slate-500">No applicants match the current filters.</div>
                    ) : (
                        <ul className="divide-y divide-slate-200">
                            {filtered.map(a => {
                                const meta = STAGE_META[a.stage];
                                const tone = TONE_CLS[meta.tone];
                                return (
                                    <li key={a.id}>
                                        <button
                                            type="button"
                                            onClick={() => onOpen(a.id)}
                                            className="w-full text-left px-6 py-5 hover:bg-slate-50/60 transition-colors"
                                        >
                                            <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-6 items-center">
                                                <div className="min-w-0">
                                                    <span className="text-base font-semibold text-blue-600 group-hover:underline truncate block">
                                                        {a.firstName} {a.lastName}
                                                    </span>
                                                    <div className="text-[12px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-mono">{a.licenseType}</span>
                                                        <span className="text-slate-300">·</span>
                                                        <Calendar size={11} className="text-slate-400" />
                                                        <span className="font-mono">{a.appliedDate}</span>
                                                    </div>
                                                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                                                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', tone.chip)}>
                                                            <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
                                                            {meta.label}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-500 tabular-nums">{a.daysInPipeline}d in pipeline</span>
                                                        {a.alerts.filter(al => !al.resolvedAt).length > 0 && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
                                                                <AlertCircle size={10} /> {a.alerts.filter(al => !al.resolvedAt).length}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <PipelineProgress steps={a.steps} />
                                                </div>
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
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

type DetailTabId = 'details' | 'documents' | 'notes' | 'alerts' | 'event_log';

function ApplicantDetailView({ applicant, onBack }: { applicant: Applicant; onBack: () => void }) {
    const [activeTab, setActiveTab] = useState<DetailTabId>('details');
    const [activeStepId, setActiveStepId] = useState<PipelineStepId>(applicant.activeStepId);
    const activeStep = applicant.steps.find(s => s.id === activeStepId)!;
    const openAlerts = applicant.alerts.filter(a => !a.resolvedAt).length;
    const [templateId, setTemplateId] = useState<string>(applicant.assignedTemplateId);
    const [photo, setPhoto] = useState<string | undefined>(applicant.photoUrl);

    // Keep the applicant's assignedTemplateId in sync with the local picker so
    // every step body (which reads from it) re-renders with the new template.
    applicant.assignedTemplateId = templateId;

    const activeTpl: HiringTemplate = TEMPLATE_BY_ID[templateId] ?? DEFAULT_TEMPLATE;
    const enabledSteps = activeTpl.steps.filter(s => s.enabled).length;

    const tabs: { id: DetailTabId; label: string; Icon: React.ElementType; count?: number }[] = [
        { id: 'details',   label: 'Details',   Icon: User },
        { id: 'documents', label: 'Documents', Icon: FileText,   count: applicant.documents.length },
        { id: 'notes',     label: 'Notes',     Icon: StickyNote, count: applicant.notes.length },
        { id: 'alerts',    label: 'Alerts',    Icon: Bell,       count: openAlerts },
        { id: 'event_log', label: 'Event Log', Icon: History,    count: applicant.eventLog.length },
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

            {/* ── Template selector strip ───────────────────────────── */}
            <div className="bg-white border-b border-slate-200 px-8 py-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
                            Hiring template
                        </div>
                        <select
                            value={templateId}
                            onChange={(e) => setTemplateId(e.target.value)}
                            className="h-9 min-w-[280px] px-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
                        >
                            {ALL_TEMPLATES.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.name}{t.isDefault ? ' (default)' : ''} · {t.appliesToLicense === 'all' ? 'All licenses' : t.appliesToLicense}
                                </option>
                            ))}
                        </select>
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

            {/* ── Tab content ───────────────────────────────────────── */}
            <div className="px-8 py-6">
                {activeTab === 'details'   && <DetailsTab applicant={applicant} activeStep={activeStep} />}
                {activeTab === 'documents' && <DocumentsTab applicant={applicant} />}
                {activeTab === 'notes'     && <NotesTab applicant={applicant} />}
                {activeTab === 'alerts'    && <AlertsTab applicant={applicant} />}
                {activeTab === 'event_log' && <EventLogTab applicant={applicant} />}
            </div>
        </div>
    );
}

// ── Details tab ───────────────────────────────────────────────────────────

function DetailsTab({ applicant, activeStep }: { applicant: Applicant; activeStep: WorkflowStep }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-5">
            <RequiredActionsPanel applicant={applicant} activeStep={activeStep} />
            <div className="min-w-0 space-y-5">
                {activeStep.id === 'application_review' && <ApplicationReviewBody applicant={applicant} />}
                {activeStep.id === 'substance_testing'  && <SubstanceTestingBody applicant={applicant} />}
                {activeStep.id === 'decision'           && <DecisionBody applicant={applicant} />}
                {(activeStep.id === 'psp' || activeStep.id === 'mvr' || activeStep.id === 'criminal_background' || activeStep.id === 'dot_employment_verification')
                    && <ScreeningOrderBody applicant={applicant} stepId={activeStep.id} />}
            </div>
        </div>
    );
}

function RequiredActionsPanel({ applicant, activeStep }: { applicant: Applicant; activeStep: WorkflowStep }) {
    const statusMeta = STEP_STATUS_META[activeStep.status];
    const statusTone = TONE_CLS[statusMeta.tone];
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
    const [branding] = useCompanyBranding();
    const [previewConsent, setPreviewConsent] = useState<{ form: ConsentForm; signMode: boolean } | null>(null);
    const [signatures, setSignatures] = useState<Record<string, string>>({});
    const [photos, setPhotos] = useState<Record<string, string>>({});
    const [uploaded, setUploaded] = useState<Record<string, boolean>>(() => {
        const m: Record<string, boolean> = {};
        for (const d of applicant.documents) m[d.id] = true;
        return m;
    });
    const [bookings, setBookings] = useState<Record<string, { date: string; venue: string; status: 'booked' | 'completed' }>>({});

    const isSigned = (id: string) => !!signatures[id];

    if (!tpl || (tpl.consents.length === 0 && tpl.documents.length === 0 && tpl.bookings.length === 0)) return null;

    const photoDocs = tpl.documents.filter(d => d.isPhoto);
    const otherDocs = tpl.documents.filter(d => !d.isPhoto);

    return (
        <>
            {/* ── Consents ──────────────────────────────────────────── */}
            {tpl.consents.length > 0 && (
                <PanelCard title="Consents" subtitle="Configured in Settings › Hiring Templates. Click Sign to capture the applicant's signature.">
                    <ul className="divide-y divide-slate-100">
                        {tpl.consents.map((tc: TemplateConsent) => {
                            const form = CONSENT_BY_ID[tc.consentId];
                            const signed = isSigned(form.id);
                            return (
                                <li key={form.id} className="px-5 py-3 flex items-start gap-3">
                                    <span className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                                        signed ? 'bg-emerald-50 text-emerald-600' : 'bg-violet-50 text-violet-600')}>
                                        {signed ? <BadgeCheck size={16} /> : <FileText size={16} />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[13px] font-bold text-slate-900 truncate">{form.title}</span>
                                            <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border', modeBadgeCls(tc.mode))}>{tc.mode}</span>
                                            {signed && (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                                                    <BadgeCheck size={10} /> Signed
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">{form.subtitle} · {form.citation}</p>
                                        {tc.condition && <p className="text-[10px] text-amber-700 mt-0.5">When: {tc.condition}</p>}
                                        {signed && (
                                            <img src={signatures[form.id]} alt="signature" className="mt-1.5 h-10 border border-slate-200 rounded bg-white object-contain" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button type="button" onClick={() => setPreviewConsent({ form, signMode: false })}
                                            className="h-7 px-2.5 rounded-md border border-slate-200 bg-white text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1 hover:bg-slate-50">
                                            <Eye size={11} /> View
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => downloadConsentPdf({
                                                consent: form,
                                                branding,
                                                applicantName: `${applicant.firstName} ${applicant.lastName}`,
                                                mode: signed ? 'signed' : 'blank',
                                                signatureDataUrl: signatures[form.id] ?? null,
                                            }, applicant.id)}
                                            title={signed ? 'Download signed PDF' : 'Download blank PDF (for offline signing)'}
                                            className={cn(
                                                'h-7 px-2.5 rounded-md border text-[11px] font-semibold inline-flex items-center gap-1',
                                                signed
                                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                                            )}
                                        >
                                            <FileDown size={11} /> {signed ? 'Download signed' : 'Download blank'}
                                        </button>
                                        <button type="button" onClick={() => setPreviewConsent({ form, signMode: true })}
                                            className={cn('h-7 px-3 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 transition-colors',
                                                signed ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-blue-600 text-white hover:bg-blue-700')}>
                                            <Pencil size={11} /> {signed ? 'Re-sign' : 'Sign'}
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </PanelCard>
            )}

            {/* ── Identity / Photos ─────────────────────────────────── */}
            {photoDocs.length > 0 && (
                <PanelCard title="Identity & photos" subtitle="Headshot, CDL front/back, medical card, vehicle photos.">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-5 py-4">
                        {photoDocs.map(d => (
                            <div key={d.id} className="space-y-1.5">
                                <PhotoUpload
                                    label={d.label}
                                    value={photos[d.id] ?? null}
                                    onChange={(url) => setPhotos(p => ({ ...p, [d.id]: url ?? '' }))}
                                    aspect={d.category === 'Photo' ? 'square' : 'landscape'}
                                    helper={d.helper}
                                />
                                <div className="flex items-center gap-1.5 px-1">
                                    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border', modeBadgeCls(d.mode))}>{d.mode}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{d.source}</span>
                                </div>
                                {d.condition && <p className="text-[10px] text-amber-700 px-1">When: {d.condition}</p>}
                            </div>
                        ))}
                    </div>
                </PanelCard>
            )}

            {/* ── Documents ─────────────────────────────────────────── */}
            {otherDocs.length > 0 && (
                <PanelCard title="Documents" subtitle="PDFs and uploads pulled in from the hiring template.">
                    <ul className="divide-y divide-slate-100">
                        {otherDocs.map((d: TemplateDocument) => {
                            const isUp = !!uploaded[d.id];
                            return (
                                <li key={d.id} className="px-5 py-3 flex items-start gap-3">
                                    <span className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                                        isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600')}>
                                        {isUp ? <BadgeCheck size={16} /> : <FileText size={16} />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[13px] font-bold text-slate-900 truncate">{d.label}</span>
                                            <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border', modeBadgeCls(d.mode))}>{d.mode}</span>
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">{d.category}</span>
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{d.source}</span>
                                            {d.requiresSignature && <span className="text-[9px] font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded px-1.5 py-0.5 inline-flex items-center gap-1"><Pencil size={9} /> Signature</span>}
                                            {isUp && (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                                                    <BadgeCheck size={10} /> Uploaded
                                                </span>
                                            )}
                                        </div>
                                        {d.helper && <p className="text-[11px] text-slate-500 mt-0.5">{d.helper}</p>}
                                        {d.condition && <p className="text-[10px] text-amber-700 mt-0.5">When: {d.condition}</p>}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {isUp && (
                                            <button type="button" className="h-7 px-2.5 rounded-md border border-slate-200 bg-white text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1 hover:bg-slate-50">
                                                <Eye size={11} /> View
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setUploaded(u => ({ ...u, [d.id]: !u[d.id] }))}
                                            className={cn('h-7 px-3 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 transition-colors',
                                                isUp ? 'bg-slate-600 text-white hover:bg-slate-700' : 'bg-blue-600 text-white hover:bg-blue-700')}>
                                            <Upload size={11} /> {isUp ? 'Replace' : 'Upload'}
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </PanelCard>
            )}

            {/* ── Bookings ──────────────────────────────────────────── */}
            {tpl.bookings.length > 0 && (
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
            )}

            {previewConsent && (
                <ConsentReader
                    consent={previewConsent.form}
                    signMode={previewConsent.signMode}
                    initialSignature={signatures[previewConsent.form.id]}
                    onSign={(dataUrl) => {
                        setSignatures(s => dataUrl ? { ...s, [previewConsent.form.id]: dataUrl } : (() => { const { [previewConsent.form.id]: _, ...rest } = s; return rest; })());
                        setPreviewConsent(null);
                    }}
                    onClose={() => setPreviewConsent(null)}
                />
            )}
        </>
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
            <StepRequirementsPanel stepId="application_review" applicant={applicant} />

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
            <StepRequirementsPanel stepId="substance_testing" applicant={applicant} />

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
            <StepRequirementsPanel stepId="decision" applicant={applicant} />

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
            <StepRequirementsPanel stepId={stepId} applicant={applicant} />

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

// ── Documents / Notes / Alerts / Event Log tabs ──────────────────────────

function DocumentsTab({ applicant }: { applicant: Applicant }) {
    if (applicant.documents.length === 0) {
        return <EmptyTab Icon={FileText} title="No documents uploaded" subtitle="Application PDFs, screening reports, and disclosures will land here." />;
    }
    return (
        <PanelCard title="Documents" subtitle={`${applicant.documents.length} files attached.`}>
            <ul className="divide-y divide-slate-100">
                {applicant.documents.map(d => (
                    <li key={d.id} className="px-5 py-3 flex items-center gap-3">
                        <span className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><FileText size={16} /></span>
                        <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-bold text-slate-900 truncate">{d.label}</div>
                            <div className="text-[11px] text-slate-500">{d.category} · {d.sizeKb} KB · uploaded {d.uploadedAt} by {d.uploadedBy}</div>
                        </div>
                        <button type="button" className="h-8 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-50">
                            <Download size={12} /> Download
                        </button>
                    </li>
                ))}
            </ul>
        </PanelCard>
    );
}

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
    steps, activeId, onSelect,
}: {
    steps: WorkflowStep[];
    activeId?: PipelineStepId;
    onSelect?: (id: PipelineStepId) => void;
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
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Silence unused warning while we keep the icon ready for future use.
