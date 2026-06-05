import { useMemo, useState } from "react";
import {
    ListChecks, Search, Filter, ChevronDown, Check, X as XIcon,
    UserCheck, AlertTriangle, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    loadApplicants, getApplication,
    type HiringApplication,
} from "./hiring-application.data";
import { loadApplicationForms, type ApplicationFormDef } from "./application-forms.data";
import { loadTemplates, type DriverHiringTemplate } from "@/pages/settings/driver-hiring-templates.data";
import { computeDqFile, type DqFileResult, type DqStatus } from "./dq-file-checklist";
import {
    loadDqProfiles, loadDqOverrides, setDqOverride, resolveDqProfile,
    DQ_DRIVER_TYPES, type DqProfile, type DqDriverType,
} from "./dq-profiles.data";
import { DqChecklistBuilder } from "./DqChecklistBuilder";
import { STAGE_META, TONE_CLS, type Applicant, type Stage } from "./ats.data";
import { ACCOUNTS_DB } from "@/pages/accounts/accounts.data";
import { Settings2 } from "lucide-react";

interface DqRow { applicant: Applicant; app?: HiringApplication; dq: DqFileResult; carrier: string; profile?: DqProfile; auto: boolean; type: DqDriverType }

/**
 * DQ Files roster — every driver in the hiring pipeline with a LIVE Driver
 * Qualification file completion %. Click a driver to expand the full checklist
 * (present / missing / n-a per item). One source of truth: `computeDqFile`.
 */
export function DqFilesPage({ onNavigate }: { onNavigate?: (path: string) => void } = {}) {
    const [search, setSearch] = useState("");
    const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'incomplete' | 'complete'>('all');
    const [openId, setOpenId] = useState<string | null>(null);
    const [builderOpen, setBuilderOpen] = useState(false);
    const [refresh, setRefresh] = useState(0);
    const bump = () => setRefresh(n => n + 1);

    const profiles = useMemo(() => loadDqProfiles(), [refresh]);
    const overrides = useMemo(() => loadDqOverrides(), [refresh]);

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
            const dq = computeDqFile(a, app, tpl?.steps ?? [], formById, profile?.sections);
            return { applicant: a, app, dq, carrier: carrierName(app?.carrierId), profile, auto, type };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formById, tplById, profiles, overrides]);

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

    const kpis = useMemo(() => {
        const total = rows.length;
        const complete = rows.filter(r => r.dq.rollup.required > 0 && r.dq.rollup.missing === 0).length;
        const avg = total ? Math.round(rows.reduce((s, r) => s + r.dq.pct, 0) / total) : 0;
        const missing = rows.reduce((s, r) => s + r.dq.rollup.missing, 0);
        return { total, complete, avg, missing };
    }, [rows]);

    return (
        <div className="flex-1 bg-slate-50 min-h-screen">
            <div className="px-8 pt-6 pb-4">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"><ListChecks size={20} /></span>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">DQ Files</h1>
                            <p className="text-[12px] text-slate-500">Driver Qualification file completion across the hiring pipeline.</p>
                        </div>
                    </div>
                    <button type="button" onClick={() => setBuilderOpen(true)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-bold text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700">
                        <Settings2 size={15} /> Manage checklists
                    </button>
                </div>

                {/* KPIs */}
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Kpi label="Drivers" value={kpis.total} Icon={UserCheck} tone="blue" />
                    <Kpi label="DQ complete" value={kpis.complete} Icon={Check} tone="emerald" />
                    <Kpi label="Items missing" value={kpis.missing} Icon={AlertTriangle} tone="amber" />
                    <Kpi label="Avg completion" value={`${kpis.avg}%`} Icon={ListChecks} tone="violet" />
                </div>

                {/* Filters */}
                <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="relative min-w-[220px] flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by driver name..."
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none" />
                    </div>
                    <Select value={stageFilter} onChange={v => setStageFilter(v as Stage | 'all')}
                        options={[{ value: 'all', label: 'All stages' }, ...(Object.keys(STAGE_META) as Stage[]).map(s => ({ value: s, label: STAGE_META[s].label }))]} />
                    <Select value={statusFilter} onChange={v => setStatusFilter(v as 'all' | 'incomplete' | 'complete')}
                        options={[{ value: 'all', label: 'All DQ status' }, { value: 'incomplete', label: 'Incomplete' }, { value: 'complete', label: 'Complete' }]} />
                    <span className="ml-auto text-xs text-slate-500 tabular-nums">{filtered.length} of {rows.length}</span>
                </div>

                {/* Roster */}
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="hidden grid-cols-[minmax(0,1fr)_140px_140px_200px_120px] gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:grid">
                        <span>Driver</span><span>Carrier</span><span>Stage</span><span>DQ completion</span><span className="text-right">Action</span>
                    </div>
                    {filtered.length === 0 ? (
                        <div className="px-6 py-16 text-center text-sm text-slate-500">No drivers match the current filters.</div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {filtered.map(r => (
                                <DqRosterRow key={r.applicant.id} row={r} open={openId === r.applicant.id}
                                    onToggle={() => setOpenId(openId === r.applicant.id ? null : r.applicant.id)}
                                    onOpenFile={() => onNavigate?.('/ats')}
                                    profiles={profiles}
                                    onSetProfile={(pid) => { setDqOverride(r.applicant.id, pid); bump(); }} />
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {builderOpen && <DqChecklistBuilder onClose={() => { setBuilderOpen(false); bump(); }} />}
        </div>
    );
}

function DqRosterRow({ row, open, onToggle, onOpenFile, profiles, onSetProfile }: {
    row: DqRow; open: boolean; onToggle: () => void; onOpenFile: () => void;
    profiles: DqProfile[]; onSetProfile: (profileId: string | null) => void;
}) {
    const { applicant: a, dq, carrier, profile, auto, type } = row;
    const meta = STAGE_META[a.stage];
    const tone = TONE_CLS[meta.tone];
    const complete = dq.rollup.required > 0 && dq.rollup.missing === 0;
    return (
        <li>
            <div className="grid grid-cols-1 items-center gap-4 px-5 py-3.5 lg:grid-cols-[minmax(0,1fr)_140px_140px_200px_120px]">
                <div className="min-w-0">
                    <button type="button" onClick={onToggle} className="block truncate text-left text-[14px] font-semibold text-blue-600 hover:underline">
                        {a.firstName} {a.lastName}
                    </button>
                    <div className="text-[11px] text-slate-500"><span className="font-mono">{a.licenseType}</span> · Applied {a.appliedDate}</div>
                </div>
                <div className="truncate text-[12px] text-slate-600">{carrier}</div>
                <div>
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', tone.chip)}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} /> {meta.label}
                    </span>
                </div>
                <div>
                    <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
                        <span className={complete ? 'text-emerald-600' : 'text-slate-500'}>{complete ? 'Complete' : `${dq.rollup.missing} missing`}</span>
                        <span className="tabular-nums text-slate-400">{dq.pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={cn('h-full rounded-full', complete ? 'bg-emerald-500' : dq.pct > 50 ? 'bg-blue-500' : 'bg-amber-500')} style={{ width: `${dq.pct}%` }} />
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={onToggle}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                        Checklist <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
                    </button>
                    <button type="button" onClick={onOpenFile} title="Open hiring file"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-700">
                        <FileText size={14} />
                    </button>
                </div>
            </div>

            {open && (
                <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-4">
                    {/* Applied checklist profile + manual override */}
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div className="flex items-center gap-2 text-[12px]">
                            <span className="font-bold text-slate-700">Checklist:</span>
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">{profile?.name ?? 'None'}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {auto ? `Auto · ${DQ_DRIVER_TYPES.find(t => t.id === type)?.label ?? type}` : 'Manual override'}
                            </span>
                        </div>
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                            Apply checklist
                            <select value={auto ? '' : (profile?.id ?? '')} onChange={e => onSetProfile(e.target.value || null)}
                                className="h-8 rounded-md border border-slate-300 bg-white px-2 text-[12px] font-semibold text-slate-700 focus:border-blue-400 focus:outline-none">
                                <option value="">Auto (by driver type)</option>
                                {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </label>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {dq.sections.map(sec => (
                            <div key={sec.title} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                <div className="border-b border-slate-100 bg-slate-50/60 px-3 py-2 text-[11px] font-bold text-slate-700">{sec.title}</div>
                                <ul className="divide-y divide-slate-100">
                                    {sec.items.map((it, i) => (
                                        <li key={i} className="flex items-center gap-2 px-3 py-1.5">
                                            <DqDot status={it.status} />
                                            <span className={cn('flex-1 truncate text-[12px]', it.status === 'missing' ? 'font-semibold text-slate-800' : 'text-slate-600')}>{it.item.label}</span>
                                            <span className={cn('text-[10px] font-bold uppercase tracking-wider',
                                                it.status === 'present' ? 'text-emerald-600' : it.status === 'missing' ? 'text-rose-600' : 'text-slate-400')}>
                                                {it.status === 'na' ? 'N/A' : it.status}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </li>
    );
}

function DqDot({ status }: { status: DqStatus }) {
    if (status === 'present') return <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check size={11} strokeWidth={3} /></span>;
    if (status === 'missing') return <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-rose-600"><XIcon size={11} strokeWidth={3} /></span>;
    return <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-400">–</span>;
}

function Kpi({ label, value, Icon, tone }: { label: string; value: number | string; Icon: React.ElementType; tone: 'blue' | 'emerald' | 'amber' | 'violet' }) {
    const tones = {
        blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600', violet: 'bg-violet-50 text-violet-600',
    }[tone];
    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', tones)}><Icon size={17} /></span>
            <div>
                <div className="text-lg font-bold tabular-nums text-slate-900">{value}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
            </div>
        </div>
    );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
    return (
        <div className="relative">
            <Filter size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select value={value} onChange={e => onChange(e.target.value)}
                className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-[13px] font-semibold text-slate-700 focus:border-blue-400 focus:outline-none">
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
    );
}
