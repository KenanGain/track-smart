import { useMemo, useState, useEffect, useRef } from "react";
import {
    Briefcase, Search, Users, Inbox, Clock, UserCheck, UserX,
    ChevronDown, Check, Calendar, Building2, X as XIcon, AlertCircle,
    ListChecks, UserPlus, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    MOCK_APPLICANTS, STAGE_META, TONE_CLS,
    type Applicant, type Stage, type LicenseType,
} from "./ats.data";
import { ACCOUNTS_DB, type AccountRecord } from "@/pages/accounts/accounts.data";
import {
    loadTemplates, TEMPLATE_FORM_TYPES,
    type DriverHiringTemplate, type TemplateStep, type TemplateFormType,
} from "@/pages/settings/driver-hiring-templates.data";
import { loadApplicationForms, type ApplicationFormDef } from "./application-forms.data";
import { CONSENT_BY_ID, type ConsentCategory } from "./consent-forms.data";

// Applicants in the mock data don't carry a carrierId. For this view we map
// each applicant to a carrier deterministically by index so the carrier column
// is stable across renders and filterable. Swap to a real applicant.accountId
// once the backend is wired.
function carrierForApplicant(index: number): AccountRecord {
    return ACCOUNTS_DB[index % ACCOUNTS_DB.length];
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

interface Row {
    applicant: Applicant;
    carrier: AccountRecord;
    templateId: string;
}

export function AtsAssignmentsPage() {
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
        'app-002': 'tpl-default-application',// Tiger      — full application
        'app-003': 'tpl-local-regional',     // Dale       — short-haul
        'app-004': 'tpl-cdl-a-otr',          // Patrick    — CDL-A OTR
        // 'app-005' left unassigned (Clint Eastwood)
        'app-006': 'tpl-cross-border',       // Maria      — cross-border
        'app-007': 'tpl-cdl-a-otr',          // LeBron     — CDL-A OTR
        'app-008': 'tpl-hazmat-tanker',      // Serena     — hazmat
        // 'app-010' left unassigned
    }));

    const rows = useMemo<Row[]>(() => {
        return MOCK_APPLICANTS.map((applicant, i) => ({
            applicant,
            carrier: carrierForApplicant(i),
            templateId: overrides[applicant.id] ?? applicant.assignedTemplateId,
        }));
    }, [overrides]);

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
                            {assignedRows.map(r => (
                                <AssignmentRow
                                    key={r.applicant.id}
                                    row={r}
                                    templates={templates}
                                    templateById={templateById}
                                    formById={formById}
                                    onAssign={(tplId) =>
                                        setOverrides(o => ({ ...o, [r.applicant.id]: tplId }))
                                    }
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
                    </div>
                )}

                {activeTab === 'assign' && (
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
                )}
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

function AssignmentRow({
    row, templates, templateById, formById, onAssign,
}: {
    row: Row;
    templates: DriverHiringTemplate[];
    templateById: Map<string, DriverHiringTemplate>;
    formById: Map<string, ApplicationFormDef>;
    onAssign: (templateId: string) => void;
}) {
    const { applicant, carrier, templateId } = row;
    const stageMeta = STAGE_META[applicant.stage];
    const stageTone = TONE_CLS[stageMeta.tone];
    const tpl = templateById.get(templateId);

    const templateSteps = tpl?.steps ?? [];
    const statuses = useMemo(
        () => templateProgressFor(applicant, templateSteps.length),
        [applicant, templateSteps.length],
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

    const initials = `${applicant.firstName[0] ?? ""}${applicant.lastName[0] ?? ""}`.toUpperCase();

    return (
        <div className="px-5 py-4 hover:bg-slate-50/40 transition-colors">
            {/* Top row — driver identity + carrier + stage */}
            <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 text-sm font-bold flex items-center justify-center shrink-0">
                        {initials || "?"}
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-bold text-blue-700 truncate">
                            {applicant.firstName} {applicant.lastName}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                            <span className="font-semibold text-slate-600">{applicant.licenseType}</span>
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
                    <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border",
                        stageTone.chip, stageTone.border,
                    )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", stageTone.dot)} />
                        {stageMeta.label}
                    </span>
                    <span className="text-[11px] text-slate-500 tabular-nums">{applicant.daysInPipeline}d</span>
                </div>
            </div>

            {/* Bottom row — template picker + progress */}
            <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,260px)_1fr] gap-4 items-start">
                <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Hiring template
                    </div>
                    <TemplatePicker current={tpl} templates={templates} onSelect={onAssign} />
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
                            <ProgressBar
                                statuses={statuses}
                                steps={templateSteps}
                                formById={formById}
                                isStuck={isStuck}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Numbered-bubble progress tracker ─────────────────────────────────────
// Each step is a small numbered circle connected by a line. Scales cleanly
// from 5 to 25+ steps. Hover a bubble for its full step name.

function ProgressBar({
    statuses, steps, formById, isStuck,
}: {
    statuses: TStatus[];
    steps: TemplateStep[];
    formById: Map<string, ApplicationFormDef>;
    isStuck: boolean;
}) {
    const bubbleFor = (s: TStatus) => {
        if (s === 'completed')   return 'bg-emerald-500 border-emerald-500 text-white';
        if (s === 'in_progress') return isStuck
            ? 'bg-rose-500 border-rose-500 text-white ring-2 ring-rose-200'
            : 'bg-blue-500 border-blue-500 text-white ring-2 ring-blue-200 animate-pulse';
        if (s === 'failed')      return 'bg-rose-500 border-rose-500 text-white';
        return 'bg-white border-slate-300 text-slate-400';
    };
    const connectorFor = (left: TStatus, right: TStatus) => {
        if (left === 'completed' && (right === 'completed' || right === 'in_progress' || right === 'failed')) {
            return right === 'failed' ? 'bg-rose-300' : 'bg-emerald-400';
        }
        if (left === 'completed') return 'bg-emerald-300';
        if (left === 'failed' || right === 'failed') return 'bg-rose-200';
        return 'bg-slate-200';
    };
    const iconFor = (s: TStatus, i: number) => {
        if (s === 'completed')   return <Check size={10} strokeWidth={3} />;
        if (s === 'failed')      return <XIcon size={10} strokeWidth={3} />;
        if (s === 'in_progress') return <span className="block h-1 w-1 rounded-full bg-white" />;
        return <span className="text-[9px] font-bold tabular-nums leading-none">{i + 1}</span>;
    };

    return (
        <div className="flex items-center w-full">
            {steps.map((step, i) => {
                const isLast = i === steps.length - 1;
                const status = statuses[i] ?? 'not_started';
                const nextStatus = statuses[i + 1] ?? 'not_started';
                const label = labelForTemplateStep(step, formById);
                return (
                    <div key={step.id} className="flex items-center flex-1 last:flex-none min-w-0">
                        <div
                            className={cn(
                                'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                                bubbleFor(status),
                            )}
                            title={`${i + 1}. ${label} · ${status.replace('_', ' ')}`}
                        >
                            {iconFor(status, i)}
                        </div>
                        {!isLast && (
                            <div className={cn('flex-1 h-0.5 mx-0.5', connectorFor(status, nextStatus))} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── Template picker (dropdown) ───────────────────────────────────────────

function TemplatePicker({
    current, templates, onSelect,
}: {
    current: DriverHiringTemplate | undefined;
    templates: DriverHiringTemplate[];
    onSelect: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    return (
        <div className="relative inline-block w-full" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full inline-flex items-center justify-between gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white text-left text-xs font-semibold text-slate-800 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
            >
                <span className="truncate">
                    {current ? current.name : <span className="text-slate-400 italic font-normal">Not assigned</span>}
                </span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
            </button>
            {current && (
                <div className="mt-1 text-[10px] text-slate-500">
                    {current.steps.length} step{current.steps.length === 1 ? "" : "s"}
                    {current.isDefault && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[9px]">
                            Default
                        </span>
                    )}
                </div>
            )}
            {open && (
                <div className="absolute z-20 mt-1 w-72 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                    {templates.length === 0 && (
                        <div className="px-3 py-2 text-xs text-slate-500">No templates available.</div>
                    )}
                    {templates.map(t => {
                        const isSelected = current?.id === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => { onSelect(t.id); setOpen(false); }}
                                className={cn(
                                    "w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-slate-50 transition-colors",
                                    isSelected && "bg-blue-50/60",
                                )}
                            >
                                <Check size={14} className={cn("mt-0.5 shrink-0", isSelected ? "text-blue-600" : "text-transparent")} />
                                <div className="min-w-0">
                                    <div className="text-xs font-semibold text-slate-800 truncate">
                                        {t.name}
                                        {t.isDefault && (
                                            <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">Default</span>
                                        )}
                                    </div>
                                    <div className="text-[11px] text-slate-500 truncate">
                                        {t.steps.length} step{t.steps.length === 1 ? "" : "s"}
                                        {t.description ? ` · ${t.description}` : ""}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
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
