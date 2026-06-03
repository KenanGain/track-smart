import { useEffect, useMemo, useState } from 'react';
import {
    Network, Building2, Truck, User, ShieldAlert, FileText, Search, Filter,
    ChevronDown, ChevronLeft, ChevronRight, Link2, Check, RotateCcw, CheckCircle2, Circle,
    LayoutTemplate, Lock, Pencil, X, Save, Crown, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubTabs, type SubTab } from '@/components/ui/SubTabs';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import {
    SEED_KEY_NUMBERS, DOCUMENTS, KEY_NUMBER_GROUPS,
    type KeyNumberGroup, type DocumentsSubTabId, type RelatedToScope,
    type KeyNumberRow, type DocumentRow,
} from './ComplianceAndDocumentsPage';
import {
    loadCarrierAssignment, saveCarrierAssignment, applyToggle, applyBulk, defaultAssignmentFor,
    loadTemplates, selectedTemplateIds, applyTemplates, stackTemplateOnto, mergeTemplateMonitoring,
    DOC_IDS_BY_KN_ID, KN_ID_BY_DOC_ID, isSystemFormDoc,
    loadHandover, setHandover as persistHandover,
    type CarrierComplianceAssignment, type ComplianceTemplate, type TemplateHandover,
} from './carrier-compliance.data';
import { ACCOUNTS_DB, getAccountsByServiceProfileId } from '@/pages/accounts/accounts.data';
import { loadMonitoringConfigs, saveMonitoringConfigs, monitorItemKey, reminderSummary, DEFAULT_MONITORING, type MonitoringConfig } from '@/pages/compliance/compliance-monitoring.data';
import { MonitoringNotificationsForm } from '@/components/compliance/MonitoringNotificationsForm';
import { DocumentFormPreviewModal } from '@/components/compliance/DocumentFormPreviewModal';
import { SERVICE_PROFILES_DB } from '@/pages/accounts/service-profiles.data';
import {
    loadTemplates as loadHiringTemplates,
    type DriverHiringTemplate,
} from '@/pages/settings/driver-hiring-templates.data';

/**
 * Super Admin → Carrier Compliance Setup.
 *
 * Per-carrier on/off switches over the system-wide catalog. Toggling a row
 * whose entry has a linkage cascades to the other side (KN ↔ Document) so
 * paired items always travel together. The catalog itself is not editable
 * here — that's the Compliance and Documents page.
 */

type PageMode = 'compliance' | 'documents' | 'monitoring' | 'assigned' | 'templates';

const RELATED_TO_ICON: Record<RelatedToScope, React.ComponentType<{ size?: number; className?: string }>> = {
    Carrier: Building2,
    Asset:   Truck,
    Driver:  User,
};

const SCOPE_ICON: Record<Exclude<DocumentsSubTabId, 'all'>, React.ComponentType<{ size?: number; className?: string }>> = {
    carrier:   Building2,
    asset:     Truck,
    driver:    User,
    accidents: FileText,
    violation: ShieldAlert,
};

const SCOPE_LABEL: Record<Exclude<DocumentsSubTabId, 'all'>, string> = {
    carrier:   'Carrier',
    asset:     'Asset',
    driver:    'Driver',
    accidents: 'Accidents',
    violation: 'Violation',
};

// ── Sub-tabs with enabled-count badges ────────────────────────────────

function withCount<T extends string>(
    tabs: SubTab<T>[],
    counts: Record<T, { enabled: number; total: number }>,
): SubTab<T>[] {
    return tabs.map(t => ({
        ...t,
        label: `${t.label}  ${counts[t.id].enabled}/${counts[t.id].total}`,
    }));
}

// ── Cascade toast ─────────────────────────────────────────────────────

function CascadeToast({ messages, onDismiss }: {
    messages: string[];
    onDismiss: () => void;
}) {
    useEffect(() => {
        if (messages.length === 0) return;
        const t = setTimeout(onDismiss, 4000);
        return () => clearTimeout(t);
    }, [messages, onDismiss]);

    if (messages.length === 0) return null;
    return (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50 max-w-sm space-y-1.5">
            {messages.map((m, i) => (
                <div
                    key={i}
                    className="pointer-events-auto flex items-start gap-2 rounded-lg border border-blue-200 bg-white px-4 py-3 text-[12px] text-slate-700 shadow-lg"
                >
                    <Link2 size={14} className="mt-0.5 shrink-0 text-blue-600" />
                    <span>{m}</span>
                </div>
            ))}
        </div>
    );
}

/** Pretty label for a hiring-template formType id (e.g. `hiring-driver` → `Hiring Driver`). */
export function formTypeLabel(id: string): string {
    return id
        .split('-')
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
}

// ── Templates panel (full-width view inside the Templates switch tab) ──

/**
 * Templates view for the current carrier. Lists every available template
 * (built-in + custom) as cards with apply buttons. The active applied
 * template is highlighted; drift surfaces inline. Useful when the admin
 * wants to see all options at once instead of cycling the dropdown.
 */
export function TemplatesPanel({
    hiringTemplates, formType, formTypeOptions, onFormTypeChange,
    enabledHiringIds, onToggleHiring, onBulkHiring,
}: {
    hiringTemplates: DriverHiringTemplate[];
    formType: string;
    formTypeOptions: { id: string; label: string }[];
    onFormTypeChange: (id: string) => void;
    enabledHiringIds: string[];
    onToggleHiring: (id: string, enabled: boolean) => void;
    onBulkHiring: (enable: boolean) => void;
}) {
    const enabledSet = new Set(enabledHiringIds);
    const allOn  = enabledSet.size === hiringTemplates.length && hiringTemplates.length > 0;
    const allOff = enabledSet.size === 0;

    return (
        <div className="px-6 py-5">
            {/* ── Hiring Templates (ATS pipelines) ────────────────────────── */}
            <section className="space-y-4">
                {/* Form type filter + bulk actions */}
                <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex flex-col">
                        <label className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Form type
                        </label>
                        <select
                            value={formType}
                            onChange={(e) => onFormTypeChange(e.target.value)}
                            className="h-10 w-56 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            {formTypeOptions.map(o => (
                                <option key={o.id} value={o.id}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700">
                            {enabledSet.size}<span className="text-slate-400">/{hiringTemplates.length}</span>{' '}
                            <span className="font-normal text-slate-500">enabled</span>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onBulkHiring(true)}
                            disabled={allOn}
                            className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                        >
                            <CheckCircle2 size={14} /> Enable all
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onBulkHiring(false)}
                            disabled={allOff}
                            className="gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                        >
                            <Circle size={14} /> Disable all
                        </Button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    {hiringTemplates.length === 0 ? (
                        <div className="px-4 py-12 text-center">
                            <p className="text-sm font-medium text-slate-700">No hiring templates defined yet</p>
                            <p className="mt-1 text-[12px] text-slate-500">Create templates in Super Admin → Hiring Templates (ATS).</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {hiringTemplates.map(t => {
                                const enabled = enabledSet.has(t.id);
                                return (
                                    <li
                                        key={t.id}
                                        onClick={() => onToggleHiring(t.id, !enabled)}
                                        className={cn(
                                            "group relative flex cursor-pointer items-center gap-3 py-3 pl-5 pr-4 transition-colors",
                                            enabled ? "bg-white hover:bg-blue-50/40" : "bg-slate-50/60 hover:bg-slate-100/70",
                                        )}
                                    >
                                        {/* Left accent bar — enabled rows only */}
                                        <span className={cn(
                                            "absolute inset-y-0 left-0 w-1",
                                            enabled ? "bg-blue-500" : "bg-transparent",
                                        )} />
                                        <span className={cn(
                                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                                            enabled ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400",
                                        )}>
                                            <LayoutTemplate size={15} />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <span className={cn(
                                                    "text-sm font-semibold",
                                                    enabled ? "text-slate-900" : "text-slate-500",
                                                )}>
                                                    {t.name}
                                                </span>
                                                {t.isDefault && (
                                                    <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                                        Default
                                                    </span>
                                                )}
                                                <span className="text-[11px] tabular-nums text-slate-500">
                                                    {t.steps.length} step{t.steps.length === 1 ? '' : 's'}
                                                </span>
                                            </div>
                                            <p className={cn(
                                                "mt-0.5 text-[12px] leading-snug",
                                                enabled ? "text-slate-500" : "text-slate-400",
                                            )}>
                                                {t.description}
                                            </p>
                                        </div>
                                        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                                            <Toggle
                                                checked={enabled}
                                                onCheckedChange={(v) => onToggleHiring(t.id, v)}
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </section>
        </div>
    );
}

// ── Bulk-action toolbar (Enable all / Disable all in the current view) ─

function BulkBar({ visibleCount, enabledInView, query, onQueryChange, onEnableAll, onDisableAll, placeholder }: {
    visibleCount: number;
    enabledInView: number;
    query: string;
    onQueryChange: (q: string) => void;
    onEnableAll: () => void;
    onDisableAll: () => void;
    placeholder: string;
}) {
    const allOn = enabledInView === visibleCount && visibleCount > 0;
    const allOff = enabledInView === 0;
    const pct = visibleCount === 0 ? 0 : Math.round((enabledInView / visibleCount) * 100);

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
                        <input
                            value={query}
                            onChange={(e) => onQueryChange(e.target.value)}
                            placeholder={placeholder}
                            className="h-9 w-72 rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        <Filter size={13} /> Filter <ChevronDown size={12} />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all",
                                    allOff ? "bg-slate-300" : allOn ? "bg-emerald-500" : "bg-blue-500",
                                )}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <span className="text-[12px] font-semibold text-slate-700">
                            {enabledInView}<span className="text-slate-400">/{visibleCount}</span>
                        </span>
                        <span className="text-[11px] text-slate-500">enabled</span>
                    </div>
                    <button
                        type="button"
                        onClick={onEnableAll}
                        disabled={allOn || visibleCount === 0}
                        className={cn(
                            "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[12px] font-semibold transition-colors",
                            allOn || visibleCount === 0
                                ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                                : "border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50",
                        )}
                    >
                        <CheckCircle2 size={14} /> Enable all
                    </button>
                    <button
                        type="button"
                        onClick={onDisableAll}
                        disabled={allOff}
                        className={cn(
                            "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[12px] font-semibold transition-colors",
                            allOff
                                ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                                : "border-rose-300 bg-white text-rose-700 hover:bg-rose-50",
                        )}
                    >
                        <Circle size={14} /> Disable all
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Related-To filter chips (with count bubbles) ──────────────────────

function RelatedToFilterRow({ value, counts, onChange }: {
    value: 'all' | RelatedToScope;
    counts: Record<'all' | RelatedToScope, number>;
    onChange: (v: 'all' | RelatedToScope) => void;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-4 py-2.5">
            <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <Filter size={12} /> Related to
            </span>
            {([
                { id: 'all',     label: 'All' },
                { id: 'Carrier', label: 'Carrier' },
                { id: 'Asset',   label: 'Asset' },
                { id: 'Driver',  label: 'Driver' },
            ] as const).map(opt => {
                const active = value === opt.id;
                const Icon = opt.id === 'all' ? null : RELATED_TO_ICON[opt.id];
                return (
                    <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChange(opt.id)}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors",
                            active ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                        )}
                    >
                        {Icon && <Icon size={12} className={active ? "text-blue-600" : "text-slate-400"} />}
                        {opt.label}
                        <span className={cn(
                            "inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                            active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500",
                        )}>
                            {counts[opt.id]}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// ── Key Numbers panel ─────────────────────────────────────────────────

/** Inline monitoring controls passed to the assignment tables (combined view). */
type RowMonitoring = {
    cfgFor: (key: string) => MonitoringConfig;
    onToggle: (key: string, on: boolean) => void;
    onEdit: (key: string, name: string) => void;
};

/** A compact monitoring cell — toggle + reminder summary + edit pencil; "—" when the item carries no date. */
function MonitoringCell({ itemKey, name, dateBearing, mon }: {
    itemKey: string; name: string; dateBearing: boolean; mon: RowMonitoring;
}) {
    if (!dateBearing) return <span className="text-[12px] text-slate-300">—</span>;
    const cfg = mon.cfgFor(itemKey);
    return (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Toggle checked={cfg.enabled} onCheckedChange={(v) => mon.onToggle(itemKey, v)} />
            {cfg.enabled
                ? <span className="text-[11px] text-slate-500">{reminderSummary(cfg)}</span>
                : <span className="text-[11px] text-slate-400">Off</span>}
            <button type="button" onClick={() => mon.onEdit(itemKey, name)} title="Edit monitoring settings"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
                <Pencil size={13} />
            </button>
        </div>
    );
}

// ── Shared list pagination ────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];

/** Bottom pagination footer with a rows-per-page selector (5 → 100). */
function TablePagination({ total, page, perPage, onPageChange, onPerPageChange }: {
    total: number;
    page: number;
    perPage: number;
    onPageChange: (p: number) => void;
    onPerPageChange: (n: number) => void;
}) {
    const pageCount = Math.max(1, Math.ceil(total / perPage));
    const safePage = Math.min(Math.max(1, page), pageCount);
    const start = total === 0 ? 0 : (safePage - 1) * perPage + 1;
    const end = Math.min(safePage * perPage, total);
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/40 px-4 py-2.5">
            <div className="flex items-center gap-2 text-[12px] text-slate-500">
                <span className="font-medium">Rows per page</span>
                <select
                    value={perPage}
                    onChange={(e) => onPerPageChange(Number(e.target.value))}
                    className="h-8 rounded-md border border-slate-300 bg-white px-2 text-[12px] font-semibold text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="ml-1">
                    Showing <span className="font-semibold text-slate-700">{start}–{end}</span> of {total}
                </span>
            </div>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onPageChange(safePage - 1)}
                    disabled={safePage <= 1}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                    <ChevronLeft size={14} /> Prev
                </button>
                <span className="px-2 text-[12px] font-medium text-slate-500">{safePage} / {pageCount}</span>
                <button
                    type="button"
                    onClick={() => onPageChange(safePage + 1)}
                    disabled={safePage >= pageCount}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                    Next <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}

export function KeyNumbersAssignment({ enabledIds, onToggle, onBulk, monitoring, visibleIds }: {
    enabledIds: Set<string>;
    onToggle: (id: string, enabled: boolean) => void;
    onBulk: (ids: string[], enable: boolean) => void;
    monitoring?: RowMonitoring;
    /** When set, restrict the list to these ids (e.g. Settings: only root-enabled items). */
    visibleIds?: Set<string>;
}) {
    const [activeGroup, setActiveGroup] = useState<KeyNumberGroup | 'all'>('all');
    const [query, setQuery] = useState('');
    const [relatedFilter, setRelatedFilter] = useState<'all' | RelatedToScope>('all');

    // Per-group counts for the tab badges ('all' is the running total across groups).
    const counts = useMemo(() => {
        const out = {} as Record<KeyNumberGroup | 'all', { enabled: number; total: number }>;
        out.all = { enabled: 0, total: 0 };
        for (const g of KEY_NUMBER_GROUPS) out[g] = { enabled: 0, total: 0 };
        for (const k of SEED_KEY_NUMBERS) {
            if (k.status !== 'Active') continue;   // only Active numbers are assignable
            if (visibleIds && !visibleIds.has(k.id)) continue;
            out.all.total += 1;
            out[k.group].total += 1;
            if (enabledIds.has(k.id)) { out.all.enabled += 1; out[k.group].enabled += 1; }
        }
        return out;
    }, [enabledIds, visibleIds]);

    const groupTabs: SubTab<KeyNumberGroup | 'all'>[] = useMemo(() => {
        const base: SubTab<KeyNumberGroup | 'all'>[] = [
            { id: 'all', label: 'All' },
            ...KEY_NUMBER_GROUPS.map(g => ({ id: g, label: g })),
        ];
        return withCount(base, counts);
    }, [counts]);

    // Per-Related-To counts within the active group, for the filter bubbles.
    const relatedCounts = useMemo(() => {
        const c: Record<'all' | RelatedToScope, number> = { all: 0, Carrier: 0, Asset: 0, Driver: 0 };
        for (const k of SEED_KEY_NUMBERS) {
            if (visibleIds && !visibleIds.has(k.id)) continue;
            if (activeGroup !== 'all' && k.group !== activeGroup) continue;
            c.all += 1;
            c[k.relatedTo] += 1;
        }
        return c;
    }, [activeGroup, visibleIds]);

    const q = query.trim().toLowerCase();
    const rows = SEED_KEY_NUMBERS
        .filter(k => !visibleIds || visibleIds.has(k.id))
        .filter(k => activeGroup === 'all' || k.group === activeGroup)
        .filter(k => relatedFilter === 'all' || k.relatedTo === relatedFilter)
        .filter(k => !q
            || k.name.toLowerCase().includes(q)
            || k.description.toLowerCase().includes(q));

    // Only Active catalog items are assignable to a carrier; Inactive rows are
    // shown read-only and excluded from the bulk actions and the progress count.
    const activeRows = rows.filter(r => r.status === 'Active');
    const enabledInView = activeRows.filter(r => enabledIds.has(r.id)).length;

    // Pagination (rows-per-page 5 → 100). Reset to page 1 when the view changes.
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    useEffect(() => { setPage(1); }, [activeGroup, relatedFilter, q, perPage]);
    const pageRows = rows.slice((page - 1) * perPage, (page - 1) * perPage + perPage);

    // "How the input form looks" preview + inline editor for a key number.
    const [previewKn, setPreviewKn] = useState<KeyNumberRow | null>(null);
    const [, setRefresh] = useState(0);

    return (
        <div>
            <div className="border-b border-slate-100 bg-white px-6">
                <SubTabs
                    tabs={groupTabs}
                    activeId={activeGroup}
                    onChange={(id) => setActiveGroup(id)}
                    bordered={false}
                />
            </div>

            <div className="space-y-3 px-6 py-5">
                <BulkBar
                    visibleCount={activeRows.length}
                    enabledInView={enabledInView}
                    query={query}
                    onQueryChange={setQuery}
                    onEnableAll={() => onBulk(activeRows.map(r => r.id), true)}
                    onDisableAll={() => onBulk(activeRows.map(r => r.id), false)}
                    placeholder="Search numbers…"
                />

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <RelatedToFilterRow value={relatedFilter} counts={relatedCounts} onChange={setRelatedFilter} />
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3 w-[30%]">Number Name</th>
                                <th className="px-3 py-3 w-[12%]">Related To</th>
                                <th className="px-3 py-3 w-[10%]">Status</th>
                                <th className="px-3 py-3 w-[12%]">Linked Document</th>
                                {monitoring && <th className="px-3 py-3 w-[20%]">Monitoring</th>}
                                <th className="px-3 py-3 w-[8%] text-right">Enabled</th>
                                <th className="px-3 py-3 w-[6%] text-center">Form</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={monitoring ? 7 : 6} className="px-3 py-12 text-center">
                                        <p className="text-sm font-medium text-slate-700">No key numbers in this category</p>
                                        <p className="mt-1 text-[12px] text-slate-500">Try a different tab or clear the search.</p>
                                    </td>
                                </tr>
                            ) : pageRows.map(k => {
                                const RIcon = RELATED_TO_ICON[k.relatedTo];
                                const cascadedDocs = DOC_IDS_BY_KN_ID.get(k.id) ?? [];
                                const enabled = enabledIds.has(k.id);
                                const assignable = k.status === 'Active';
                                return (
                                    <tr
                                        key={k.id}
                                        onClick={assignable ? () => onToggle(k.id, !enabled) : undefined}
                                        className={cn(
                                            "group transition-colors",
                                            !assignable
                                                ? "cursor-default bg-slate-50/40 opacity-60"
                                                : enabled
                                                    ? "cursor-pointer bg-white hover:bg-blue-50/40"
                                                    : "cursor-pointer bg-slate-50/60 hover:bg-slate-100/70",
                                        )}
                                    >
                                        <td className="relative px-4 py-3 align-top">
                                            <span className={cn(
                                                "absolute inset-y-0 left-0 w-1 transition-colors",
                                                enabled ? "bg-blue-500" : "bg-transparent",
                                            )} />
                                            <p className={cn("font-semibold", enabled ? "text-slate-900" : "text-slate-400")}>
                                                {k.name}
                                            </p>
                                            <p className={cn("mt-0.5 text-[12px]", enabled ? "text-slate-500" : "text-slate-400")}>
                                                {k.description}
                                            </p>
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 text-[13px]",
                                                enabled ? "text-slate-700" : "text-slate-400",
                                            )}>
                                                <RIcon size={14} className={enabled ? "text-slate-400" : "text-slate-300"} /> {k.relatedTo}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <span className={cn(
                                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                                                k.status === 'Active'
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                    : "border-slate-200 bg-slate-100 text-slate-500",
                                            )}>
                                                {k.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            {cascadedDocs.length === 0 ? (
                                                <span className="text-[12px] text-slate-300">—</span>
                                            ) : (
                                                <span className={cn(
                                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                                    enabled ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500",
                                                )}>
                                                    <Link2 size={11} /> {cascadedDocs.length} cascade{cascadedDocs.length === 1 ? '' : 's'}
                                                </span>
                                            )}
                                        </td>
                                        {monitoring && (
                                            <td className="px-3 py-3 align-top">
                                                <MonitoringCell
                                                    itemKey={monitorItemKey('kn', k.id)}
                                                    name={k.name}
                                                    dateBearing={!!(k.hasExpiry || k.issueDateRequired)}
                                                    mon={monitoring}
                                                />
                                            </td>
                                        )}
                                        <td className="px-3 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-end">
                                                <Toggle
                                                    checked={enabled}
                                                    onCheckedChange={(v) => onToggle(k.id, v)}
                                                    disabled={!assignable}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 align-top text-center" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => setPreviewKn(k)}
                                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                                                title="Preview / edit how this looks on a form"
                                            >
                                                <Eye size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {rows.length > 0 && (
                        <TablePagination total={rows.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
                    )}
                </div>
            </div>

            {previewKn && (
                <DocumentFormPreviewModal
                    name={previewKn.name}
                    numberInput={{ label: previewKn.name }}
                    expiryRequired={previewKn.hasExpiry}
                    issueDateRequired={previewKn.issueDateRequired}
                    issueStateRequired={previewKn.issueStateRequired}
                    issueCountryRequired={previewKn.issueCountryRequired}
                    showUpload={!!(previewKn.docRequired || (DOC_IDS_BY_KN_ID.get(previewKn.id)?.length ?? 0) > 0)}
                    onSave={(cfg) => {
                        Object.assign(previewKn, {
                            hasExpiry: cfg.expiryRequired,
                            issueDateRequired: cfg.issueDateRequired,
                            issueStateRequired: cfg.issueStateRequired,
                            issueCountryRequired: cfg.issueCountryRequired,
                            docRequired: cfg.showUpload,
                        });
                        setRefresh(x => x + 1);
                    }}
                    onClose={() => setPreviewKn(null)}
                />
            )}
        </div>
    );
}

// ── Documents panel ───────────────────────────────────────────────────

const DOC_SUB_TAB_IDS: DocumentsSubTabId[] = ['all', 'carrier', 'asset', 'driver', 'accidents', 'violation'];

export function DocumentsAssignment({ enabledIds, onToggle, onBulk, monitoring, visibleIds }: {
    enabledIds: Set<string>;
    onToggle: (id: string, enabled: boolean) => void;
    onBulk: (ids: string[], enable: boolean) => void;
    monitoring?: RowMonitoring;
    /** When set, restrict the list to these ids (e.g. Settings: only root-enabled items). */
    visibleIds?: Set<string>;
}) {
    const [activeScope, setActiveScope] = useState<DocumentsSubTabId>('all');
    const [query, setQuery] = useState('');

    // Per-scope counts for the tab badges. 'all' is the running total.
    const counts = useMemo(() => {
        const out = {} as Record<DocumentsSubTabId, { enabled: number; total: number }>;
        for (const t of DOC_SUB_TAB_IDS) out[t] = { enabled: 0, total: 0 };
        for (const d of DOCUMENTS) {
            if (d.status !== 'Active') continue;   // only Active docs are assignable
            if (visibleIds && !visibleIds.has(d.id) && !isSystemFormDoc(d)) continue;
            out.all.total += 1;
            out[d.scope].total += 1;
            // Mandatory system/form docs always count as enabled.
            if (enabledIds.has(d.id) || isSystemFormDoc(d)) {
                out.all.enabled += 1;
                out[d.scope].enabled += 1;
            }
        }
        return out;
    }, [enabledIds, visibleIds]);

    const docTabs: SubTab<DocumentsSubTabId>[] = useMemo(() => withCount([
        { id: 'all',        label: 'All' },
        { id: 'carrier',    label: 'Carrier' },
        { id: 'asset',      label: 'Asset' },
        { id: 'driver',     label: 'Driver' },
        { id: 'accidents',  label: 'Accidents' },
        { id: 'violation',  label: 'Violation' },
    ], counts), [counts]);

    const q = query.trim().toLowerCase();
    const rows = DOCUMENTS
        .filter(d => !visibleIds || visibleIds.has(d.id) || isSystemFormDoc(d))
        .filter(d => activeScope === 'all' || d.scope === activeScope)
        .filter(d => !q
            || d.name.toLowerCase().includes(q)
            || (d.linkedTo ?? '').toLowerCase().includes(q));

    // Only Active catalog documents are assignable; Inactive/Draft rows are
    // shown read-only and excluded from the bulk actions and the progress count.
    const activeRows = rows.filter(r => r.status === 'Active');
    const enabledInView = activeRows.filter(r => enabledIds.has(r.id) || isSystemFormDoc(r)).length;
    // Mandatory system/form docs can't be bulk-disabled.
    const disableableRows = activeRows.filter(r => !isSystemFormDoc(r));

    // Pagination (rows-per-page 5 → 100). Reset to page 1 when the view changes.
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    useEffect(() => { setPage(1); }, [activeScope, q, perPage]);
    const pageRows = rows.slice((page - 1) * perPage, (page - 1) * perPage + perPage);

    // "How the upload looks on a form" preview + inline editor for a document.
    const [previewDocRow, setPreviewDocRow] = useState<DocumentRow | null>(null);
    const [, setRefresh] = useState(0);

    return (
        <div>
            <div className="border-b border-slate-100 bg-white px-6">
                <SubTabs
                    tabs={docTabs}
                    activeId={activeScope}
                    onChange={(id) => setActiveScope(id)}
                    bordered={false}
                />
            </div>

            <div className="space-y-3 px-6 py-5">
                <BulkBar
                    visibleCount={activeRows.length}
                    enabledInView={enabledInView}
                    query={query}
                    onQueryChange={setQuery}
                    onEnableAll={() => onBulk(activeRows.map(r => r.id), true)}
                    onDisableAll={() => onBulk(disableableRows.map(r => r.id), false)}
                    placeholder="Search documents…"
                />

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3 w-[30%]">Document Name</th>
                                <th className="px-3 py-3 w-[12%]">Category</th>
                                <th className="px-3 py-3 w-[10%]">Status</th>
                                <th className="px-3 py-3 w-[12%]">Linked Key Number</th>
                                {monitoring && <th className="px-3 py-3 w-[20%]">Monitoring</th>}
                                <th className="px-3 py-3 w-[8%] text-right">Enabled</th>
                                <th className="px-3 py-3 w-[6%] text-center">Form</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={monitoring ? 7 : 6} className="px-3 py-12 text-center">
                                        <p className="text-sm font-medium text-slate-700">No documents in this scope</p>
                                        <p className="mt-1 text-[12px] text-slate-500">Try a different tab or clear the search.</p>
                                    </td>
                                </tr>
                            ) : pageRows.map(d => {
                                const ScopeIcon = SCOPE_ICON[d.scope];
                                const linkedKn = KN_ID_BY_DOC_ID.get(d.id);
                                // System/form docs are always enabled and locked on.
                                const mandatory = isSystemFormDoc(d);
                                const enabled = enabledIds.has(d.id) || mandatory;
                                const isActive = d.status === 'Active';
                                const assignable = isActive && !mandatory;
                                return (
                                    <tr
                                        key={d.id}
                                        onClick={assignable ? () => onToggle(d.id, !enabled) : undefined}
                                        className={cn(
                                            "group transition-colors",
                                            !isActive
                                                ? "cursor-default bg-slate-50/40 opacity-60"   // Inactive/Draft — read-only & faded
                                                : mandatory
                                                    ? "cursor-default bg-white"                  // Required — enabled look, just not toggleable
                                                    : enabled
                                                        ? "cursor-pointer bg-white hover:bg-blue-50/40"
                                                        : "cursor-pointer bg-slate-50/60 hover:bg-slate-100/70",
                                        )}
                                    >
                                        <td className="relative px-4 py-3 align-top">
                                            <span className={cn(
                                                "absolute inset-y-0 left-0 w-1 transition-colors",
                                                enabled ? "bg-blue-500" : "bg-transparent",
                                            )} />
                                            <div className="flex items-start gap-2.5">
                                                <div className={cn(
                                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                                                    !enabled
                                                        ? "bg-slate-100"
                                                        : d.source === 'docu-form' ? "bg-violet-50" : "bg-blue-50",
                                                )}>
                                                    <FileText className={cn(
                                                        "h-4 w-4",
                                                        !enabled
                                                            ? "text-slate-400"
                                                            : d.source === 'docu-form' ? "text-violet-500" : "text-blue-500",
                                                    )} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={cn("flex items-center gap-1.5 font-semibold", enabled ? "text-slate-900" : "text-slate-400")}>
                                                        {d.name}
                                                        {mandatory && (
                                                            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-600">
                                                                Required
                                                            </span>
                                                        )}
                                                    </p>
                                                    {d.linkedTo && (
                                                        <p className={cn("mt-0.5 text-[11px]", enabled ? "text-slate-500" : "text-slate-400")}>
                                                            {d.linkedType === 'expense' ? 'Linked to Expense: ' :
                                                             d.linkedType === 'module'  ? 'Linked to ' : 'Linked to: '}
                                                            {d.linkedTo}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 text-[13px]",
                                                enabled ? "text-slate-700" : "text-slate-400",
                                            )}>
                                                <ScopeIcon size={14} className={enabled ? "text-slate-400" : "text-slate-300"} /> {SCOPE_LABEL[d.scope]}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <span className={cn(
                                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                                                d.status === 'Active'
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                    : "border-slate-200 bg-slate-100 text-slate-500",
                                            )}>
                                                {d.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            {linkedKn ? (
                                                <span className={cn(
                                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                                    enabled ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500",
                                                )}>
                                                    <Link2 size={11} /> will cascade
                                                </span>
                                            ) : (
                                                <span className="text-[12px] text-slate-300">—</span>
                                            )}
                                        </td>
                                        {monitoring && (
                                            <td className="px-3 py-3 align-top">
                                                <MonitoringCell
                                                    itemKey={monitorItemKey('doc', d.id)}
                                                    name={d.name}
                                                    dateBearing={!!(d.expiryRequired || d.issueDateRequired)}
                                                    mon={monitoring}
                                                />
                                            </td>
                                        )}
                                        <td className="px-3 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1.5">
                                                {mandatory && (
                                                    <Lock
                                                        size={11}
                                                        className="text-violet-400"
                                                        aria-label="Always enabled — system/form document"
                                                    />
                                                )}
                                                {/* Mandatory rows keep the switch ON & active-looking, just non-interactive. */}
                                                <span
                                                    className={cn(mandatory && "pointer-events-none")}
                                                    title={mandatory ? "Always enabled — system/form document" : undefined}
                                                >
                                                    <Toggle
                                                        checked={enabled}
                                                        onCheckedChange={(v) => { if (!mandatory) onToggle(d.id, v); }}
                                                        disabled={!isActive}
                                                    />
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 align-top text-center" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => setPreviewDocRow(d)}
                                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                                                title="Preview / edit how this looks on a form"
                                            >
                                                <Eye size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {rows.length > 0 && (
                        <TablePagination total={rows.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
                    )}
                </div>
            </div>

            {previewDocRow && (
                <DocumentFormPreviewModal
                    name={previewDocRow.name}
                    expiryRequired={previewDocRow.expiryRequired}
                    issueDateRequired={previewDocRow.issueDateRequired}
                    issueStateRequired={previewDocRow.issueStateRequired}
                    issueCountryRequired={previewDocRow.issueCountryRequired}
                    allowMultiple={previewDocRow.allowMultiple}
                    numberOfSlots={previewDocRow.numberOfSlots}
                    slotLabels={previewDocRow.slotLabels}
                    onSave={(cfg) => {
                        Object.assign(previewDocRow, {
                            expiryRequired: cfg.expiryRequired,
                            issueDateRequired: cfg.issueDateRequired,
                            issueStateRequired: cfg.issueStateRequired,
                            issueCountryRequired: cfg.issueCountryRequired,
                            allowMultiple: cfg.allowMultiple,
                            numberOfSlots: cfg.numberOfSlots,
                            slotLabels: cfg.slotLabels,
                        });
                        setRefresh(x => x + 1);
                    }}
                    onClose={() => setPreviewDocRow(null)}
                />
            )}
        </div>
    );
}

// ── Combined Compliance & Documents view (with inline monitoring) ──────────

/** Edit-monitoring modal — reuses the Monitoring & Notifications form. */
function MonitoringEditModal({ name, value, onSave, onClose }: {
    name: string; value: MonitoringConfig; onSave: (cfg: MonitoringConfig) => void; onClose: () => void;
}) {
    const [draft, setDraft] = useState<MonitoringConfig>(value);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="flex max-h-[90vh] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/30 px-6 py-5">
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-slate-900">Monitoring Settings</h3>
                        <p className="mt-0.5 truncate text-sm text-slate-500">{name}</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    <MonitoringNotificationsForm value={draft} onChange={setDraft} />
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={() => onSave(draft)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700">
                        <Save className="h-4 w-4" /> Save
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Workspace identity ────────────────────────────────────────────────
//
// The same shell backs three dedicated routes. A persistent, route-driven
// badge + accent (NOT the in-page Level switch) makes it unmistakable which
// page you're on: the Super Admin root authoring page, the service-profile
// admin's own page, or the per-carrier admin page.

type Workspace = 'root' | 'serviceProfile' | 'carrierAdmin';

const WORKSPACE_THEME: Record<Workspace, {
    crumb: string;
    badge: string;
    title: string;
    desc: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    gradient: string;
    chip: string;
    stripe: string;
    accentText: string;
}> = {
    root: {
        crumb:   'Super Admin',
        badge:   'Root · Source of truth',
        title:   'Service Profile Configuration',
        desc:    'Author the master compliance bundle that every carrier under this service profile inherits.',
        icon:    Crown,
        gradient:'from-violet-600 to-fuchsia-500',
        chip:    'border-violet-200 bg-violet-50 text-violet-700',
        stripe:  'border-l-violet-500 bg-violet-50/40',
        accentText: 'text-violet-700',
    },
    serviceProfile: {
        crumb:   'Service Profile',
        badge:   'Service Profile · Your carriers',
        title:   'Compliance Setup',
        desc:    'Configure compliance for the carriers under your service profile — each can be fine-tuned individually.',
        icon:    Building2,
        gradient:'from-blue-600 to-cyan-500',
        chip:    'border-blue-200 bg-blue-50 text-blue-700',
        stripe:  'border-l-blue-500 bg-blue-50/40',
        accentText: 'text-blue-700',
    },
    carrierAdmin: {
        crumb:   'Admin',
        badge:   'Carrier · Per-carrier overrides',
        title:   'Carrier Profile Configuration',
        desc:    'Enable or disable Key Numbers, Documents, Monitoring and Hiring Templates for a single carrier. Linked items cascade automatically.',
        icon:    Network,
        gradient:'from-emerald-600 to-teal-500',
        chip:    'border-emerald-200 bg-emerald-50 text-emerald-700',
        stripe:  'border-l-emerald-500 bg-emerald-50/40',
        accentText: 'text-emerald-700',
    },
};

// ── Page shell ────────────────────────────────────────────────────────

export const CarrierComplianceSetupPage = ({ mode = 'carrier', carrierLevelOnly = false }: {
    mode?: 'carrier' | 'serviceProfile';
    /** Service-profile page variant: Level switch is a single Carrier-Profile toggle,
     *  defaulting INTO the carriers of the first service profile. */
    carrierLevelOnly?: boolean;
} = {}) => {
    // Each route is locked to a single level (no in-page Level switch) so the
    // hierarchy stays unambiguous: root = service-profile, the rest = carrier.
    const [scope] = useState<'carrier' | 'serviceProfile'>(carrierLevelOnly ? 'carrier' : mode);
    const isServiceProfile = scope === 'serviceProfile';

    // Persistent route identity (does NOT change with the in-page Level switch):
    // tells the user which dedicated page they're on.
    const workspace: Workspace = carrierLevelOnly ? 'serviceProfile'
        : mode === 'serviceProfile' ? 'root'
        : 'carrierAdmin';
    const ws = WORKSPACE_THEME[workspace];
    const WsIcon = ws.icon;
    // In Carrier Profile level, optionally scope the carrier list to one service
    // profile so you can go through that profile's carriers ('' = all carriers).
    const [profileFilterId, setProfileFilterId] = useState<string>(carrierLevelOnly ? (SERVICE_PROFILES_DB[0]?.id ?? '') : '');
    // The configurable entities: carriers (per-carrier setup) or service
    // profiles (a template provided to all related carrier profiles).
    const entityList = useMemo(() => {
        if (isServiceProfile) {
            return SERVICE_PROFILES_DB.map(s => ({ id: s.id, name: s.dbaName || s.legalName }));
        }
        const carriers = profileFilterId ? getAccountsByServiceProfileId(profileFilterId) : ACCOUNTS_DB;
        return carriers.map(c => ({ id: c.id, name: c.dbaName || c.legalName }));
    }, [isServiceProfile, profileFilterId]);

    // Carrier level exposes all tabs (default Compliance); service-profile level only templates.
    const [pageMode, setPageMode] = useState<PageMode>((carrierLevelOnly || mode === 'carrier') ? 'compliance' : 'assigned');
    const [carrierId, setCarrierId] = useState<string>(entityList[0]?.id ?? '');
    const [assignment, setAssignment] = useState<CarrierComplianceAssignment>(() => loadCarrierAssignment(carrierId));
    const [toastMessages, setToastMessages] = useState<string[]>([]);
    const [savedFlash, setSavedFlash] = useState(false);
    const [templates] = useState<ComplianceTemplate[]>(() => loadTemplates());
    const [hiringTemplates] = useState<DriverHiringTemplate[]>(() => loadHiringTemplates());
    const [formType, setFormType] = useState<string>('hiring-driver');
    // Inline monitoring (shared by the Compliance and Documents tabs), scoped to the entity.
    const [monConfigs, setMonConfigs] = useState<Record<string, MonitoringConfig>>(() => loadMonitoringConfigs(carrierId));
    const [editingMonitor, setEditingMonitor] = useState<{ key: string; name: string } | null>(null);
    // Downstream: a template the user is assigning to the current carrier (awaiting override/add choice).
    const [applyingTemplate, setApplyingTemplate] = useState<ComplianceTemplate | null>(null);
    const monCfgFor = (key: string) => monConfigs[key] ?? DEFAULT_MONITORING;
    const setMonCfg = (key: string, cfg: MonitoringConfig) =>
        setMonConfigs(prev => { const next = { ...prev, [key]: cfg }; saveMonitoringConfigs(carrierId, next); return next; });
    const rowMonitoring: RowMonitoring = {
        cfgFor: monCfgFor,
        onToggle: (key, on) => setMonCfg(key, { ...monCfgFor(key), enabled: on }),
        onEdit: (key, name) => setEditingMonitor({ key, name }),
    };

    // The service profile whose hand-over (provisioning) we read/write.
    // Root scope → the selected service profile itself; carrier scope → its parent profile.
    const governingSpId = isServiceProfile ? carrierId : ACCOUNTS_DB.find(c => c.id === carrierId)?.serviceProfileId;
    // Hand-over is reactive state so toggling on the root page re-renders immediately.
    const [handover, setHandoverState] = useState<TemplateHandover>(() =>
        governingSpId ? loadHandover(governingSpId) : { complianceTemplateIds: [], hiringTemplateIds: [] });

    const isRoot = workspace === 'root';

    // Root is the SOURCE: it lists the FULL catalog and toggling provisions
    // (hands over) to the service profile. Downstream pages only see what's
    // already been handed over.
    const availableTemplates = useMemo(
        () => isRoot ? templates : templates.filter(t => handover.complianceTemplateIds.includes(t.id)),
        [templates, handover, isRoot],
    );
    const availableHiring = useMemo(
        () => isRoot ? hiringTemplates : hiringTemplates.filter(t => handover.hiringTemplateIds.includes(t.id)),
        [hiringTemplates, handover, isRoot],
    );

    /** Provision/de-provision a compliance template to the service profile (root page). */
    const toggleHandoverTemplate = (t: ComplianceTemplate, on: boolean) => {
        if (!governingSpId) return;
        const ids = on
            ? [...new Set([...handover.complianceTemplateIds, t.id])]
            : handover.complianceTemplateIds.filter(id => id !== t.id);
        const next: TemplateHandover = { ...handover, complianceTemplateIds: ids };
        persistHandover(governingSpId, next);
        setHandoverState(next);
        flashSaved();
    };
    /** Provision/de-provision a hiring template to the service profile (root page). */
    const toggleHandoverHiring = (templateId: string, on: boolean) => {
        if (!governingSpId) return;
        const ids = on
            ? [...new Set([...handover.hiringTemplateIds, templateId])]
            : handover.hiringTemplateIds.filter(id => id !== templateId);
        const next: TemplateHandover = { ...handover, hiringTemplateIds: ids };
        persistHandover(governingSpId, next);
        setHandoverState(next);
        flashSaved();
    };
    const bulkHandoverHiring = (enable: boolean) => {
        if (!governingSpId) return;
        const next: TemplateHandover = { ...handover, hiringTemplateIds: enable ? availableHiring.map(t => t.id) : [] };
        persistHandover(governingSpId, next);
        setHandoverState(next);
        flashSaved();
    };

    // Form-type options surface from the handed-over hiring templates.
    const formTypeOptions = useMemo(() => {
        const seen = new Set<string>();
        const out: { id: string; label: string }[] = [];
        for (const t of availableHiring) {
            if (seen.has(t.formType)) continue;
            seen.add(t.formType);
            out.push({ id: t.formType, label: formTypeLabel(t.formType) });
        }
        if (out.length === 0) out.push({ id: 'hiring-driver', label: 'Hiring Driver' });
        return out;
    }, [availableHiring]);

    const filteredHiringTemplates = useMemo(
        () => availableHiring.filter(t => t.formType === formType),
        [availableHiring, formType],
    );

    // Reload assignment + monitoring when the carrier changes.
    useEffect(() => {
        if (!carrierId) return;
        setAssignment(loadCarrierAssignment(carrierId));
        setMonConfigs(loadMonitoringConfigs(carrierId));
    }, [carrierId]);

    // Reload hand-over when the governing service profile changes.
    useEffect(() => {
        setHandoverState(governingSpId ? loadHandover(governingSpId) : { complianceTemplateIds: [], hiringTemplateIds: [] });
    }, [governingSpId]);

    // Show a brief "Saved" check after each change.
    const flashSaved = () => {
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1200);
    };

    const enabledKnSet = useMemo(() => new Set(assignment.enabledKeyNumberIds), [assignment]);
    const enabledDocSet = useMemo(() => new Set(assignment.enabledDocumentTypeIds), [assignment]);

    /**
     * Keep monitoring in lockstep with field enablement: a date-bearing item
     * that gets enabled has its monitoring switched on; disabling turns it off.
     * Covers the toggled item AND its cascaded KN↔Doc partner. Users can still
     * fine-tune per item on the Monitoring tab afterwards.
     */
    const syncMonitoring = (kind: 'keynumber' | 'document', id: string, enable: boolean) => {
        const affected: { k: 'kn' | 'doc'; id: string }[] = [];
        if (kind === 'keynumber') {
            affected.push({ k: 'kn', id });
            for (const docId of DOC_IDS_BY_KN_ID.get(id) ?? []) affected.push({ k: 'doc', id: docId });
        } else {
            affected.push({ k: 'doc', id });
            const knId = KN_ID_BY_DOC_ID.get(id);
            if (knId) affected.push({ k: 'kn', id: knId });
        }
        const configs = loadMonitoringConfigs(carrierId);
        let changed = false;
        for (const a of affected) {
            const dateBearing = a.k === 'kn'
                ? (() => { const r = SEED_KEY_NUMBERS.find(x => x.id === a.id); return !!r && (r.hasExpiry || r.issueDateRequired); })()
                : (() => { const r = DOCUMENTS.find(x => x.id === a.id); return !!r && (r.expiryRequired || r.issueDateRequired); })();
            if (!dateBearing) continue;
            const key = monitorItemKey(a.k, a.id);
            const cur = configs[key] ?? DEFAULT_MONITORING;
            if (cur.enabled !== enable) { configs[key] = { ...cur, enabled: enable }; changed = true; }
        }
        if (changed) saveMonitoringConfigs(carrierId, configs);
    };

    /**
     * Single toggle (with cascade). Uses functional setState so rapid clicks
     * don't read stale closure-captured state.
     */
    const handleToggle = (kind: 'keynumber' | 'document', id: string, enable: boolean) => {
        setAssignment(prev => {
            const { next, cascaded } = applyToggle(prev, kind, id, enable);
            saveCarrierAssignment(next);
            if (cascaded.length > 0) {
                const action = enable ? 'enabled' : 'disabled';
                setToastMessages(cascaded.map(c =>
                    `Also ${action} linked ${c.kind === 'keynumber' ? 'Key Number' : 'Document'}: ${c.name}`
                ));
            }
            flashSaved();
            return next;
        });
        syncMonitoring(kind, id, enable);
        setMonConfigs(loadMonitoringConfigs(carrierId));
    };

    /** Bulk toggle for "Enable all" / "Disable all" buttons (current view only). */
    const handleBulk = (kind: 'keynumber' | 'document', ids: string[], enable: boolean) => {
        setAssignment(prev => {
            const next = applyBulk(prev, kind, ids, enable);
            saveCarrierAssignment(next);
            flashSaved();
            return next;
        });
        for (const id of ids) syncMonitoring(kind, id, enable);
        setMonConfigs(loadMonitoringConfigs(carrierId));
    };

    /** Reset this carrier's assignment back to the catalog defaults. */
    const handleReset = () => {
        if (!window.confirm('Reset this carrier to the catalog defaults? Every "Active" key number and document type will be re-enabled.')) return;
        const next = defaultAssignmentFor(carrierId);
        setAssignment(next);
        saveCarrierAssignment(next);
        flashSaved();
    };

    /** Switch between viewing/configuring service profiles vs carrier profiles.
     *  Switching to carriers scopes the list to the profile you were inspecting. */
    /** In carrier level, change which service profile's carriers are listed. */
    const handleProfileFilterChange = (spId: string) => {
        setProfileFilterId(spId);
        const carriers = spId ? getAccountsByServiceProfileId(spId) : ACCOUNTS_DB;
        setCarrierId(carriers[0]?.id ?? '');
    };

    /** Templates currently enabled (available) on this entity. */
    const selectedTplIds = selectedTemplateIds(assignment);

    /**
     * Apply a handed-over template to the CURRENT carrier (downstream pages).
     * `override` replaces the carrier's setup with this template; `add` merges
     * it onto whatever is already enabled (nothing removed). Monitoring follows
     * the same rule. Also records the template in appliedTemplateIds.
     */
    const applyTemplateToCarrier = (t: ComplianceTemplate, mode: 'override' | 'add') => {
        const next = mode === 'override' ? applyTemplates(assignment, [t]) : stackTemplateOnto(assignment, t);
        setAssignment(next);
        saveCarrierAssignment(next);
        const tplMon = mergeTemplateMonitoring([t]);
        const mergedMon = mode === 'override' ? tplMon : { ...loadMonitoringConfigs(carrierId), ...tplMon };
        saveMonitoringConfigs(carrierId, mergedMon);
        setMonConfigs(mergedMon);
        flashSaved();
        setApplyingTemplate(null);
    };

    /** Un-assign a template from the current carrier (drops it from appliedTemplateIds; leaves items in place). */
    const unapplyTemplateFromCarrier = (t: ComplianceTemplate) => {
        const ids = selectedTplIds.filter(id => id !== t.id);
        const na: CarrierComplianceAssignment = { ...assignment, appliedTemplateId: undefined, appliedTemplateIds: ids };
        setAssignment(na);
        saveCarrierAssignment(na);
        flashSaved();
    };

    /** Carrier page: record availability only (no override/add apply). */
    const toggleTemplateAvailability = (t: ComplianceTemplate, on: boolean) => {
        const ids = on ? [...new Set([...selectedTplIds, t.id])] : selectedTplIds.filter(id => id !== t.id);
        const na: CarrierComplianceAssignment = { ...assignment, appliedTemplateId: undefined, appliedTemplateIds: ids };
        setAssignment(na);
        saveCarrierAssignment(na);
        flashSaved();
    };

    /**
     * Template list toggle, by workspace:
     *   • root           → provisions (hand-over) to the service profile
     *   • serviceProfile → assigns to the carrier WITH an override/add prompt
     *   • carrierAdmin   → records availability only
     */
    const onTemplateToggle = (t: ComplianceTemplate, on: boolean) => {
        if (isRoot) { toggleHandoverTemplate(t, on); return; }
        if (workspace === 'serviceProfile') {
            if (on) setApplyingTemplate(t);
            else unapplyTemplateFromCarrier(t);
            return;
        }
        toggleTemplateAvailability(t, on);
    };

    /** Hiring pipelines collect the "used in hiring" Key Numbers + Documents, so
     *  enabling a hiring template auto-includes those items (linked dimensions). */
    const withHiringRequirements = (a: CarrierComplianceAssignment): CarrierComplianceAssignment => {
        let next = a;
        for (const k of SEED_KEY_NUMBERS) {
            if (k.status === 'Active' && k.usedInHiring && !next.enabledKeyNumberIds.includes(k.id)) {
                next = applyToggle(next, 'keynumber', k.id, true).next;
            }
        }
        for (const d of DOCUMENTS) {
            if (d.status === 'Active' && d.usedInHiring && !next.enabledDocumentTypeIds.includes(d.id)) {
                next = applyToggle(next, 'document', d.id, true).next;
            }
        }
        return next;
    };

    /** Toggle a hiring template's enabled state for this carrier. */
    const handleToggleHiringTemplate = (templateId: string, enabled: boolean) => {
        const current = assignment.enabledHiringTemplateIds ?? [];
        const ids = enabled
            ? [...current.filter(id => id !== templateId), templateId]
            : current.filter(id => id !== templateId);
        let nextAssignment: CarrierComplianceAssignment = { ...assignment, enabledHiringTemplateIds: ids };
        if (enabled) nextAssignment = withHiringRequirements(nextAssignment);
        setAssignment(nextAssignment);
        saveCarrierAssignment(nextAssignment);
        flashSaved();
    };

    /** Bulk enable/disable the handed-over hiring templates. */
    const handleBulkHiringTemplates = (enable: boolean) => {
        const ids = enable ? availableHiring.map(t => t.id) : [];
        let nextAssignment: CarrierComplianceAssignment = { ...assignment, enabledHiringTemplateIds: ids };
        if (enable) nextAssignment = withHiringRequirements(nextAssignment);
        setAssignment(nextAssignment);
        saveCarrierAssignment(nextAssignment);
        flashSaved();
    };

    const pillBtn = (mode: PageMode, label: string) => (
        <button
            type="button"
            onClick={() => setPageMode(mode)}
            className={cn(
                "rounded-md px-4 py-1.5 text-[13px] font-semibold leading-5 transition-colors whitespace-nowrap",
                pageMode === mode
                    ? cn("bg-white shadow-sm", ws.accentText)
                    : "text-slate-600 hover:text-slate-900",
            )}
        >
            {label}
        </button>
    );

    const selectedCarrier = ACCOUNTS_DB.find(c => c.id === carrierId);
    const relatedCarrierCount = isServiceProfile ? getAccountsByServiceProfileId(carrierId).length : 0;
    // Carrier mode: name the service profile this carrier was seeded from.
    const seedProfile = !isServiceProfile && selectedCarrier?.serviceProfileId
        ? SERVICE_PROFILES_DB.find(p => p.id === selectedCarrier.serviceProfileId)
        : undefined;
    const seedProfileName = seedProfile ? (seedProfile.dbaName || seedProfile.legalName) : undefined;

    // Purpose-aware hero line — tells each page its actual job in the hierarchy
    // (cascade source vs inheritor vs per-carrier), instead of a generic banner.
    const configuringName = entityList.find(e => e.id === carrierId)?.name ?? '';
    const filterProfile = SERVICE_PROFILES_DB.find(p => p.id === profileFilterId);
    const profileName = filterProfile ? (filterProfile.dbaName || filterProfile.legalName) : (seedProfileName ?? 'your service profile');
    const heroText: React.ReactNode = workspace === 'root'
        ? (isServiceProfile
            ? <>Source bundle — everything enabled here <span className="font-bold">cascades</span> to <span className="font-bold">{relatedCarrierCount}</span> carrier profile{relatedCarrierCount === 1 ? '' : 's'} under <span className="font-bold">{configuringName}</span>.</>
            : <>Carrier preview — changes override the inherited bundle for <span className="font-bold">{configuringName}</span> only.</>)
        : workspace === 'serviceProfile'
            ? <>Managing <span className="font-bold">{entityList.length}</span> carrier{entityList.length === 1 ? '' : 's'} under <span className="font-bold">{profileName}</span> — each inherits your template; fine-tune per carrier.</>
            : (seedProfileName
                ? <>Started from <span className="font-bold">{seedProfileName}</span>'s template · changes apply to this carrier only.</>
                : null);

    // Denominators count only assignable (Active) catalog items.
    const knTotal = useMemo(() => SEED_KEY_NUMBERS.filter(k => k.status === 'Active').length, []);
    const docTotal = useMemo(() => DOCUMENTS.filter(d => d.status === 'Active').length, []);
    const knPct = knTotal === 0 ? 0 : Math.round((enabledKnSet.size / knTotal) * 100);
    const docPct = docTotal === 0 ? 0 : Math.round((enabledDocSet.size / docTotal) * 100);

    return (
        <div className="flex h-full flex-col bg-slate-50/50">
            {/* Sticky header */}
            <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
                <div className="px-6 pt-4">
                    <nav className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500" aria-label="Breadcrumb">
                        <span>{ws.crumb}</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-900">{ws.title}</span>
                    </nav>
                </div>

                <div className="px-6 pb-4 flex flex-wrap items-start justify-between gap-4">
                    {/* Left: icon + title + subtitle */}
                    <div className="flex items-start gap-3 min-w-0">
                        <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm", ws.gradient)}>
                            <WsIcon size={18} />
                        </span>
                        <div className="min-w-0">
                            {/* Persistent workspace badge — the dedicated-page differentiator */}
                            <span className={cn("mb-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", ws.chip)}>
                                <WsIcon size={11} /> {ws.badge}
                            </span>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                {ws.title}
                            </h1>
                            <p className="mt-0.5 text-sm text-slate-500">
                                {ws.desc}
                            </p>
                        </div>
                    </div>

                    {/* Right: saved flash + Reset (the view switch now sits under the progress bars) */}
                    <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-2">
                            {savedFlash && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                    <Check size={11} /> Saved
                                </span>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleReset}
                                className="gap-1.5"
                                title="Reset this carrier to catalog defaults (every Active item re-enabled)"
                            >
                                <RotateCcw size={14} /> Reset to defaults
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Unified context strip — scope switch, then entity + template pickers */}
                <div className={cn("border-t border-t-slate-100 border-l-4 px-6 py-3", ws.stripe)}>
                    {/* Purpose-aware context line — what this page does in the hierarchy */}
                    {heroText && (
                        <p className="mb-3 flex items-start gap-1.5 text-[12px] font-medium text-slate-700">
                            <WsIcon size={13} className={cn("mt-px shrink-0", ws.accentText)} />
                            <span>{heroText}</span>
                        </p>
                    )}
                    <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                        {/* Service-profile selector — pick the profile whose carriers we configure
                            (shown on the Service Profile page and the carrier-admin page). */}
                        {!isRoot && (
                            <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Service profile
                                </label>
                                <select
                                    value={profileFilterId}
                                    onChange={(e) => handleProfileFilterChange(e.target.value)}
                                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    {workspace === 'carrierAdmin' && <option value="">All carriers</option>}
                                    {SERVICE_PROFILES_DB.map(s => (
                                        <option key={s.id} value={s.id}>{s.dbaName || s.legalName}</option>
                                    ))}
                                </select>
                                <p className="mt-1 truncate text-[11px] text-slate-500">
                                    {profileFilterId
                                        ? <>Showing this profile's <span className="font-semibold text-slate-700">{entityList.length}</span> carrier{entityList.length === 1 ? '' : 's'}.</>
                                        : 'Showing all carriers.'}
                                </p>
                            </div>
                        )}
                        {/* Carrier picker */}
                        <div>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                {isServiceProfile ? 'Configuring service profile' : 'Configuring carrier'}
                            </label>
                            <div className="flex items-center gap-2">
                                <select
                                    value={carrierId}
                                    onChange={(e) => setCarrierId(e.target.value)}
                                    className="h-10 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    {entityList.map(e => (
                                        <option key={e.id} value={e.id}>{e.name}</option>
                                    ))}
                                </select>
                            </div>
                            {isServiceProfile ? (
                                <p className="mt-1 truncate text-[11px] text-slate-500">
                                    Template applies to <span className="font-semibold text-slate-700">{relatedCarrierCount}</span> related carrier profile{relatedCarrierCount === 1 ? '' : 's'}.
                                </p>
                            ) : selectedCarrier && (
                                <p className="mt-1 truncate text-[11px] text-slate-500">
                                    USDOT <span className="font-semibold text-slate-700">{selectedCarrier.dotNumber || '—'}</span>
                                    {' · '}{selectedCarrier.city}, {selectedCarrier.state}, {selectedCarrier.country}
                                </p>
                            )}
                        </div>

                    </div>

                    {/* Compact progress row */}
                    <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-200/70 pt-3">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Key Numbers</span>
                            <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
                                <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${knPct}%` }} />
                            </div>
                            <span className="text-[12px] font-semibold text-slate-700">
                                {enabledKnSet.size}<span className="text-slate-400">/{knTotal}</span>
                            </span>
                        </div>
                        <div className="h-4 w-px bg-slate-200" />
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Documents</span>
                            <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
                                <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${docPct}%` }} />
                            </div>
                            <span className="text-[12px] font-semibold text-slate-700">
                                {enabledDocSet.size}<span className="text-slate-400">/{docTotal}</span>
                            </span>
                        </div>
                    </div>

                    {/* View switch — Compliance / Documents / Hiring Templates */}
                    <div className="mt-3 flex justify-end border-t border-slate-200/70 pt-3">
                        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                            {!isServiceProfile && pillBtn('compliance', 'Compliance')}
                            {!isServiceProfile && pillBtn('documents',  'Documents')}
                            {pillBtn('templates',  'Hiring Templates')}
                            {pillBtn('assigned',   'Templates')}
                        </div>
                    </div>
                </div>
            </header>

            {/* Body */}
            <main className="flex-1 overflow-y-auto">
                {pageMode === 'compliance' && (
                    <KeyNumbersAssignment
                        enabledIds={enabledKnSet}
                        onToggle={(id, enabled) => handleToggle('keynumber', id, enabled)}
                        onBulk={(ids, enable) => handleBulk('keynumber', ids, enable)}
                        monitoring={rowMonitoring}
                    />
                )}
                {pageMode === 'documents' && (
                    <DocumentsAssignment
                        enabledIds={enabledDocSet}
                        onToggle={(id, enabled) => handleToggle('document', id, enabled)}
                        onBulk={(ids, enable) => handleBulk('document', ids, enable)}
                        monitoring={rowMonitoring}
                    />
                )}
                {pageMode === 'templates' && (
                    <TemplatesPanel
                        hiringTemplates={filteredHiringTemplates}
                        formType={formType}
                        formTypeOptions={formTypeOptions}
                        onFormTypeChange={setFormType}
                        enabledHiringIds={isRoot ? handover.hiringTemplateIds : (assignment.enabledHiringTemplateIds ?? [])}
                        onToggleHiring={isRoot ? toggleHandoverHiring : handleToggleHiringTemplate}
                        onBulkHiring={isRoot ? bulkHandoverHiring : handleBulkHiringTemplates}
                    />
                )}
                {pageMode === 'assigned' && (
                    <div className="px-6 py-5">
                        <p className="mb-3 text-[12px] text-slate-500">
                            {isRoot
                                ? <>Choose which compliance templates <span className="font-semibold text-slate-700">{entityList.find(e => e.id === carrierId)?.name ?? ''}</span> provides — enabled ones cascade to its <span className="font-semibold text-slate-700">{relatedCarrierCount}</span> related carrier profile{relatedCarrierCount === 1 ? '' : 's'}.</>
                                : workspace === 'serviceProfile'
                                    ? <>Enable a template to assign it to <span className="font-semibold text-slate-700">{selectedCarrier?.dbaName || selectedCarrier?.legalName || 'this carrier'}</span> — you'll choose whether to <span className="font-semibold text-slate-700">override</span> or <span className="font-semibold text-slate-700">add to</span> its current setup.</>
                                    : <>Enable the templates available to this carrier.</>}
                        </p>
                        {availableTemplates.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-12 text-center">
                                <LayoutTemplate size={28} className="mx-auto text-slate-300" />
                                <p className="mt-2 text-sm font-medium text-slate-600">{isRoot ? 'No compliance templates created yet' : 'No templates handed over yet'}</p>
                                <p className="mt-1 text-[12px] text-slate-400">{isRoot ? 'Create them in Super Admin → Compliance Templates.' : 'Hand them over from Super Admin → Compliance Templates.'}</p>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <ul className="divide-y divide-slate-100">
                                    {availableTemplates.map(t => {
                                        const on = isRoot ? handover.complianceTemplateIds.includes(t.id) : selectedTplIds.includes(t.id);
                                        return (
                                            <li
                                                key={t.id}
                                                onClick={() => onTemplateToggle(t, !on)}
                                                className={cn(
                                                    "group relative flex cursor-pointer items-center gap-3 py-3 pl-5 pr-4 transition-colors",
                                                    on ? "bg-white hover:bg-blue-50/40" : "bg-slate-50/60 hover:bg-slate-100/70",
                                                )}
                                            >
                                                <span className={cn("absolute inset-y-0 left-0 w-1", on ? "bg-blue-500" : "bg-transparent")} />
                                                <span className={cn(
                                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                                                    on ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400",
                                                )}>
                                                    <LayoutTemplate size={15} />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                        <span className={cn("text-sm font-semibold", on ? "text-slate-900" : "text-slate-500")}>{t.name}</span>
                                                        {t.isSeed && (
                                                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-600">
                                                                <Lock size={9} /> Built-in
                                                            </span>
                                                        )}
                                                    </div>
                                                    {t.description && (
                                                        <p className={cn("mt-0.5 text-[12px] leading-snug", on ? "text-slate-500" : "text-slate-400")}>{t.description}</p>
                                                    )}
                                                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                                                        <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">{t.enabledKeyNumberIds.length} key numbers</span>
                                                        <span className="rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet-700">{t.enabledDocumentTypeIds.length} documents</span>
                                                        {(t.enabledHiringTemplateIds?.length ?? 0) > 0 && (
                                                            <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">{t.enabledHiringTemplateIds!.length} hiring</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                                                    <Toggle checked={on} onCheckedChange={(v) => onTemplateToggle(t, v)} />
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <CascadeToast
                messages={toastMessages}
                onDismiss={() => setToastMessages([])}
            />

            {editingMonitor && (
                <MonitoringEditModal
                    name={editingMonitor.name}
                    value={monCfgFor(editingMonitor.key)}
                    onSave={(cfg) => { setMonCfg(editingMonitor.key, cfg); setEditingMonitor(null); }}
                    onClose={() => setEditingMonitor(null)}
                />
            )}

            {applyingTemplate && (
                <ApplyTemplateModal
                    template={applyingTemplate}
                    carrierName={selectedCarrier?.dbaName || selectedCarrier?.legalName || 'this carrier'}
                    onOverride={() => applyTemplateToCarrier(applyingTemplate, 'override')}
                    onAdd={() => applyTemplateToCarrier(applyingTemplate, 'add')}
                    onClose={() => setApplyingTemplate(null)}
                />
            )}
        </div>
    );
};

/**
 * Asks how to apply a template to a carrier: override (replace) the current
 * setup, or add (merge) onto it. Only used on the Service Profile page.
 */
function ApplyTemplateModal({ template, carrierName, onOverride, onAdd, onClose }: {
    template: ComplianceTemplate;
    carrierName: string;
    onOverride: () => void;
    onAdd: () => void;
    onClose: () => void;
}) {
    const knCount = template.enabledKeyNumberIds.length;
    const docCount = template.enabledDocumentTypeIds.length;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="flex w-full max-w-[520px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/30 px-6 py-5">
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-slate-900">Assign template</h3>
                        <p className="mt-0.5 text-sm text-slate-500">
                            Apply <span className="font-semibold text-slate-700">{template.name}</span> to <span className="font-semibold text-slate-700">{carrierName}</span>
                            {' '}({knCount} key numbers · {docCount} documents).
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-3 p-6">
                    <button
                        type="button"
                        onClick={onOverride}
                        className="flex w-full items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/40"
                    >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                            <RotateCcw size={15} />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-sm font-bold text-slate-900">Override current setup</span>
                            <span className="block text-[12px] text-slate-500">Replace the carrier's enabled items + monitoring with exactly this template.</span>
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={onAdd}
                        className="flex w-full items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
                    >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                            <CheckCircle2 size={15} />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-sm font-bold text-slate-900">Add to current setup</span>
                            <span className="block text-[12px] text-slate-500">Merge this template into what's already enabled — nothing is removed.</span>
                        </span>
                    </button>
                </div>
                <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                </div>
            </div>
        </div>
    );
}

export default CarrierComplianceSetupPage;
