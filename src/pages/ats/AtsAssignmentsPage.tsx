import { useMemo, useState, useEffect, useRef } from "react";
import {
    Briefcase, Search, Users, Inbox, Clock, UserCheck, UserX,
    Check, Calendar, Building2, X as XIcon, AlertCircle,
    ListChecks, UserPlus, FileText, Mail, Send, Copy, Link2,
    LayoutTemplate, MessageSquarePlus, MoreVertical, Ban, Trash2, MessageSquare, Phone,
    Hash, PenTool, Paperclip, ShieldCheck, ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    STAGE_META, TONE_CLS,
    type Applicant, type Stage, type LicenseType,
} from "./ats.data";
import { detectDqDriverType, DQ_DRIVER_TYPES } from "./dq-profiles.data";
import { ACCOUNTS_DB, type AccountRecord } from "@/pages/accounts/accounts.data";
import {
    loadTemplates, TEMPLATE_FORM_TYPES,
    type DriverHiringTemplate, type TemplateStep, type TemplateFormType,
} from "@/pages/settings/driver-hiring-templates.data";
import { loadApplicationForms, type ApplicationFormDef, type FormField } from "./application-forms.data";
import { CONSENT_BY_ID, type ConsentCategory } from "./consent-forms.data";
import {
    loadApplicants, getApplication, ensureApplication, upsertApplication,
    inviteDriver, addAsDriver, addRequest, cancelApplication, deleteApplication,
    createApplicant, sendReminder, elapsedLabel,
    APP_STATUS_META, type HiringApplication, type AppStepStatus, type StepState, type AppStatus,
    type ApplicationRequest,
} from "./hiring-application.data";

type RequestInput = Omit<ApplicationRequest, 'id' | 'sentAt' | 'status'>;

// A specific field the assigned template collects — used as an Ask/Order target.
interface TemplateItem { id: string; name: string; }

/** Does this text/number field look like a key number / identifier? */
function isKeyNumberField(f: FormField): boolean {
    if (f.type === 'number') return true;
    if (f.type !== 'text') return false;
    return /number|no\.?|#|\bid\b|licen|cdl|ssn|registr|\bcode\b|usdot|\bmc\b|\bein\b|duns|policy|account|permit/i.test(f.label);
}

/**
 * Pull the concrete items the assigned hiring template collects, so Ask/Order
 * can only request things that are actually part of the template:
 *  • documents  — `document` fields across the template's form steps
 *  • keyNumbers — number / identifier fields
 *  • signatures — consent steps + `signature` fields
 * Deduped by label.
 */
function templateAskItems(steps: TemplateStep[], formById: Map<string, ApplicationFormDef>): {
    documents: TemplateItem[]; keyNumbers: TemplateItem[]; signatures: TemplateItem[];
} {
    const documents: TemplateItem[] = [];
    const keyNumbers: TemplateItem[] = [];
    const signatures: TemplateItem[] = [];
    const seen = { d: new Set<string>(), k: new Set<string>(), s: new Set<string>() };
    const add = (list: TemplateItem[], set: Set<string>, id: string, name: string) => {
        const key = name.trim().toLowerCase();
        if (!name.trim() || set.has(key)) return;
        set.add(key); list.push({ id, name });
    };
    for (const step of steps) {
        if (step.kind === 'consent') {
            add(signatures, seen.s, step.id, CONSENT_BY_ID[step.formId as ConsentCategory]?.title ?? step.label ?? 'Consent');
            continue;
        }
        const form = formById.get(step.formId);
        for (const f of form?.fields ?? []) {
            if (f.type === 'document') add(documents, seen.d, f.id, f.label);
            else if (f.type === 'signature') add(signatures, seen.s, f.id, f.label);
            else if (isKeyNumberField(f)) add(keyNumbers, seen.k, f.id, f.label);
        }
    }
    return { documents, keyNumbers, signatures };
}

// Applicants in the mock data don't carry a carrierId. For this view we map
// each applicant to a carrier deterministically by index so the carrier column
// is stable across renders and filterable. Swap to a real applicant.accountId
// once the backend is wired.
function carrierForApplicant(index: number): AccountRecord {
    // Spread applicants across the first ~8 carriers so each carrier has several —
    // makes the carrier filter meaningful (change carrier → see that carrier's applicants).
    const span = Math.min(8, ACCOUNTS_DB.length);
    return ACCOUNTS_DB[index % span];
}

// Resolve a template step's display label by looking up the linked form or
// consent. Falls back to the per-step label override, then a generic title.
function labelForTemplateStep(
    step: TemplateStep,
    formById: Map<string, ApplicationFormDef>,
): string {
    if (step.label) return step.label;
    if (step.kind === 'consent') {
        const consent = CONSENT_BY_ID[step.formId as ConsentCategory];
        return consent?.title ?? 'Consent';
    }
    const form = formById.get(step.formId);
    return form?.displayTitle || form?.name || 'Form';
}

// Per-step status when walking a driver through a template. No backend yet,
// so we fake the position from `stage` + a deterministic hash of the
// applicant id (keeps the stepper visually varied but stable across renders).
type TStatus = 'completed' | 'in_progress' | 'not_started' | 'failed';

function hashId(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

function templateProgressFor(applicant: Applicant, totalSteps: number): TStatus[] {
    if (totalSteps === 0) return [];
    const h = hashId(applicant.id);
    let activeIndex: number;
    let activeStatus: TStatus = 'in_progress';

    switch (applicant.stage) {
        case 'applications_received':
            activeIndex = 0;
            break;
        case 'in_progress':
            activeIndex = 1 + (h % Math.max(totalSteps - 2, 1));
            break;
        case 'hired':
            return Array(totalSteps).fill('completed');
        case 'not_hired':
            activeIndex = 1 + (h % Math.max(totalSteps - 2, 1));
            activeStatus = 'failed';
            break;
    }

    return Array.from({ length: totalSteps }, (_, i) => {
        if (i < activeIndex) return 'completed';
        if (i === activeIndex) return activeStatus;
        return 'not_started';
    });
}

// Map a real application's per-step status onto the visual tracker statuses.
function realStatuses(app: HiringApplication, steps: TemplateStep[]): TStatus[] {
    return steps.map(s => {
        const st: AppStepStatus = app.steps[s.id]?.status ?? 'not_started';
        if (st === 'approved' || st === 'submitted') return 'completed';
        if (st === 'in_progress') return 'in_progress';
        if (st === 'returned') return 'failed';
        return 'not_started';
    });
}

// Seed a real HiringApplication for a legacy mock applicant so the list and the
// detail page stay consistent (and look alive). Step states are derived from the
// applicant's pipeline stage; completed steps get plausible mock values so the
// "view submission" panel reads like a filled form.
function buildSeededApplication(
    applicant: Applicant,
    tpl: DriverHiringTemplate,
    carrier: AccountRecord,
    formById: Map<string, ApplicationFormDef>,
): HiringApplication {
    const visual = applicant.stage === 'applications_received'
        ? Array<TStatus>(tpl.steps.length).fill('not_started')
        : templateProgressFor(applicant, tpl.steps.length);

    const steps: Record<string, StepState> = {};
    tpl.steps.forEach((s, i) => {
        const ts = visual[i] ?? 'not_started';
        const status: AppStepStatus =
            ts === 'completed' ? 'submitted'
                : ts === 'in_progress' ? 'in_progress'
                    : ts === 'failed' ? 'returned'
                        : 'not_started';
        const state: StepState = { status };
        if (status === 'submitted') {
            state.submittedAt = applicant.appliedDate;
            if (s.kind !== 'consent') {
                const form = formById.get(s.formId);
                const values: Record<string, unknown> = {};
                for (const f of form?.fields ?? []) values[f.id] = mockFieldValue(f, applicant);
                state.values = values;
            }
        }
        steps[s.id] = state;
    });

    const states = Object.values(steps).map(s => s.status);
    const allDone = states.length > 0 && states.every(s => s === 'submitted' || s === 'approved');
    const anyStarted = states.some(s => s !== 'not_started');
    const status: AppStatus =
        applicant.stage === 'hired' ? 'approved'
            : applicant.stage === 'not_hired' ? 'rejected'
                : allDone ? 'submitted'
                    : anyStarted ? 'in_progress'
                        : 'invited';

    return {
        applicantId: applicant.id,
        templateId: tpl.id,
        carrierId: carrier.id,
        status,
        invite: { email: applicant.email, sentAt: applicant.appliedDate, link: `https://apply.tracksmart.app/${applicant.id}` },
        steps,
        requests: [],
        events: [{ id: `ev-seed-${applicant.id}`, at: applicant.appliedDate, by: 'You', type: 'invited', detail: `Invite emailed to ${applicant.email}` }],
    };
}

interface Row {
    applicant: Applicant;
    carrier: AccountRecord;
    templateId: string;
}

export function AtsAssignmentsPage({ onNavigate }: { onNavigate?: (path: string) => void } = {}) {
    const templates = useMemo<DriverHiringTemplate[]>(() => loadTemplates(), []);
    const templateById = useMemo(() => {
        const map = new Map<string, DriverHiringTemplate>();
        for (const t of templates) map.set(t.id, t);
        return map;
    }, [templates]);

    const formById = useMemo(() => {
        const map = new Map<string, ApplicationFormDef>();
        for (const f of loadApplicationForms()) map.set(f.id, f);
        return map;
    }, []);

    // Per-applicant template overrides — local state so the user can re-assign
    // without mutating the shared mock array. Seeded so the Assignments tab
    // shows realistic data on first load. Two applicants are intentionally
    // left unassigned to demo the "needs a template" CTA.
    const [overrides, setOverrides] = useState<Record<string, string>>(() => ({
        'app-001': 'tpl-quick-hire',         // Billy Bob — fast CDL onboarding
        'app-002': 'tpl-complete-hiring',    // Tiger      — full pipeline
        'app-003': 'tpl-all-forms',          // Dale       — application forms only
        'app-004': 'tpl-cdl-a-otr',          // Patrick    — CDL-A OTR
        // 'app-005' left unassigned (Clint Eastwood) — demos the "needs a template" CTA
        'app-006': 'tpl-cross-border',       // Maria      — cross-border
        'app-007': 'tpl-cdl-a-otr',          // LeBron     — CDL-A OTR
        'app-008': 'tpl-complete-hiring',    // Serena     — full pipeline
        'app-009': 'tpl-quick-hire',         // (varied coverage for testing)
        // 'app-010' left unassigned
    }));

    // Re-read applications after a mutation (invite / add-as-driver) to refresh status.
    const [appRefresh, setAppRefresh] = useState(0);
    const bumpApps = () => setAppRefresh(n => n + 1);

    // Pagination for the assignments list.
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    // Invite-a-new-external-applicant modal.
    const [inviteNewOpen, setInviteNewOpen] = useState(false);

    const applicants = useMemo(() => loadApplicants(), [appRefresh]);

    const rows = useMemo<Row[]>(() => {
        return applicants.map((applicant, i) => ({
            applicant,
            carrier: carrierForApplicant(i),
            templateId: overrides[applicant.id] ?? applicant.assignedTemplateId,
        }));
    }, [applicants, overrides]);

    // On first load, back every assigned legacy applicant with a real application
    // (seeded from their pipeline stage) so the list badges/progress and the
    // detail page are one consistent source of truth.
    useEffect(() => {
        let changed = false;
        applicants.forEach((applicant, i) => {
            const templateId = overrides[applicant.id] ?? applicant.assignedTemplateId;
            const tpl = templateById.get(templateId);
            if (!tpl) return;
            const existing = getApplication(applicant.id);
            // Empty stub left by ensureApplication (opened but never invited) — reseed it.
            const isStub = !!existing && existing.status === 'draft' && !existing.invite && existing.events.length === 0;
            // Stored app points at a retired/changed template (its steps are keyed by the
            // old template's step ids) — reseed so the detail page can resolve the template.
            const staleTemplate = !!existing && existing.templateId !== templateId;
            if (existing && !isStub && !staleTemplate) return;
            upsertApplication(buildSeededApplication(applicant, tpl, carrierForApplicant(i), formById));
            changed = true;
        });
        if (changed) bumpApps();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Real hiring applications keyed by applicant id (issued/invited drivers).
    const applications = useMemo(() => {
        const m = new Map<string, HiringApplication>();
        for (const a of applicants) { const app = getApplication(a.id); if (app) m.set(a.id, app); }
        return m;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [applicants, appRefresh]);

    const [activeTab, setActiveTab] = useState<'view' | 'assign'>('view');
    const [search, setSearch] = useState("");
    const [carrierFilter, setCarrierFilter] = useState<string>("all");
    const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
    const [licenseFilter, setLicenseFilter] = useState<LicenseType | "all">("all");
    const [templateFilter, setTemplateFilter] = useState<string>("all");
    const [formTypeFilter, setFormTypeFilter] = useState<TemplateFormType | "all">("all");

    // Bulk-assign tab state
    const [bulkTemplateId, setBulkTemplateId] = useState<string>("");
    const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
    const [bulkBanner, setBulkBanner] = useState<string | null>(null);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter(r => {
            if (carrierFilter !== "all" && r.carrier.id !== carrierFilter) return false;
            if (stageFilter !== "all" && r.applicant.stage !== stageFilter) return false;
            if (licenseFilter !== "all" && r.applicant.licenseType !== licenseFilter) return false;
            if (templateFilter !== "all" && r.templateId !== templateFilter) return false;
            if (formTypeFilter !== "all") {
                const tpl = templateById.get(r.templateId);
                if (!tpl || tpl.formType !== formTypeFilter) return false;
            }
            if (q) {
                const name = `${r.applicant.firstName} ${r.applicant.lastName}`.toLowerCase();
                if (!name.includes(q)) return false;
            }
            return true;
        });
    }, [rows, search, carrierFilter, stageFilter, licenseFilter, templateFilter, formTypeFilter, templateById]);

    // Assignments tab — only drivers who actually have a hiring template
    // assigned (and whose template id resolves to a known template).
    const assignedRows = useMemo(
        () => filtered.filter(r => templateById.has(r.templateId)),
        [filtered, templateById],
    );

    const pageCount = Math.max(1, Math.ceil(assignedRows.length / pageSize));
    const safePage = Math.min(page, pageCount);
    const pagedRows = useMemo(
        () => assignedRows.slice((safePage - 1) * pageSize, safePage * pageSize),
        [assignedRows, safePage, pageSize],
    );
    // Snap back to a valid page when filters / page-size shrink the list.
    useEffect(() => { if (page > pageCount) setPage(1); }, [page, pageCount]);

    const counts = useMemo(() => {
        const out: Record<Stage, number> = { applications_received: 0, in_progress: 0, hired: 0, not_hired: 0 };
        for (const r of rows) out[r.applicant.stage] += 1;
        return out;
    }, [rows]);

    const carrierOptions = useMemo(() => {
        const ids = new Set(rows.map(r => r.carrier.id));
        return ACCOUNTS_DB.filter(a => ids.has(a.id));
    }, [rows]);

    const total = rows.length;
    const stageIconFor = (s: Stage) => s === 'applications_received' ? Inbox
        : s === 'in_progress' ? Clock
            : s === 'hired' ? UserCheck : UserX;

    return (
        <div className="flex-1 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 pt-4">
                <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-sm">
                            <Briefcase size={20} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl font-semibold text-slate-900">Driver Hiring Assignments</h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Assign a hiring template to each carrier's driver and track where they are in the pipeline.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => onNavigate?.('/ats/issue-hiring')}
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-blue-600 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
                    >
                        <UserPlus size={16} /> Issue Hiring
                    </button>
                </div>

                {/* Tab strip — matches the AtsPage tab pattern */}
                <div className="flex items-center gap-1 -mb-px">
                    {([
                        { id: 'view',   label: 'Assignments',  Icon: ListChecks, count: assignedRows.length },
                        { id: 'assign', label: 'Assign',       Icon: UserPlus,   count: bulkSelected.size || undefined },
                    ] as const).map(tab => {
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

            <div className="px-8 py-6 space-y-5">
                {/* KPI strip */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <KpiTile
                        label="Total drivers"
                        value={total}
                        accent="bg-slate-500"
                        Icon={Users}
                        active={stageFilter === "all"}
                        onClick={() => setStageFilter("all")}
                    />
                    {(['applications_received', 'in_progress', 'hired', 'not_hired'] as Stage[]).map(s => {
                        const meta = STAGE_META[s];
                        const Icon = stageIconFor(s);
                        return (
                            <KpiTile
                                key={s}
                                label={meta.label}
                                value={counts[s]}
                                accent={TONE_CLS[meta.tone].dot}
                                tone={TONE_CLS[meta.tone].text}
                                Icon={Icon}
                                active={stageFilter === s}
                                onClick={() => setStageFilter(stageFilter === s ? "all" : s)}
                            />
                        );
                    })}
                </div>

                {/* Filter row */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by driver name..."
                            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                        />
                    </div>
                    <select
                        value={carrierFilter}
                        onChange={(e) => setCarrierFilter(e.target.value)}
                        className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    >
                        <option value="all">All carriers</option>
                        {carrierOptions.map(a => (
                            <option key={a.id} value={a.id}>{a.dbaName || a.legalName}</option>
                        ))}
                    </select>
                    <select
                        value={licenseFilter}
                        onChange={(e) => setLicenseFilter(e.target.value as LicenseType | "all")}
                        className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    >
                        <option value="all">All license types</option>
                        {(['CDL-A', 'CDL-B', 'CDL', 'Non-CDL'] as LicenseType[]).map(l => (
                            <option key={l} value={l}>{l}</option>
                        ))}
                    </select>
                    <select
                        value={formTypeFilter}
                        onChange={(e) => setFormTypeFilter(e.target.value as TemplateFormType | "all")}
                        className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    >
                        <option value="all">All form types</option>
                        {TEMPLATE_FORM_TYPES.map(ft => (
                            <option key={ft.id} value={ft.id}>{ft.label}</option>
                        ))}
                    </select>
                    <select
                        value={templateFilter}
                        onChange={(e) => setTemplateFilter(e.target.value)}
                        className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    >
                        <option value="all">All templates</option>
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    {(carrierFilter !== "all" || licenseFilter !== "all" || templateFilter !== "all" || formTypeFilter !== "all" || stageFilter !== "all" || search) && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch("");
                                setCarrierFilter("all");
                                setStageFilter("all");
                                setLicenseFilter("all");
                                setTemplateFilter("all");
                                setFormTypeFilter("all");
                            }}
                            className="h-9 px-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
                        >
                            <XIcon size={12} /> Clear
                        </button>
                    )}
                    <span className="text-xs text-slate-500 tabular-nums ml-auto">
                        {filtered.length} of {total}
                    </span>
                </div>

                {/* ── Tab content ─────────────────────────────────────── */}
                {activeTab === 'view' && (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Driver Assignments</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Drivers with a hiring template assigned. The progress tracker shows where they are in the pipeline.
                                </p>
                            </div>
                            {filtered.length > assignedRows.length && (
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('assign')}
                                    className="shrink-0 text-[11px] font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                                >
                                    <UserPlus size={12} />
                                    {filtered.length - assignedRows.length} driver{filtered.length - assignedRows.length === 1 ? "" : "s"} need a template
                                </button>
                            )}
                        </div>
                        <div className="divide-y divide-slate-100">
                            {pagedRows.map(r => (
                                <AssignmentRow
                                    key={r.applicant.id}
                                    row={r}
                                    templateById={templateById}
                                    formById={formById}
                                    application={applications.get(r.applicant.id)}
                                    onOpen={() => {
                                        // Guarantee a valid, template-matching application before opening
                                        // the detail page (fixes "Application not found" for stale data).
                                        const tpl = templateById.get(r.templateId);
                                        const existing = getApplication(r.applicant.id);
                                        if (tpl && (!existing || existing.templateId !== r.templateId)) {
                                            upsertApplication(buildSeededApplication(r.applicant, tpl, r.carrier, formById));
                                        } else {
                                            ensureApplication(r.applicant.id, r.templateId);
                                        }
                                        bumpApps();
                                        onNavigate?.(`/ats/application/${r.applicant.id}`);
                                    }}
                                    onInvite={(email) => { inviteDriver(r.applicant.id, email); bumpApps(); }}
                                    onAddDriver={() => { addAsDriver(r.applicant.id, r.carrier.id); bumpApps(); }}
                                    onRequest={(req) => { addRequest(r.applicant.id, req); bumpApps(); }}
                                    onRemind={() => { sendReminder(r.applicant.id); bumpApps(); }}
                                    onCancel={() => { cancelApplication(r.applicant.id); bumpApps(); }}
                                    onDelete={() => { deleteApplication(r.applicant.id); bumpApps(); }}
                                />
                            ))}
                            {assignedRows.length === 0 && (
                                <div className="px-6 py-12 text-center">
                                    <div className="text-sm text-slate-500 mb-2">
                                        No drivers have a hiring template assigned yet.
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('assign')}
                                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm"
                                    >
                                        <UserPlus size={14} /> Assign templates
                                    </button>
                                </div>
                            )}
                        </div>
                        {assignedRows.length > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
                                <div className="flex items-center gap-2 text-[12px] text-slate-500">
                                    <span>Showing</span>
                                    <span className="font-semibold text-slate-700 tabular-nums">
                                        {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, assignedRows.length)}
                                    </span>
                                    <span>of</span>
                                    <span className="font-semibold text-slate-700 tabular-nums">{assignedRows.length}</span>
                                    <span className="ml-2">·</span>
                                    <label className="ml-1 inline-flex items-center gap-1.5">
                                        <span>Per page</span>
                                        <select
                                            value={pageSize}
                                            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-[12px] font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                                        >
                                            {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                    </label>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
                                        className={cn('inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-[12px] font-semibold',
                                            safePage <= 1 ? 'cursor-not-allowed border-slate-200 text-slate-300' : 'border-slate-300 text-slate-700 hover:bg-white')}>
                                        Prev
                                    </button>
                                    <span className="px-2 text-[12px] font-semibold text-slate-600 tabular-nums">Page {safePage} / {pageCount}</span>
                                    <button type="button" onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={safePage >= pageCount}
                                        className={cn('inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-[12px] font-semibold',
                                            safePage >= pageCount ? 'cursor-not-allowed border-slate-200 text-slate-300' : 'border-slate-300 text-slate-700 hover:bg-white')}>
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'assign' && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/40 px-5 py-3.5">
                            <div className="flex items-start gap-2.5">
                                <UserPlus size={16} className="mt-0.5 shrink-0 text-blue-600" />
                                <div>
                                    <p className="text-[13px] font-bold text-slate-800">Invite a new applicant</p>
                                    <p className="text-[11px] text-slate-500">Inviting someone from outside the system — enter their details, pick a template, and send the application link.</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setInviteNewOpen(true)}
                                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-[13px] font-bold text-white shadow-sm hover:bg-blue-700">
                                <UserPlus size={14} /> Invite new applicant
                            </button>
                        </div>
                        <AssignTab
                            rows={filtered}
                        templates={templates}
                        templateById={templateById}
                        bulkTemplateId={bulkTemplateId}
                        setBulkTemplateId={setBulkTemplateId}
                        selected={bulkSelected}
                        setSelected={setBulkSelected}
                        banner={bulkBanner}
                        clearBanner={() => setBulkBanner(null)}
                        onApply={() => {
                            if (!bulkTemplateId || bulkSelected.size === 0) return;
                            setOverrides(o => {
                                const next = { ...o };
                                for (const id of bulkSelected) next[id] = bulkTemplateId;
                                return next;
                            });
                            const tplName = templateById.get(bulkTemplateId)?.name ?? "template";
                            const n = bulkSelected.size;
                            setBulkBanner(`Assigned "${tplName}" to ${n} driver${n === 1 ? "" : "s"}.`);
                            setBulkSelected(new Set());
                        }}
                        />
                    </div>
                )}
            </div>

            {inviteNewOpen && (
                <InviteApplicantModal
                    templates={templates}
                    onDone={() => { setInviteNewOpen(false); bumpApps(); setActiveTab('view'); }}
                    onClose={() => setInviteNewOpen(false)}
                />
            )}
        </div>
    );
}

// ── Invite a new external applicant ──────────────────────────────────────

const INVITE_INPUT = "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200";
function InviteField({ label, children }: { label: string; children: React.ReactNode }) {
    return <div><label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</label>{children}</div>;
}

function InviteApplicantModal({ templates, onDone, onClose }: {
    templates: DriverHiringTemplate[];
    onDone: () => void;
    onClose: () => void;
}) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [licenseType, setLicenseType] = useState<LicenseType>('CDL-A');
    const [carrierId, setCarrierId] = useState<string>(ACCOUNTS_DB[0]?.id ?? '');
    const [templateId, setTemplateId] = useState<string>(templates.find(t => t.isDefault)?.id ?? templates[0]?.id ?? '');
    const canSend = !!(firstName.trim() && lastName.trim() && email.trim() && templateId);

    const send = () => {
        if (!canSend) return;
        const a = createApplicant({
            firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(),
            phone: phone.trim() || undefined, licenseType, templateId, carrierId: carrierId || undefined,
        });
        inviteDriver(a.id, email.trim());
        onDone();
    };

    return (
        <div role="dialog" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-6" onClick={onClose}>
            <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Invite new applicant</h3>
                        <p className="mt-0.5 text-[12px] text-slate-500">Creates the applicant and emails them the application link.</p>
                    </div>
                    <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"><XIcon size={16} /></button>
                </div>
                <div className="space-y-3 px-6 py-5">
                    <div className="grid grid-cols-2 gap-3">
                        <InviteField label="First name *"><input autoFocus value={firstName} onChange={e => setFirstName(e.target.value)} className={INVITE_INPUT} /></InviteField>
                        <InviteField label="Last name *"><input value={lastName} onChange={e => setLastName(e.target.value)} className={INVITE_INPUT} /></InviteField>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <InviteField label="Email *"><input type="email" value={email} onChange={e => setEmail(e.target.value)} className={INVITE_INPUT} /></InviteField>
                        <InviteField label="Phone"><input value={phone} onChange={e => setPhone(e.target.value)} className={INVITE_INPUT} /></InviteField>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <InviteField label="License type">
                            <select value={licenseType} onChange={e => setLicenseType(e.target.value as LicenseType)} className={INVITE_INPUT}>
                                {(['CDL-A', 'CDL-B', 'CDL', 'Non-CDL'] as LicenseType[]).map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </InviteField>
                        <InviteField label="Carrier">
                            <select value={carrierId} onChange={e => setCarrierId(e.target.value)} className={INVITE_INPUT}>
                                {ACCOUNTS_DB.map(c => <option key={c.id} value={c.id}>{c.dbaName || c.legalName}</option>)}
                            </select>
                        </InviteField>
                    </div>
                    <InviteField label="Hiring template *">
                        <select value={templateId} onChange={e => setTemplateId(e.target.value)} className={INVITE_INPUT}>
                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}{t.isDefault ? ' (Default)' : ''} · {t.steps.length} steps</option>)}
                        </select>
                    </InviteField>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50/50 px-6 py-3">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" disabled={!canSend} onClick={send}
                        className={cn("inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold text-white shadow-sm", canSend ? "bg-blue-600 hover:bg-blue-700" : "cursor-not-allowed bg-slate-300")}>
                        <Send size={14} /> Send invite
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Assign tab (bulk-assign workflow) ────────────────────────────────────

function AssignTab({
    rows, templates, templateById,
    bulkTemplateId, setBulkTemplateId,
    selected, setSelected,
    banner, clearBanner,
    onApply,
}: {
    rows: Row[];
    templates: DriverHiringTemplate[];
    templateById: Map<string, DriverHiringTemplate>;
    bulkTemplateId: string;
    setBulkTemplateId: (id: string) => void;
    selected: Set<string>;
    setSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
    banner: string | null;
    clearBanner: () => void;
    onApply: () => void;
}) {
    const tpl = templateById.get(bulkTemplateId);
    const allSelected = rows.length > 0 && rows.every(r => selected.has(r.applicant.id));
    const someSelected = !allSelected && rows.some(r => selected.has(r.applicant.id));

    const toggleAll = () => {
        setSelected(prev => {
            const next = new Set(prev);
            if (allSelected) {
                for (const r of rows) next.delete(r.applicant.id);
            } else {
                for (const r of rows) next.add(r.applicant.id);
            }
            return next;
        });
    };
    const toggleOne = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectUnassigned = () => {
        setSelected(prev => {
            const next = new Set(prev);
            for (const r of rows) {
                if (!templateById.has(r.templateId)) next.add(r.applicant.id);
            }
            return next;
        });
    };
    const selectNeedingChange = () => {
        if (!bulkTemplateId) return;
        setSelected(prev => {
            const next = new Set(prev);
            for (const r of rows) {
                if (r.templateId !== bulkTemplateId) next.add(r.applicant.id);
            }
            return next;
        });
    };
    const clearSelection = () => setSelected(new Set());

    // Break the selection into "new" vs "re-assigning" so the apply bar can
    // surface the difference to the user before they commit.
    const selectedRows = rows.filter(r => selected.has(r.applicant.id));
    const newAssignCount = selectedRows.filter(r => !templateById.has(r.templateId)).length;
    const reAssignCount = selectedRows.filter(r => templateById.has(r.templateId) && r.templateId !== bulkTemplateId).length;
    const noopCount = selectedRows.length - newAssignCount - reAssignCount;

    const canApply = !!bulkTemplateId && selected.size > 0;

    return (
        <div className="space-y-4">
            {banner && (
                <div className="flex items-start justify-between gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                        <Check size={16} className="text-emerald-600 shrink-0" />
                        <span>{banner}</span>
                    </div>
                    <button type="button" onClick={clearBanner} className="text-emerald-700 hover:text-emerald-900">
                        <XIcon size={14} />
                    </button>
                </div>
            )}

            {/* Step 1 — pick template */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                    <h3 className="text-sm font-bold text-slate-900">Pick a hiring template</h3>
                    {tpl && (
                        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                            <Check size={11} strokeWidth={3} /> {tpl.name}
                        </span>
                    )}
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                    {templates.map(t => {
                        const isPicked = bulkTemplateId === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setBulkTemplateId(t.id)}
                                className={cn(
                                    "text-left rounded-lg border-2 p-3 transition-all relative",
                                    isPicked
                                        ? "border-blue-500 bg-blue-50/60 shadow-sm"
                                        : "border-slate-200 hover:border-blue-300 hover:bg-slate-50",
                                )}
                            >
                                {isPicked && (
                                    <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-600 text-white shadow-sm">
                                        <Check size={12} strokeWidth={3} />
                                    </span>
                                )}
                                <div className="flex items-center gap-1.5 min-w-0 mb-1">
                                    <FileText size={13} className={isPicked ? "text-blue-600 shrink-0" : "text-slate-400 shrink-0"} />
                                    <span className="text-[13px] font-bold text-slate-900 truncate">{t.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] mb-1">
                                    <span className="font-bold text-slate-600 tabular-nums">{t.steps.length} steps</span>
                                    {t.isDefault && (
                                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[9px]">
                                            Default
                                        </span>
                                    )}
                                </div>
                                {t.description && (
                                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">
                                        {t.description}
                                    </p>
                                )}
                            </button>
                        );
                    })}
                    {templates.length === 0 && (
                        <div className="col-span-full text-center text-sm text-slate-500 py-6">
                            No templates available. Create one in Super Admin → Hiring Templates.
                        </div>
                    )}
                </div>
            </div>

            {/* Step 2 — select drivers */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                        <h3 className="text-sm font-bold text-slate-900">Select drivers</h3>
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                        <button
                            type="button"
                            onClick={selectUnassigned}
                            className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
                        >
                            Select unassigned
                        </button>
                        {bulkTemplateId && (
                            <button
                                type="button"
                                onClick={selectNeedingChange}
                                className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
                            >
                                Select drivers without this template
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={clearSelection}
                            disabled={selected.size === 0}
                            className="h-7 px-2.5 text-[11px] font-semibold rounded-md text-slate-500 hover:text-slate-800 disabled:text-slate-300 disabled:cursor-not-allowed"
                        >
                            Clear
                        </button>
                        <span className="text-[11px] text-slate-500 tabular-nums pl-2 border-l border-slate-200">
                            <span className="font-bold text-slate-700">{selected.size}</span> / {rows.length} selected
                        </span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50/40 border-b border-slate-100">
                            <tr className="text-left">
                                <th className="px-4 py-2.5 w-10">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        ref={(el) => { if (el) el.indeterminate = someSelected; }}
                                        onChange={toggleAll}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </th>
                                <Th>Driver</Th>
                                <Th>Carrier</Th>
                                <Th>Current template</Th>
                                <Th>Stage</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(r => {
                                const isChecked = selected.has(r.applicant.id);
                                const current = templateById.get(r.templateId);
                                const isUnassigned = !current;
                                const willChange = !!current && r.templateId !== bulkTemplateId && !!bulkTemplateId;
                                const stageMeta = STAGE_META[r.applicant.stage];
                                const stageTone = TONE_CLS[stageMeta.tone];
                                const initials = `${r.applicant.firstName[0] ?? ""}${r.applicant.lastName[0] ?? ""}`.toUpperCase();
                                return (
                                    <tr
                                        key={r.applicant.id}
                                        className={cn(
                                            "border-b border-slate-100 last:border-b-0 transition-colors cursor-pointer",
                                            isChecked
                                                ? "bg-blue-50/70 hover:bg-blue-50"
                                                : "hover:bg-slate-50/60",
                                        )}
                                        onClick={() => toggleOne(r.applicant.id)}
                                    >
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleOne(r.applicant.id)}
                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                                                    {initials || "?"}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold text-slate-900 truncate">
                                                        {r.applicant.firstName} {r.applicant.lastName}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500">
                                                        {r.applicant.licenseType} · {r.applicant.applicantType}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700">
                                            <div className="inline-flex items-center gap-1.5">
                                                <Building2 size={11} className="text-slate-400" />
                                                {r.carrier.dbaName || r.carrier.legalName}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {isUnassigned ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                                    <AlertCircle size={10} /> NOT ASSIGNED
                                                </span>
                                            ) : willChange && isChecked ? (
                                                <div className="text-[11px]">
                                                    <span className="text-slate-500 line-through">{current!.name}</span>
                                                    <span className="text-blue-700 font-semibold ml-1">→ {tpl?.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-700">{current!.name}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn(
                                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border",
                                                stageTone.chip, stageTone.border,
                                            )}>
                                                <span className={cn("h-1.5 w-1.5 rounded-full", stageTone.dot)} />
                                                {stageMeta.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">
                                        No drivers match the current filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Step 3 — sticky apply bar */}
            <div className="sticky bottom-3 bg-white border-2 border-slate-200 rounded-xl shadow-lg p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0 flex-wrap">
                    <span className="h-7 w-7 rounded-full bg-blue-600 text-white text-[12px] font-bold flex items-center justify-center shrink-0">3</span>
                    {!canApply ? (
                        <div className="text-sm text-slate-500">
                            {!bulkTemplateId
                                ? "Pick a hiring template above to enable assignment."
                                : "Select at least one driver to assign."}
                        </div>
                    ) : (
                        <div className="text-sm text-slate-700 flex items-center gap-2 flex-wrap">
                            <span>
                                Assigning <span className="font-bold text-slate-900">"{tpl!.name}"</span>
                                {" "}<span className="text-slate-500">({tpl!.steps.length} steps)</span> to{" "}
                                <span className="font-bold text-slate-900">{selected.size}</span> driver{selected.size === 1 ? "" : "s"}
                            </span>
                            <span className="flex items-center gap-1.5 text-[11px]">
                                {newAssignCount > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
                                        +{newAssignCount} new
                                    </span>
                                )}
                                {reAssignCount > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold">
                                        ↻ {reAssignCount} re-assigned
                                    </span>
                                )}
                                {noopCount > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 font-bold">
                                        {noopCount} unchanged
                                    </span>
                                )}
                            </span>
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onApply}
                    disabled={!canApply}
                    className={cn(
                        "h-9 px-4 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors shrink-0",
                        canApply
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed",
                    )}
                >
                    <Check size={14} /> Assign to {selected.size} driver{selected.size === 1 ? "" : "s"}
                </button>
            </div>
        </div>
    );
}

// ── Tiny helpers ─────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
    return (
        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {children}
        </th>
    );
}

// ── Row ──────────────────────────────────────────────────────────────────

/** Back-office compliance review forms — counted separately from applicant forms. */
const REVIEW_FORM_IDS = new Set([
    'form-psp-review', 'form-mvr-review', 'form-criminal-background',
    'form-substance-testing', 'form-clearinghouse-query', 'form-employment-verification',
]);

/** A clean segmented progress strip — one thin segment per step, coloured by status.
 *  Scales to any number of steps (unlike numbered bubbles). */
function StepStrip({ statuses, isStuck, onStepClick }: {
    statuses: TStatus[]; isStuck: boolean; onStepClick?: (i: number) => void;
}) {
    return (
        <div className="flex gap-0.5">
            {statuses.map((s, i) => {
                const cls =
                    s === 'completed' ? 'bg-emerald-500'
                        : s === 'in_progress' ? (isStuck ? 'bg-rose-500' : 'bg-blue-500')
                            : s === 'failed' ? 'bg-rose-400'
                                : 'bg-slate-200';
                return (
                    <button
                        key={i}
                        type="button"
                        onClick={() => onStepClick?.(i)}
                        title={`Step ${i + 1} — ${s.replace('_', ' ')}`}
                        className={cn('h-2.5 flex-1 rounded-sm transition-colors hover:opacity-80', cls)}
                    />
                );
            })}
        </div>
    );
}

type ChipTone = 'slate' | 'blue' | 'emerald' | 'amber' | 'violet';
function SummaryChip({ label, tone = 'slate', icon: Icon }: {
    label: string; tone?: ChipTone; icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
    const tones: Record<ChipTone, string> = {
        slate: 'border-slate-200 bg-slate-50 text-slate-600',
        blue: 'border-blue-200 bg-blue-50 text-blue-700',
        emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        amber: 'border-amber-200 bg-amber-50 text-amber-700',
        violet: 'border-violet-200 bg-violet-50 text-violet-700',
    };
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold', tones[tone])}>
            {Icon && <Icon size={10} />} {label}
        </span>
    );
}

function AssignmentRow({
    row, templateById, formById, application, onOpen, onInvite, onAddDriver, onRequest, onRemind, onCancel, onDelete,
}: {
    row: Row;
    templateById: Map<string, DriverHiringTemplate>;
    formById: Map<string, ApplicationFormDef>;
    application?: HiringApplication;
    onOpen?: () => void;
    onInvite?: (email: string) => void;
    onAddDriver?: () => void;
    onRequest?: (req: RequestInput) => void;
    onRemind?: () => void;
    onCancel?: () => void;
    onDelete?: () => void;
}) {
    const { applicant, carrier, templateId } = row;
    const stageMeta = STAGE_META[applicant.stage];
    const stageTone = TONE_CLS[stageMeta.tone];
    const tpl = templateById.get(templateId);
    const dqDriverType = detectDqDriverType(applicant);
    const dqTypeLabel = DQ_DRIVER_TYPES.find(t => t.id === dqDriverType)?.label ?? dqDriverType;

    const templateSteps = tpl?.steps ?? [];
    // Prefer the real application's per-step status; fall back to the mock
    // hash for legacy seeded rows that have no application yet.
    const statuses = useMemo(
        () => application
            ? realStatuses(application, templateSteps)
            : templateProgressFor(applicant, templateSteps.length),
        [application, applicant, templateSteps],
    );
    const completedCount = statuses.filter(s => s === 'completed').length;
    const activeIndex = statuses.findIndex(s => s === 'in_progress' || s === 'failed');
    const currentStep = activeIndex >= 0 ? templateSteps[activeIndex] : undefined;
    const currentLabel = currentStep ? labelForTemplateStep(currentStep, formById) : null;
    const isStuck = activeIndex >= 0 && statuses[activeIndex] === 'failed';
    const isComplete = templateSteps.length > 0 && completedCount === templateSteps.length;
    const pct = templateSteps.length > 0
        ? Math.round((completedCount / templateSteps.length) * 100)
        : 0;
    const submittedCount = useMemo(
        () => application ? templateSteps.filter(s => { const st = application.steps[s.id]?.status; return st === 'submitted' || st === 'approved'; }).length : completedCount,
        [application, templateSteps, completedCount],
    );

    // Step breakdown — forms vs consents vs back-office reviews, and total document/key-number fields.
    const breakdown = useMemo(() => {
        let forms = 0, consents = 0, reviews = 0, docs = 0;
        for (const s of templateSteps) {
            if ((s.kind ?? 'form') === 'consent') { consents++; continue; }
            if (REVIEW_FORM_IDS.has(s.formId)) reviews++; else forms++;
            for (const fld of formById.get(s.formId)?.fields ?? []) {
                if (fld.type === 'document' || fld.type === 'compliance') docs++;
            }
        }
        return { forms, consents, reviews, docs };
    }, [templateSteps, formById]);

    const initials = `${applicant.firstName[0] ?? ""}${applicant.lastName[0] ?? ""}`.toUpperCase();

    // Step the user clicked to inspect its (filled) form.
    const [openStep, setOpenStep] = useState<number | null>(null);
    // Email-invite + add-as-driver + ask/order flow. Invited / added derive from the real application.
    const [inviteOpen, setInviteOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [askOpen, setAskOpen] = useState(false);
    const invited = !!application?.invite;
    const added = application?.status === 'approved' || applicant.stage === 'hired';
    const cancelled = application?.status === 'rejected';
    const openRequests = application?.requests.filter(r => r.status === 'open').length ?? 0;

    return (
        <div className="px-5 py-4 hover:bg-slate-50/40 transition-colors">
            {/* Top row — driver identity + carrier + stage */}
            <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 text-sm font-bold flex items-center justify-center shrink-0">
                        {initials || "?"}
                    </div>
                    <div className="min-w-0">
                        <button type="button" onClick={onOpen} className="text-sm font-bold text-blue-700 truncate hover:underline text-left">
                            {applicant.firstName} {applicant.lastName}
                        </button>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                            <span className="font-semibold text-slate-600">{applicant.licenseType}</span>
                            <span className="rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">
                                {dqTypeLabel}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="inline-flex items-center gap-1">
                                <Calendar size={11} /> {applicant.appliedDate}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="inline-flex items-center gap-1">
                                <Building2 size={11} className="text-slate-400" />
                                <span className="font-medium text-slate-700">{carrier.dbaName || carrier.legalName}</span>
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {application ? (
                        <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold", APP_STATUS_META[application.status].cls)}>
                            {APP_STATUS_META[application.status].label}
                        </span>
                    ) : (
                        <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border",
                            stageTone.chip, stageTone.border,
                        )}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", stageTone.dot)} />
                            {stageMeta.label}
                        </span>
                    )}
                    <span
                        className="inline-flex items-center gap-1 text-[11px] text-slate-500 tabular-nums"
                        title={application?.invite ? `Invited ${elapsedLabel(application.invite.sentAt)} ago` : 'Time in pipeline'}
                    >
                        <Clock size={10} /> {application?.invite ? elapsedLabel(application.invite.sentAt) : `${applicant.daysInPipeline}d`}
                    </span>
                </div>
            </div>

            {/* Bottom row — assigned template (fixed) + progress timeline */}
            <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,260px)_1fr] gap-4 items-start">
                <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Hiring template
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                        <div className="flex items-center gap-1.5 text-[13px] font-bold text-slate-800">
                            <LayoutTemplate size={13} className="shrink-0 text-slate-400" />
                            <span className="truncate">{tpl?.name ?? 'Not assigned'}</span>
                        </div>
                        <div className="mt-0.5 text-[10px] font-semibold text-slate-500">
                            {templateSteps.length} step{templateSteps.length === 1 ? '' : 's'}
                            {tpl?.isDefault ? ' · Default' : ''}
                            {openRequests > 0 ? ` · ${openRequests} open request${openRequests === 1 ? '' : 's'}` : ''}
                        </div>
                    </div>
                </div>

                <div className="min-w-0">
                    {templateSteps.length === 0 ? (
                        <div className="flex items-center justify-center text-xs text-slate-400 italic border border-dashed border-slate-200 rounded-lg py-4 h-full">
                            Assign a hiring template to see step-by-step progress.
                        </div>
                    ) : (
                        <>
                            <div className="flex items-baseline justify-between gap-3 mb-1.5">
                                <div className="min-w-0 flex items-center gap-2">
                                    {isComplete ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                            <Check size={12} strokeWidth={3} /> All steps complete
                                        </span>
                                    ) : currentLabel ? (
                                        <>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                                                Step {activeIndex + 1} of {templateSteps.length}
                                            </span>
                                            <span className={cn(
                                                "text-[12px] font-semibold truncate",
                                                isStuck ? "text-rose-700" : "text-slate-800",
                                            )}>
                                                {currentLabel}
                                            </span>
                                            {isStuck && (
                                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-600 px-1.5 py-0.5 rounded-full bg-rose-50 border border-rose-200">
                                                    <AlertCircle size={9} /> STUCK
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-[11px] font-bold text-slate-500">
                                            Not started
                                        </span>
                                    )}
                                </div>
                                <span className="text-[11px] font-bold text-slate-500 tabular-nums shrink-0">
                                    {completedCount} / {templateSteps.length} · {pct}%
                                </span>
                            </div>
                            <StepStrip statuses={statuses} isStuck={isStuck} onStepClick={setOpenStep} />
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <SummaryChip tone="emerald" label={`${submittedCount}/${templateSteps.length} submitted`} />
                                {breakdown.forms > 0 && <SummaryChip tone="slate" icon={FileText} label={`${breakdown.forms} forms`} />}
                                {breakdown.consents > 0 && <SummaryChip tone="violet" icon={ShieldCheck} label={`${breakdown.consents} consents`} />}
                                {breakdown.reviews > 0 && <SummaryChip tone="blue" icon={ClipboardCheck} label={`${breakdown.reviews} reviews`} />}
                                {breakdown.docs > 0 && <SummaryChip tone="amber" icon={Paperclip} label={`${breakdown.docs} documents`} />}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Actions — review the live application, request info, manage it */}
            {tpl && (
                <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    <button
                        type="button"
                        onClick={onOpen}
                        className="mr-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                    >
                        <FileText size={13} /> Open application
                    </button>
                    {!cancelled && (
                        <button
                            type="button"
                            onClick={() => setAskOpen(true)}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                        >
                            <MessageSquarePlus size={13} /> Ask / Order
                            {openRequests > 0 && (
                                <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-100 px-1 text-[9px] font-bold text-blue-700">{openRequests}</span>
                            )}
                        </button>
                    )}
                    {isComplete && !cancelled && (
                        added ? (
                            <span className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-[12px] font-bold text-emerald-700">
                                <UserCheck size={13} /> Added as driver
                            </span>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setAddOpen(true)}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-600 text-[12px] font-bold text-white shadow-sm hover:bg-blue-700"
                            >
                                <UserPlus size={13} /> Add as driver
                            </button>
                        )
                    )}
                    <RowMenu
                        invited={invited}
                        cancelled={cancelled}
                        onResend={() => setInviteOpen(true)}
                        onRemind={onRemind}
                        onCancel={onCancel}
                        onDelete={onDelete}
                    />
                </div>
            )}

            {inviteOpen && tpl && (
                <SendApplicationModal
                    applicant={applicant}
                    carrier={carrier}
                    template={tpl}
                    steps={templateSteps}
                    statuses={statuses}
                    formById={formById}
                    alreadySent={invited}
                    onSend={(email) => { onInvite?.(email); setInviteOpen(false); }}
                    onClose={() => setInviteOpen(false)}
                />
            )}

            {addOpen && (
                <AddDriverModal
                    applicant={applicant}
                    carrier={carrier}
                    onConfirm={() => { onAddDriver?.(); setAddOpen(false); }}
                    onClose={() => setAddOpen(false)}
                />
            )}

            {askOpen && tpl && (
                <AskOrderModal
                    applicant={applicant}
                    steps={templateSteps}
                    formById={formById}
                    requests={application?.requests ?? []}
                    onSend={(req) => { onRequest?.(req); }}
                    onClose={() => setAskOpen(false)}
                />
            )}

            {openStep !== null && templateSteps[openStep] && (
                <StepFormModal
                    applicant={applicant}
                    step={templateSteps[openStep]}
                    status={statuses[openStep] ?? 'not_started'}
                    stepIndex={openStep}
                    totalSteps={templateSteps.length}
                    form={formById.get(templateSteps[openStep].formId)}
                    onClose={() => setOpenStep(null)}
                />
            )}
        </div>
    );
}

// ── Step form viewer (read-only filled form for a clicked step) ───────────

function StepFormModal({
    applicant, step, status, stepIndex, totalSteps, form, onClose,
}: {
    applicant: Applicant;
    step: TemplateStep;
    status: TStatus;
    stepIndex: number;
    totalSteps: number;
    form: ApplicationFormDef | undefined;
    onClose: () => void;
}) {
    const filled = status === 'completed' || status === 'in_progress';
    const isConsent = step.kind === 'consent';
    const consent = isConsent ? CONSENT_BY_ID[step.formId as ConsentCategory] : undefined;
    const title = step.label || form?.displayTitle || form?.name || consent?.title || 'Form';
    const fields = (form?.fields ?? []).filter(f => !['heading', 'paragraph', 'bullet-list', 'alert'].includes(f.type));
    const docs = form?.documents ?? [];

    const statusChip =
        status === 'completed' ? { text: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
        : status === 'in_progress' ? { text: 'In progress', cls: 'bg-blue-50 text-blue-700 border-blue-200' }
        : status === 'failed' ? { text: 'Stuck', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
        : { text: 'Not started', cls: 'bg-slate-100 text-slate-500 border-slate-200' };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={onClose}>
            <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {applicant.firstName} {applicant.lastName} · Step {stepIndex + 1} of {totalSteps}
                        </p>
                        <h3 className="mt-0.5 text-base font-bold text-slate-900">{title}</h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", statusChip.cls)}>{statusChip.text}</span>
                        <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><XIcon size={16} /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50/40 px-6 py-5">
                    {isConsent ? (
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            {consent?.subtitle && <p className="text-[12px] font-medium text-slate-500">{consent.subtitle}</p>}
                            <p className="mt-1 text-sm text-slate-600">{consent?.body?.[0] ?? 'Consent / acknowledgement step.'}</p>
                            <div className="mt-4 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Signature</span>
                                <span className={cn("ml-auto text-sm", filled ? "font-semibold italic text-slate-800" : "text-slate-400")}>
                                    {filled ? `${applicant.firstName} ${applicant.lastName}` : 'Not signed'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                            {fields.length === 0 && docs.length === 0 && (
                                <p className="text-sm italic text-slate-400">This form has no captured fields.</p>
                            )}
                            {fields.map(f => (
                                <div key={f.id}>
                                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                        {f.label}{f.required && <span className="text-rose-500"> *</span>}
                                    </p>
                                    <div className={cn(
                                        "min-h-9 rounded-md border px-3 py-2 text-sm",
                                        filled ? "border-slate-200 bg-white text-slate-800" : "border-dashed border-slate-300 bg-slate-50 text-slate-400 italic",
                                    )}>
                                        {filled ? mockFieldValue(f, applicant) : 'Not provided'}
                                    </div>
                                </div>
                            ))}
                            {docs.length > 0 && (
                                <div className="border-t border-slate-100 pt-3">
                                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Documents</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {docs.map(d => (
                                            <span key={d.id} className={cn(
                                                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                                                filled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-400",
                                            )}>
                                                <FileText size={11} /> {d.label}{filled ? ' · uploaded' : ' · missing'}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <p className="mt-3 text-[11px] italic text-slate-400">
                        {filled
                            ? 'Submitted values for this step (sample data in this prototype).'
                            : 'This step has not been completed yet — the applicant hasn\'t submitted it.'}
                    </p>
                </div>

                <div className="flex justify-end border-t border-slate-200 bg-white px-6 py-3">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Close</button>
                </div>
            </div>
        </div>
    );
}

/** Plausible sample value for a field, so a completed step reads like a filled form. */
function mockFieldValue(f: { type: string; label: string; options: string[] }, applicant: Applicant): string {
    switch (f.type) {
        case 'date': return applicant.appliedDate || '2026-05-01';
        case 'number': return '123456';
        case 'toggle': return 'Yes';
        case 'select':
        case 'radio': return f.options?.[0] ?? 'Selected';
        case 'checklist': return (f.options ?? []).slice(0, 2).join(', ') || '—';
        case 'signature': return `${applicant.firstName} ${applicant.lastName}`;
        case 'document': return 'uploaded.pdf';
        default:
            if (/email/i.test(f.label)) return `${applicant.firstName}.${applicant.lastName}@example.com`.toLowerCase();
            if (/phone/i.test(f.label)) return '(555) 123-4567';
            if (/name/i.test(f.label)) return `${applicant.firstName} ${applicant.lastName}`;
            if (/address|city|street/i.test(f.label)) return '123 Main St';
            return 'Provided';
    }
}

// ── Send application via email ────────────────────────────────────────────

function SendApplicationModal({
    applicant, carrier, template, steps, statuses, formById, alreadySent, onSend, onClose,
}: {
    applicant: Applicant;
    carrier: AccountRecord;
    template: DriverHiringTemplate;
    steps: TemplateStep[];
    statuses: TStatus[];
    formById: Map<string, ApplicationFormDef>;
    alreadySent: boolean;
    onSend: (email: string) => void;
    onClose: () => void;
}) {
    const [email, setEmail] = useState(
        applicant.email || `${applicant.firstName}.${applicant.lastName}@example.com`.toLowerCase().replace(/\s+/g, ''),
    );
    const link = `https://apply.tracksmart.app/${applicant.id}`;
    const [copied, setCopied] = useState(false);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={onClose}>
            <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Send application</p>
                        <h3 className="mt-0.5 text-base font-bold text-slate-900">{applicant.firstName} {applicant.lastName}</h3>
                        <p className="mt-0.5 text-[12px] text-slate-500">{carrier.dbaName || carrier.legalName} · {template.name}</p>
                    </div>
                    <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><XIcon size={16} /></button>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50/40 px-6 py-5 space-y-4">
                    {/* Email */}
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Driver email</label>
                        <div className="relative">
                            <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Application link */}
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Application link</label>
                        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                            <Link2 size={13} className="shrink-0 text-slate-400" />
                            <span className="truncate text-[12px] text-slate-600">{link}</span>
                            <button type="button" onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                                className="ml-auto inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700">
                                {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                            </button>
                        </div>
                    </div>

                    {/* Step breakdown */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            What the driver fills out · {steps.length} steps
                        </p>
                        <ol className="space-y-1">
                            {steps.map((s, i) => {
                                const st = statuses[i] ?? 'not_started';
                                return (
                                    <li key={s.id} className="flex items-center gap-2.5 text-[13px]">
                                        <span className={cn(
                                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                                            st === 'completed' ? "border-emerald-500 bg-emerald-500 text-white"
                                                : st === 'in_progress' ? "border-blue-500 bg-blue-500 text-white"
                                                : st === 'failed' ? "border-rose-500 bg-rose-500 text-white"
                                                : "border-slate-300 bg-white text-slate-400",
                                        )}>
                                            {st === 'completed' ? <Check size={11} strokeWidth={3} /> : i + 1}
                                        </span>
                                        <span className={cn("truncate", st === 'completed' ? "text-slate-700" : "text-slate-600")}>
                                            {labelForTemplateStep(s, formById)}
                                        </span>
                                        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-slate-400">{st.replace('_', ' ')}</span>
                                    </li>
                                );
                            })}
                        </ol>
                    </div>

                    <p className="text-[11px] italic text-slate-400">
                        We'll email the driver a secure link to complete these steps. When they submit, you can add them as a driver.
                    </p>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-3">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={() => onSend(email)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700">
                        <Send className="h-4 w-4" /> {alreadySent ? 'Resend' : 'Send application'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Add applicant as a driver ─────────────────────────────────────────────

function AddDriverModal({ applicant, carrier, onConfirm, onClose }: {
    applicant: Applicant;
    carrier: AccountRecord;
    onConfirm: () => void;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={onClose}>
            <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
                    <h3 className="text-base font-bold text-slate-900">Add as driver</h3>
                    <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><XIcon size={16} /></button>
                </div>
                <div className="px-6 py-5">
                    <p className="text-sm text-slate-600">
                        The application is complete. Add <span className="font-semibold text-slate-900">{applicant.firstName} {applicant.lastName}</span> as a driver under <span className="font-semibold text-slate-900">{carrier.dbaName || carrier.legalName}</span>?
                    </p>
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-[12px] text-slate-600 space-y-1">
                        <div className="flex justify-between"><span className="text-slate-500">License</span><span className="font-medium text-slate-800">{applicant.licenseType}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Applied</span><span className="font-medium text-slate-800">{applicant.appliedDate}</span></div>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/50 px-6 py-3">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={onConfirm} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700">
                        <UserPlus className="h-4 w-4" /> Add as driver
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Row overflow menu (resend invite · cancel · delete) ──────────────────

function RowMenu({
    invited, cancelled, onResend, onRemind, onCancel, onDelete,
}: {
    invited: boolean;
    cancelled: boolean;
    onResend?: () => void;
    onRemind?: () => void;
    onCancel?: () => void;
    onDelete?: () => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    const Item = ({ Icon, label, onClick, danger }: { Icon: typeof Mail; label: string; onClick?: () => void; danger?: boolean }) => (
        <button type="button" onClick={() => { setOpen(false); onClick?.(); }}
            className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-semibold hover:bg-slate-50",
                danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700")}>
            <Icon size={13} /> {label}
        </button>
    );

    return (
        <div className="relative" ref={ref}>
            <button type="button" onClick={() => setOpen(o => !o)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-700">
                <MoreVertical size={15} />
            </button>
            {open && (
                <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    {!cancelled && <Item Icon={Mail} label={invited ? 'Resend invite' : 'Send invite'} onClick={onResend} />}
                    {!cancelled && invited && <Item Icon={Send} label="Send reminder" onClick={onRemind} />}
                    {!cancelled && <Item Icon={Ban} label="Cancel application" onClick={onCancel} />}
                    <Item Icon={Trash2} label="Delete application" onClick={onDelete} danger />
                </div>
            )}
        </div>
    );
}

// ── Ask / Order — request a specific step, document, key number, or e-signature ──

const ASK_CHANNELS: { id: 'email' | 'in_app' | 'sms'; label: string; Icon: typeof Mail }[] = [
    { id: 'email', label: 'Email', Icon: Mail },
    { id: 'in_app', label: 'In-app', Icon: MessageSquare },
    { id: 'sms', label: 'SMS', Icon: Phone },
];

type AskTarget = 'step' | 'document' | 'keynumber' | 'signature';
const ASK_TARGETS: { id: AskTarget; label: string; Icon: typeof Mail }[] = [
    { id: 'step', label: 'Form / Step', Icon: FileText },
    { id: 'document', label: 'Document', Icon: Paperclip },
    { id: 'keynumber', label: 'Key Number', Icon: Hash },
    { id: 'signature', label: 'E-Signature', Icon: PenTool },
];
export const ITEM_KIND_META: Record<NonNullable<ApplicationRequest['itemKind']>, { label: string; Icon: typeof Mail; cls: string }> = {
    step: { label: 'Form / Step', Icon: FileText, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    document: { label: 'Document', Icon: Paperclip, cls: 'bg-violet-50 text-violet-700 border-violet-200' },
    keynumber: { label: 'Key Number', Icon: Hash, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    signature: { label: 'E-Signature', Icon: PenTool, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

function defaultAskMessage(target: AskTarget, name: string): string {
    switch (target) {
        case 'step': return name ? `Please complete and resubmit the "${name}" step.` : 'Please complete the requested step.';
        case 'document': return name ? `Please upload your ${name}.` : 'Please upload the requested document.';
        case 'keynumber': return name ? `Please provide your ${name} (number${''}).` : 'Please provide the requested number.';
        case 'signature': return name ? `Please review and e-sign "${name}".` : 'Please provide your e-signature.';
    }
}

export function AskOrderModal({
    applicant, steps, formById, requests, onSend, onClose,
}: {
    applicant: Applicant;
    steps: TemplateStep[];
    formById: Map<string, ApplicationFormDef>;
    requests: HiringApplication['requests'];
    onSend: (req: RequestInput) => void;
    onClose: () => void;
}) {
    const items = useMemo(() => templateAskItems(steps, formById), [steps, formById]);
    const [target, setTarget] = useState<AskTarget>('step');
    const [stepId, setStepId] = useState('');
    const [docId, setDocId] = useState('');
    const [knId, setKnId] = useState('');
    const [sigId, setSigId] = useState('');
    const [channel, setChannel] = useState<'email' | 'in_app' | 'sms'>('email');
    const [message, setMessage] = useState('');
    const [touched, setTouched] = useState(false);

    // Resolve the selected item's id + name for the active target — always
    // sourced from what the template actually collects.
    const resolved = (() => {
        if (target === 'step') {
            const s = steps.find(x => x.id === stepId);
            return { id: stepId || undefined, name: s ? labelForTemplateStep(s, formById) : '', targetStepId: stepId || undefined, ready: !!stepId };
        }
        if (target === 'document') {
            const d = items.documents.find(x => x.id === docId);
            return { id: docId || undefined, name: d?.name ?? '', targetStepId: undefined, ready: !!docId };
        }
        if (target === 'keynumber') {
            const k = items.keyNumbers.find(x => x.id === knId);
            return { id: knId || undefined, name: k?.name ?? '', targetStepId: undefined, ready: !!knId };
        }
        // signature — pick a consent / signature item from the template
        const sig = items.signatures.find(x => x.id === sigId);
        const isStep = steps.some(x => x.id === sigId && x.kind === 'consent');
        return { id: sigId || undefined, name: sig?.name ?? '', targetStepId: isStep ? sigId : undefined, ready: !!sigId };
    })();

    // Keep the message in sync with the selection until the user edits it.
    const effectiveMessage = touched ? message : defaultAskMessage(target, resolved.name);

    const pickTarget = (t: AskTarget) => { setTarget(t); setTouched(false); };

    const canSend = resolved.ready && effectiveMessage.trim().length > 0;
    const send = () => {
        if (!canSend) return;
        onSend({
            kind: target === 'document' ? 'document' : 'detail',
            itemKind: target,
            itemId: resolved.id,
            itemName: resolved.name || ITEM_KIND_META[target].label,
            targetStepId: resolved.targetStepId,
            message: effectiveMessage.trim(),
            channel,
            sentBy: 'You',
        });
        onClose();
    };

    const selectCls = "h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm focus:border-blue-500 focus:outline-none";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={onClose}>
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ask / Order from driver</p>
                        <h3 className="mt-0.5 text-base font-bold text-slate-900">{applicant.firstName} {applicant.lastName}</h3>
                        <p className="mt-0.5 text-[12px] text-slate-500">Request a specific step, document, key number, or e-signature.</p>
                    </div>
                    <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><XIcon size={16} /></button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/40 px-6 py-5">
                    {/* What to request */}
                    <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">What do you need?</label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {ASK_TARGETS.map(t => {
                                const active = target === t.id;
                                return (
                                    <button key={t.id} type="button" onClick={() => pickTarget(t.id)}
                                        className={cn('flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-2.5 text-[11px] font-bold transition-all',
                                            active ? 'border-blue-500 bg-blue-50/60 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300')}>
                                        <t.Icon size={16} /> {t.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Item picker for the active target — only items the template collects */}
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            {target === 'step' ? 'Which form / step'
                                : target === 'document' ? 'Which document'
                                    : target === 'keynumber' ? 'Which key number'
                                        : 'Which e-signature'}
                            <span className="ml-1 font-normal normal-case text-slate-400">· from this template</span>
                        </label>
                        {target === 'step' && (
                            <select value={stepId} onChange={e => { setStepId(e.target.value); setTouched(false); }} className={selectCls}>
                                <option value="">Select a step…</option>
                                {steps.map(s => <option key={s.id} value={s.id}>{labelForTemplateStep(s, formById)}</option>)}
                            </select>
                        )}
                        {target === 'document' && (
                            items.documents.length === 0
                                ? <EmptyItems label="documents" />
                                : <select value={docId} onChange={e => { setDocId(e.target.value); setTouched(false); }} className={selectCls}>
                                    <option value="">Select a document…</option>
                                    {items.documents.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                        )}
                        {target === 'keynumber' && (
                            items.keyNumbers.length === 0
                                ? <EmptyItems label="key numbers" />
                                : <select value={knId} onChange={e => { setKnId(e.target.value); setTouched(false); }} className={selectCls}>
                                    <option value="">Select a key number…</option>
                                    {items.keyNumbers.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                                </select>
                        )}
                        {target === 'signature' && (
                            items.signatures.length === 0
                                ? <EmptyItems label="e-signatures" />
                                : <select value={sigId} onChange={e => { setSigId(e.target.value); setTouched(false); }} className={selectCls}>
                                    <option value="">Select a consent to sign…</option>
                                    {items.signatures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                        )}
                    </div>

                    {/* Message */}
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Message to driver</label>
                        <textarea value={effectiveMessage} onChange={e => { setMessage(e.target.value); setTouched(true); }} rows={3}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                    </div>

                    {/* Channel */}
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Send via</label>
                        <div className="flex items-center gap-1.5">
                            {ASK_CHANNELS.map(c => (
                                <button key={c.id} type="button" onClick={() => setChannel(c.id)}
                                    className={cn('inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-[12px] font-semibold', channel === c.id ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}>
                                    <c.Icon size={13} /> {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {requests.length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">Previous requests · {requests.length}</p>
                            <ul className="space-y-2">
                                {requests.map(r => <RequestLine key={r.id} r={r} />)}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-3">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Close</button>
                    <button type="button" onClick={send} disabled={!canSend}
                        className={cn('flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold text-white shadow-sm', canSend ? 'bg-blue-600 hover:bg-blue-700' : 'cursor-not-allowed bg-slate-300')}>
                        <Send className="h-4 w-4" /> Send request
                    </button>
                </div>
            </div>
        </div>
    );
}

function EmptyItems({ label }: { label: string }) {
    return (
        <div className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-2.5 text-[12px] text-slate-400">
            This template doesn't collect any {label}.
        </div>
    );
}

/** One row in a "previous requests" list — shows the targeted item + status. */
export function RequestLine({ r }: { r: ApplicationRequest }) {
    const meta = r.itemKind ? ITEM_KIND_META[r.itemKind] : null;
    return (
        <li className="flex items-start gap-2 text-[12px]">
            <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', r.status === 'open' ? 'bg-amber-400' : 'bg-emerald-400')} />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    {meta && (
                        <span className={cn('inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold', meta.cls)}>
                            <meta.Icon size={9} /> {meta.label}
                        </span>
                    )}
                    {r.itemName && <span className="truncate text-[12px] font-semibold text-slate-800">{r.itemName}</span>}
                </div>
                <p className="text-slate-600">{r.message}</p>
                <p className="text-[10px] text-slate-400">via {r.channel} · {new Date(r.sentAt).toLocaleDateString()} · {r.status}</p>
            </div>
        </li>
    );
}

// ── KPI tile ─────────────────────────────────────────────────────────────

function KpiTile({
    label, value, accent, tone, Icon, active, onClick,
}: {
    label: string;
    value: number | string;
    accent: string;
    tone?: string;
    Icon?: React.ComponentType<{ className?: string; size?: number }>;
    active?: boolean;
    onClick?: () => void;
}) {
    const interactive = !!onClick;
    const Cmp = interactive ? "button" : "div";
    return (
        <Cmp
            type={interactive ? "button" : undefined}
            onClick={onClick}
            className={cn(
                "text-left rounded-xl border bg-white p-3 shadow-sm transition-all",
                interactive && "hover:shadow-md",
                active ? "border-blue-300 ring-2 ring-blue-200" : "border-slate-200",
            )}
        >
            <div className="flex items-center gap-2 mb-1.5">
                <span className={cn("h-2 w-2 rounded-full", accent)} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
            </div>
            <div className="flex items-baseline justify-between">
                <span className={cn("text-2xl font-black tabular-nums leading-none", tone ?? "text-slate-800")}>
                    {value}
                </span>
                {Icon && <Icon className="w-4 h-4 text-slate-300" />}
            </div>
        </Cmp>
    );
}
