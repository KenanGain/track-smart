import { useEffect, useMemo, useState } from 'react';
import {
    Building2, Truck, User, FileText, Hash, CalendarClock, Calendar,
    ShieldCheck, Layers, Info, MapPin, Activity, Bell,
    Search, Columns, Check, ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight,
    ClipboardList, Table2, UploadCloud, X, Eye, SquarePen, Sparkles, Plus, Tag, History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KeyNumberGroup } from '@/pages/admin/ComplianceAndDocumentsPage';
import {
    SAFETY_RECORDS, SAFETY_CATEGORY_ORDER, RECORD_TYPE_ORDER, RECORD_TYPE_LABEL,
    ENTITY_ORDER, isDateMonitored, UPLOAD_MODE_LABEL,
    type SafetyRecord, type RecordTypeId, type EntityId, type UploadMode,
} from '@/pages/compliance/safety-software-catalog.data';
import { useSafetyTags, tagColor, smartTagMatch, groupTitleOf, MAX_DOC_TAGS } from '@/pages/compliance/safety-tags.data';
import { ALL_COUNTRIES } from '@/pages/compliance/jurisdiction.data';
import { APP_USERS } from '@/data/users.data';

/**
 * Settings → New Compliance & Documents — read-only classification catalog.
 *
 *   • Top-right switch  → filter by RECORD TYPE (Compliance & Documents / Compliance / Document).
 *   • Carrier / Asset / Driver tabs → filter by entity.
 *   • One "Records" list with category sub-tabs, plus search, column show/hide,
 *     column sorting, and pagination (25 default, up to 100).
 */

const ENTITY_ICON: Record<EntityId, React.ComponentType<{ size?: number; className?: string }>> = {
    Carrier: Building2,
    Asset: Truck,
    Driver: User,
};

const RECORD_TYPE_TONE: Record<RecordTypeId, string> = {
    C: 'border-blue-200 bg-blue-50 text-blue-700',
    D: 'border-violet-200 bg-violet-50 text-violet-700',
    DC: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

/** Short labels for the in-row Category column (the sub-tabs carry the full names). */
const CATEGORY_SHORT: Record<KeyNumberGroup, string> = {
    'Regulatory and Safety Numbers': 'Regulatory & Safety',
    'Tax and Business Identification Numbers': 'Tax & Business ID',
    'Carrier & Industry Codes': 'Carrier & Industry',
    'Bond and Registration Numbers': 'Bond & Registration',
    'Other': 'Other',
};

// ── Column model — drives sorting, show/hide and rendering ─────────────

type ColumnId = 'record' | 'category' | 'entity' | 'type' | 'document' | 'monitoring' | 'jurisdiction';

interface ColumnDef {
    id: ColumnId;
    label: string;
    sortable: boolean;
    /** Cannot be hidden (keeps the list meaningful). */
    locked?: boolean;
    sortValue: (r: SafetyRecord) => string;
    render: (r: SafetyRecord) => React.ReactNode;
    cellClassName?: string;
}

const COLUMNS: ColumnDef[] = [
    {
        id: 'record', label: 'Record & Fields', sortable: true, locked: true,
        sortValue: r => r.recordName, cellClassName: 'w-[30%]',
        render: r => (
            <>
                <div className="text-sm font-semibold text-slate-900">{r.recordName}</div>
                {r.description && <div className="mt-0.5 text-[11px] leading-snug text-slate-500">{r.description}</div>}
                <div className="mt-1 flex flex-wrap gap-1.5">
                    {r.numberName && (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                            <Hash size={9} /> {r.numberName}
                        </span>
                    )}
                    {r.documentName && (
                        <span className="inline-flex items-center gap-1 rounded bg-violet-50 border border-violet-200 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                            <FileText size={9} /> {r.documentName}
                        </span>
                    )}
                </div>
                {r.note && <p className="mt-1 text-[11px] leading-snug text-slate-400 italic">{r.note}</p>}
            </>
        ),
    },
    {
        id: 'category', label: 'Category', sortable: true,
        sortValue: r => r.category,
        render: r => (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 whitespace-nowrap">
                {CATEGORY_SHORT[r.category]}
            </span>
        ),
    },
    {
        id: 'entity', label: 'Entity', sortable: true,
        sortValue: r => r.entity,
        render: r => {
            const Icon = ENTITY_ICON[r.entity];
            return (
                <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-700">
                    <Icon size={14} className="text-slate-400" /> {r.entity}
                </span>
            );
        },
    },
    {
        id: 'type', label: 'Record Type', sortable: true,
        sortValue: r => RECORD_TYPE_LABEL[r.type],
        render: r => (
            <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap', RECORD_TYPE_TONE[r.type])}>
                {RECORD_TYPE_LABEL[r.type]}
            </span>
        ),
    },
    {
        id: 'document', label: 'Document', sortable: true,
        sortValue: r => r.docRequirement,
        render: r => (
            <div className="space-y-1">
                <RequirementPill r={r} />
                {r.uploadMode && <UploadModeChip mode={r.uploadMode} />}
            </div>
        ),
    },
    {
        id: 'monitoring', label: 'Monitoring', sortable: true,
        sortValue: r => (r.configuredDate ?? '') + r.monitorType,
        render: r => (
            <div title={r.monitor}>
                <MonitoringCell r={r} />
                <div className="mt-0.5 text-[10px] text-slate-400">Recurring: {r.recurring}</div>
            </div>
        ),
    },
    {
        id: 'jurisdiction', label: 'Jurisdiction', sortable: true,
        sortValue: r => r.jurisdiction,
        render: r => (
            <span className="inline-flex items-start gap-1 text-[12px] text-slate-600 max-w-[220px]">
                <MapPin size={12} className="mt-0.5 shrink-0 text-slate-400" />
                <span>{r.jurisdiction}</span>
            </span>
        ),
    },
];

const ALL_COLUMN_IDS = COLUMNS.map(c => c.id);
const PAGE_SIZES = [10, 25, 50, 100];

/** Free-text search haystack for a record. */
function searchBlob(r: SafetyRecord): string {
    return [
        r.recordName, r.description, r.numberName, r.documentName, r.category, CATEGORY_SHORT[r.category],
        r.entity, RECORD_TYPE_LABEL[r.type], r.docRequirement, r.monitorType, r.configuredDate ?? '',
        r.jurisdiction, r.recurring, r.note ?? '', r.uploadMode ? UPLOAD_MODE_LABEL[r.uploadMode] : '',
    ].join(' ').toLowerCase();
}

// ── Page ──────────────────────────────────────────────────────────────

export function SafetyCatalogView() {
    const [recordType, setRecordType] = useState<RecordTypeId>('DC');
    const [entity, setEntity] = useState<EntityId>('Carrier');
    // Column visibility is held here so it persists across record-type / entity switches.
    const [visibleCols, setVisibleCols] = useState<Set<ColumnId>>(() => new Set(ALL_COLUMN_IDS));

    // System-default catalog — records are read-only (view / edit only, no deletion).
    const records = SAFETY_RECORDS;

    // Global counts (independent of the current entity tab) for the switch badges.
    const typeCounts = useMemo(() => {
        const m: Record<RecordTypeId, number> = { C: 0, D: 0, DC: 0 };
        for (const r of records) m[r.type]++;
        return m;
    }, [records]);

    // Per-entity counts for the currently-selected record type.
    const entityCounts = useMemo(() => {
        const m: Record<EntityId, number> = { Carrier: 0, Asset: 0, Driver: 0 };
        for (const r of records) if (r.type === recordType) m[r.entity]++;
        return m;
    }, [records, recordType]);

    const rows = useMemo(
        () => records.filter(r => r.type === recordType && r.entity === entity),
        [records, recordType, entity],
    );

    return (
        <div className="flex-1 bg-slate-50 min-h-screen">
            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200 px-8 py-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-slate-900">New Compliance &amp; Documents</h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            System default classification — {records.length} records (safety-software workbook + driver hiring documents).
                        </p>
                    </div>

                    {/* Record-type switch */}
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                        {RECORD_TYPE_ORDER.map(t => {
                            const active = recordType === t;
                            return (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setRecordType(t)}
                                    className={cn(
                                        'inline-flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-md transition-colors',
                                        active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900',
                                    )}
                                >
                                    {RECORD_TYPE_LABEL[t]}
                                    <span className={cn(
                                        'inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                                        active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600',
                                    )}>
                                        {typeCounts[t]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Entity tabs */}
                <div className="flex items-center gap-1 mt-4 -mb-5">
                    {ENTITY_ORDER.map(e => {
                        const active = entity === e;
                        const Icon = ENTITY_ICON[e];
                        return (
                            <button
                                key={e}
                                type="button"
                                onClick={() => setEntity(e)}
                                className={cn(
                                    'inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                                    active
                                        ? 'text-blue-600 border-blue-600'
                                        : 'text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300',
                                )}
                            >
                                <Icon size={15} className={active ? 'text-blue-600' : 'text-slate-400'} />
                                {e}
                                <span className={cn(
                                    'inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                                    active ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/70 text-slate-600',
                                )}>
                                    {entityCounts[e]}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Body ─────────────────────────────────────────────────── */}
            <div className="px-8 py-6 space-y-5">
                {/* Record-type summary tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <SummaryTile label="Total Records"          value={records.length}        Icon={Layers}      accent="slate" />
                    <SummaryTile label="Compliances"            value={typeCounts.C}          Icon={Hash}        accent="blue" />
                    <SummaryTile label="Documents"              value={typeCounts.D}          Icon={FileText}    accent="violet" />
                    <SummaryTile label="Compliances & Documents" value={typeCounts.DC}        Icon={ShieldCheck} accent="emerald" />
                </div>

                <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-[13px] text-blue-800">
                    <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
                    <p>
                        Showing <strong>{rows.length}</strong> {RECORD_TYPE_LABEL[recordType].toLowerCase()} record{rows.length === 1 ? '' : 's'} for <strong>{entity}</strong>.
                        Use the category sub-tabs, search, and column controls below. Monitoring always tracks the expiry / renewal / next-due date — never the issue date.
                    </p>
                </div>

                {rows.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
                        No <strong>{RECORD_TYPE_LABEL[recordType]}</strong> records for <strong>{entity}</strong>.
                    </div>
                ) : (
                    <RecordsList
                        key={`${recordType}-${entity}`}
                        rows={rows}
                        recordType={recordType}
                        entity={entity}
                        visibleCols={visibleCols}
                        onVisibleColsChange={setVisibleCols}
                    />
                )}
            </div>
        </div>
    );
}

// ── Records list (search · columns · sort · pagination) ───────────────

function RecordsList({ rows, recordType, entity, visibleCols, onVisibleColsChange }: {
    rows: SafetyRecord[];
    recordType: RecordTypeId;
    entity: EntityId;
    visibleCols: Set<ColumnId>;
    onVisibleColsChange: (next: Set<ColumnId>) => void;
}) {
    const [activeCategory, setActiveCategory] = useState<KeyNumberGroup | 'All'>('All');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<{ col: ColumnId; dir: 'asc' | 'desc' } | null>(null);
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);
    // Actions → open the record detail modal (view or edit) on the Form or Data tab.
    const [detail, setDetail] = useState<{ record: SafetyRecord; tab: 'form' | 'data'; mode: 'view' | 'edit' } | null>(null);

    const categoryTabs = useMemo(() => {
        const present = SAFETY_CATEGORY_ORDER.filter(c => rows.some(r => r.category === c));
        return [
            { id: 'All' as KeyNumberGroup | 'All', label: 'All', count: rows.length },
            ...present.map(c => ({ id: c as KeyNumberGroup | 'All', label: c, count: rows.filter(r => r.category === c).length })),
        ];
    }, [rows]);

    const filtered = useMemo(() => {
        const byCat = activeCategory === 'All' ? rows : rows.filter(r => r.category === activeCategory);
        const q = search.trim().toLowerCase();
        return q ? byCat.filter(r => searchBlob(r).includes(q)) : byCat;
    }, [rows, activeCategory, search]);

    const sorted = useMemo(() => {
        if (!sort) return filtered;
        const col = COLUMNS.find(c => c.id === sort.col);
        if (!col) return filtered;
        const arr = [...filtered].sort((a, b) =>
            col.sortValue(a).localeCompare(col.sortValue(b), undefined, { numeric: true, sensitivity: 'base' }),
        );
        if (sort.dir === 'desc') arr.reverse();
        return arr;
    }, [filtered, sort]);

    // Any change to the working set resets to the first page.
    useEffect(() => { setPage(1); }, [activeCategory, search, sort, pageSize]);

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pageRows = sorted.slice(start, start + pageSize);

    const cols = COLUMNS.filter(c => visibleCols.has(c.id));

    const toggleSort = (id: ColumnId) => {
        setSort(prev =>
            prev && prev.col === id
                ? (prev.dir === 'asc' ? { col: id, dir: 'desc' } : null)
                : { col: id, dir: 'asc' },
        );
    };

    // View / Edit actions — shared by the desktop table and the mobile cards.
    const renderActions = (r: SafetyRecord) => (
        <div className="flex items-center gap-1">
            <button
                type="button"
                title="View (form & data)"
                onClick={() => setDetail({ record: r, tab: 'form', mode: 'view' })}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600"
            >
                <Eye size={16} />
            </button>
            <button
                type="button"
                title="Edit"
                onClick={() => setDetail({ record: r, tab: 'form', mode: 'edit' })}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600"
            >
                <SquarePen size={16} />
            </button>
        </div>
    );

    return (
        <>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-5 pb-4">
                <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Layers size={18} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">Records</h3>
                    <p className="text-[12px] text-slate-500">{RECORD_TYPE_LABEL[recordType]} · {entity}</p>
                </div>
            </div>

            <CardTabs tabs={categoryTabs} active={activeCategory} onChange={setActiveCategory} />

            {/* Toolbar — search + column selector */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 flex-wrap">
                <div className="relative flex-1 min-w-[220px] max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search records, numbers, jurisdiction…"
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                </div>
                <ColumnsDropdown visibleCols={visibleCols} onChange={onVisibleColsChange} />
            </div>

            {/* Records — full table on wide screens, stacked cards on smaller ones */}
            {pageRows.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-slate-500">
                    No records match your search.
                </div>
            ) : (
                <>
                    {/* Wide screens (xl+): full data table */}
                    <div className="hidden xl:block overflow-x-auto">
                        <table className="w-full min-w-[960px]">
                            <thead className="border-b border-slate-200 bg-slate-50/50">
                                <tr className="text-left">
                                    {cols.map(c => (
                                        <SortableTh key={c.id} col={c} sort={sort} onSort={toggleSort} />
                                    ))}
                                    <th className="px-4 py-2.5 pr-5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageRows.map(r => (
                                    <tr key={r.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 align-top">
                                        {cols.map(c => (
                                            <td key={c.id} className={cn('px-4 py-3.5 first:pl-5 align-top', c.cellClassName)}>
                                                {c.render(r)}
                                            </td>
                                        ))}
                                        <td className="px-4 py-3.5 pr-5 align-top">
                                            <div className="flex justify-end">{renderActions(r)}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Smaller screens: one card per record with labelled fields */}
                    <ul className="xl:hidden divide-y divide-slate-100">
                        {pageRows.map(r => {
                            const recordCol = cols.find(c => c.id === 'record');
                            const detailCols = cols.filter(c => c.id !== 'record');
                            return (
                                <li key={r.id} className="p-4 sm:px-5 hover:bg-slate-50/50">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            {recordCol
                                                ? recordCol.render(r)
                                                : <div className="text-sm font-semibold text-slate-900">{r.recordName}</div>}
                                        </div>
                                        <div className="shrink-0">{renderActions(r)}</div>
                                    </div>
                                    {detailCols.length > 0 && (
                                        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2.5 border-t border-slate-100 pt-3 sm:grid-cols-2">
                                            {detailCols.map(c => (
                                                <div key={c.id} className="flex items-start gap-3">
                                                    <span className="w-24 shrink-0 pt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                        {c.label}
                                                    </span>
                                                    <div className="min-w-0 flex-1 text-slate-700">{c.render(r)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}

            {/* Pagination footer */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 flex-wrap">
                <div className="flex items-center gap-3 text-[12px] text-slate-500">
                    <label className="flex items-center gap-1.5">
                        Rows per page
                        <select
                            value={pageSize}
                            onChange={e => setPageSize(Number(e.target.value))}
                            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        >
                            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </label>
                    <span className="tabular-nums">
                        {total === 0 ? '0' : `${start + 1}–${Math.min(start + pageSize, total)}`} of {total}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => setPage(safePage - 1)}
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={14} /> Prev
                    </button>
                    <span className="px-2 text-[12px] text-slate-600 tabular-nums">Page {safePage} of {totalPages}</span>
                    <button
                        type="button"
                        disabled={safePage >= totalPages}
                        onClick={() => setPage(safePage + 1)}
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Next <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </div>

        {detail && (
            <RecordDetailModal
                key={`${detail.record.id}-${detail.mode}`}
                record={detail.record}
                tab={detail.tab}
                mode={detail.mode}
                onTab={t => setDetail(d => (d ? { ...d, tab: t } : d))}
                onClose={() => setDetail(null)}
            />
        )}
        </>
    );
}

function SortableTh({ col, sort, onSort }: {
    col: ColumnDef;
    sort: { col: ColumnId; dir: 'asc' | 'desc' } | null;
    onSort: (id: ColumnId) => void;
}) {
    const active = sort?.col === col.id;
    const SortIcon = !col.sortable ? null : active ? (sort!.dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
    return (
        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 first:pl-5 last:pr-5 whitespace-nowrap">
            {col.sortable ? (
                <button
                    type="button"
                    onClick={() => onSort(col.id)}
                    className={cn('inline-flex items-center gap-1 hover:text-slate-700 transition-colors', active && 'text-blue-600')}
                >
                    {col.label}
                    {SortIcon && <SortIcon size={12} className={active ? 'text-blue-600' : 'text-slate-400'} />}
                </button>
            ) : col.label}
        </th>
    );
}

function ColumnsDropdown({ visibleCols, onChange }: {
    visibleCols: Set<ColumnId>;
    onChange: (next: Set<ColumnId>) => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
            >
                <Columns size={14} /> Columns <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
            </button>
            {open && (
                <>
                    <button type="button" aria-hidden className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white shadow-lg p-1.5">
                        <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Show columns</p>
                        {COLUMNS.map(c => {
                            const checked = visibleCols.has(c.id);
                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    disabled={c.locked}
                                    onClick={() => {
                                        const next = new Set(visibleCols);
                                        if (checked) next.delete(c.id); else next.add(c.id);
                                        onChange(next);
                                    }}
                                    className={cn(
                                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left',
                                        c.locked ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-50',
                                    )}
                                >
                                    <span className={cn(
                                        'flex h-4 w-4 items-center justify-center rounded border',
                                        checked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300',
                                    )}>
                                        {checked && <Check size={11} />}
                                    </span>
                                    <span className="text-slate-700">{c.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Record detail modal (View Form · View Data) ───────────────────────

function RecordDetailModal({ record, tab, mode, onTab, onClose }: {
    record: SafetyRecord;
    tab: 'form' | 'data';
    mode: 'view' | 'edit';
    onTab: (t: 'form' | 'data') => void;
    onClose: () => void;
}) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    const Icon = ENTITY_ICON[record.entity];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
            <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-slate-900">{record.recordName}</h3>
                            <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', RECORD_TYPE_TONE[record.type])}>
                                {RECORD_TYPE_LABEL[record.type]}
                            </span>
                            {mode === 'edit' && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                    <SquarePen size={10} /> Editing
                                </span>
                            )}
                        </div>
                        <p className="mt-0.5 text-[12px] text-slate-500">{record.description}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-600">
                                <Icon size={13} className="text-slate-400" /> {record.entity}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                {CATEGORY_SHORT[record.category]}
                            </span>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 border-b border-slate-200 px-5">
                    {([['form', 'Form', ClipboardList], ['data', 'Data', Table2]] as const).map(([id, label, TabIcon]) => {
                        const active = tab === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => onTab(id)}
                                className={cn(
                                    'inline-flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-semibold border-b-2 transition-colors',
                                    active ? 'text-blue-600 border-blue-600' : 'text-slate-500 hover:text-slate-800 border-transparent',
                                )}
                            >
                                <TabIcon size={14} /> {label}
                            </button>
                        );
                    })}
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-5">
                    {tab === 'form' ? <FormPreview r={record} editable={mode === 'edit'} /> : <DataView r={record} />}
                </div>
            </div>
        </div>
    );
}

const MODAL_INPUT_VIEW = 'h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500';
const MODAL_INPUT_EDIT = 'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

// Country / state options for the Jurisdiction selectors.
const COUNTRIES = ['United States', 'Canada', 'Mexico'];
const US_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
    'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming',
];
const CA_PROVINCES = [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
    'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec',
    'Saskatchewan', 'Yukon',
];
const MX_STATES = ['Baja California', 'Chihuahua', 'Coahuila', 'Nuevo León', 'Sonora', 'Tamaulipas'];
const STATES_BY_COUNTRY: Record<string, string[]> = {
    'United States': US_STATES,
    'Canada': CA_PROVINCES,
    'Mexico': MX_STATES,
};

/** Driver-license classes (for the CDL / license record's "License Class" field). */
const LICENSE_CLASSES = ['Class A', 'Class B', 'Class C', 'Class D', 'Class E', 'Class G', 'Class 1', 'Class 2', 'Class 3', 'Class 5'];

/** Best-effort parse of a jurisdiction string into { country, state } to pre-fill the selectors. */
function parseJurisdiction(j: string): { country: string; state: string } {
    const lower = j.toLowerCase();
    let country = '';
    if (lower.includes('canada')) country = 'Canada';
    else if (lower.includes('mexico') && !lower.includes('new mexico')) country = 'Mexico';
    else if (lower.includes('united states') || lower.includes('u.s') || /\bus\b/.test(lower) || lower.includes('federal')) country = 'United States';
    // If a province/state name is present, infer both the state and (if unset) its country.
    for (const [ctry, states] of Object.entries(STATES_BY_COUNTRY)) {
        const hit = states.find(s => lower.includes(s.toLowerCase()));
        if (hit) return { country: country || ctry, state: hit };
    }
    return { country, state: '' };
}

/** Deterministic sample value for the "Fill demo data" button. */
function sampleNumber(r: SafetyRecord): string {
    let h = 0;
    for (const c of r.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const digits = String((h % 900000) + 100000);
    const prefix = (r.numberName.match(/[A-Za-z]/g)?.slice(0, 3).join('') || 'NUM').toUpperCase();
    return `${prefix}-${digits}`;
}

/** Deterministic sample uploaded file for the demo / click-to-upload. */
function sampleFile(r: SafetyRecord): { name: string; size: string } {
    const slug = r.documentName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'document';
    let h = 0;
    for (const c of r.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return { name: `${slug}.pdf`, size: `${(h % 900) + 120} KB` };
}

/** Human-readable size for a real uploaded file. */
function fmtSize(bytes: number): string {
    if (!bytes) return '—';
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}

/** Name of the signed-in user (for "uploaded by"), falling back gracefully. */
function currentUserName(): string {
    try {
        const id = localStorage.getItem('app_current_user_id');
        return APP_USERS.find(u => u.id === id)?.name ?? 'You';
    } catch {
        return 'You';
    }
}

/** Format an ISO/date string as "Jan 15, 2026 · 9:24 AM". */
function fmtDateTime(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const date = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${date} · ${time}`;
}

function FieldPreview({ label, required, optional, hint, children }: {
    label: string; required?: boolean; optional?: boolean; hint?: string; children: React.ReactNode;
}) {
    return (
        <div>
            <div className="mb-1 flex items-center gap-2">
                <label className="text-[12px] font-semibold text-slate-600">{label}</label>
                {required && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-600">Required</span>}
                {optional && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">Optional</span>}
            </div>
            {children}
            {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
        </div>
    );
}

/** Drag-and-drop (or click) file dropzone. Reused by the single document and each dated version. */
function Dropzone({ editable, onFile, label, hint, compact }: {
    editable: boolean;
    onFile: (f: File) => void;
    label: string;
    hint?: string;
    compact?: boolean;
}) {
    const [dragging, setDragging] = useState(false);
    const take = (list: FileList | null | undefined) => { const f = list?.[0]; if (f) onFile(f); };
    return (
        <label
            onDragOver={editable ? e => { e.preventDefault(); setDragging(true); } : undefined}
            onDragLeave={editable ? () => setDragging(false) : undefined}
            onDrop={editable ? e => { e.preventDefault(); setDragging(false); take(e.dataTransfer.files); } : undefined}
            className={cn(
                'flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-center transition-colors',
                compact ? 'px-3 py-3' : 'px-4 py-6',
                !editable
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
                    : dragging
                        ? 'cursor-copy border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                        : 'cursor-pointer border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40',
            )}
        >
            <input type="file" className="hidden" disabled={!editable} onChange={e => { take(e.target.files); e.target.value = ''; }} />
            <UploadCloud size={compact ? 16 : 20} className={dragging ? 'text-blue-500' : 'text-slate-400'} />
            <p className="text-[12px] font-medium text-slate-600">{dragging ? 'Drop file to upload' : label}</p>
            {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
        </label>
    );
}

/**
 * Open an uploaded document in a new tab. Real uploads open their actual object-URL (the real
 * PDF/image); demo/sample files (no url) open a labelled stand-in preview so "View" always works.
 */
function openFilePreview(url: string, name: string) {
    if (url) { window.open(url, '_blank', 'noopener,noreferrer'); return; }
    const safe = name.replace(/[<>&]/g, '');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${safe}</title></head>`
        + `<body style="margin:0;font-family:system-ui,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f1f5f9;color:#334155">`
        + `<div style="text-align:center;padding:24px"><div style="font-size:56px">📄</div>`
        + `<h1 style="font-size:18px;margin:12px 0 4px">${safe}</h1>`
        + `<p style="color:#64748b;font-size:13px;max-width:360px">Sample document preview — no real file was uploaded for this demo record. Upload a file to view the actual document.</p></div></body></html>`;
    const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
}

/** Uploaded-file chip with View + Remove. `compact` = the small in-version card; default = the prominent single-doc card. */
function FileCard({ name, size, url, editable, onRemove, compact }: {
    name: string; size: string; url?: string; editable: boolean; onRemove: () => void; compact?: boolean;
}) {
    if (compact) {
        return (
            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                <FileText size={15} className="shrink-0 text-slate-500" />
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-slate-700">{name}</span>
                <span className="shrink-0 text-[11px] text-slate-400">{size}</span>
                <button type="button" onClick={() => openFilePreview(url ?? '', name)} title="View document" className="shrink-0 text-slate-400 hover:text-blue-600"><Eye size={14} /></button>
                {editable && <button type="button" onClick={onRemove} title="Remove file" className="shrink-0 text-slate-400 hover:text-rose-600"><X size={13} /></button>}
            </div>
        );
    }
    // Prominent tile — matches the hiring Application's uploaded-document tile.
    return (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-500 shadow-sm"><FileText size={18} /></div>
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-800">{name}</div>
                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check size={13} /> Uploaded{size ? ` · ${size}` : ''}</div>
            </div>
            <button type="button" onClick={() => openFilePreview(url ?? '', name)} title="View document" className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <Eye size={13} /> View
            </button>
            {editable && <button type="button" onClick={onRemove} title="Remove file" className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-white hover:text-rose-600"><X size={14} /></button>}
        </div>
    );
}

/** A stored uploaded file (real upload keeps an object URL; demo files have none). */
type DocFile = { name: string; size: string; url: string };

const SINGLE_SLOT = '__main__';

/** Upload slots for a record's document — its labelled slots (Front/Back) or one implicit slot. */
function docSlots(r: SafetyRecord): string[] {
    return r.slotLabels && r.slotLabels.length ? r.slotLabels : [SINGLE_SLOT];
}

/** DocFile from a real uploaded File (keeps an object URL so it can be viewed). */
function toDocFile(f: File): DocFile {
    return { name: f.name, size: fmtSize(f.size), url: URL.createObjectURL(f) };
}

/** Deterministic demo filename for a slot. */
function slotFileName(r: SafetyRecord, slot: string, year?: number): string {
    const slug = r.documentName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'document';
    const parts = [slug];
    if (slot !== SINGLE_SLOT) parts.push(slot.toLowerCase());
    if (year) parts.push(String(year));
    return `${parts.join('-')}.pdf`;
}

/** Demo file map for a record's document (fills every slot). */
function demoDocFiles(r: SafetyRecord, year?: number): Record<string, DocFile> {
    if (!r.documentName) return {};
    const size = sampleFile(r).size;
    return Object.fromEntries(docSlots(r).map(s => [s, { name: slotFileName(r, s, year), size, url: '' }]));
}

/**
 * Document upload area — one uploader for a single-slot document, or a labelled uploader per slot
 * (e.g. Driver's License Front / Back). Files are keyed by slot label.
 */
function DocumentUploader({ r, files, editable, compact, onChange }: {
    r: SafetyRecord;
    files: Record<string, DocFile>;
    editable: boolean;
    compact?: boolean;
    onChange: (files: Record<string, DocFile>) => void;
}) {
    const slots = docSlots(r);
    const setSlot = (slot: string, file: DocFile | null) => {
        const next = { ...files };
        if (file) next[slot] = file; else delete next[slot];
        onChange(next);
    };

    // Single implicit slot — the original single-file uploader.
    if (slots.length === 1 && slots[0] === SINGLE_SLOT) {
        const f = files[SINGLE_SLOT];
        return f
            ? <FileCard compact={compact} name={f.name} size={f.size} url={f.url} editable={editable} onRemove={() => setSlot(SINGLE_SLOT, null)} />
            : <Dropzone compact={compact} editable={editable} label={`Drag ${r.documentName} here or click${compact ? '' : ' to upload'}`} hint={compact ? undefined : 'PDF, image or scan'} onFile={file => setSlot(SINGLE_SLOT, toDocFile(file))} />;
    }

    // Labelled slots (Front / Back) — one application-style tile each, side by side.
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {slots.map(slot => {
                const f = files[slot];
                return (
                    <div key={slot}>
                        <p className="mb-1 text-xs font-semibold text-slate-500">{slot}</p>
                        {f
                            ? <FileCard compact={compact} name={f.name} size={f.size} url={f.url} editable={editable} onRemove={() => setSlot(slot, null)} />
                            : <Dropzone compact={compact} editable={editable} label={`Drag ${slot} here or click`} onFile={file => setSlot(slot, toDocFile(file))} />}
                    </div>
                );
            })}
        </div>
    );
}

/** One dated version bundles its OWN jurisdiction + number + dates + document(s) + tags + monitoring. */
type Ver = {
    label: string;                // editable display name (rename via pencil)
    number: string; issueDate: string; monitorDate: string; status: string;
    files: Record<string, DocFile>; year: number;   // document files keyed by slot
    country: string; stateProv: string; tags: string[];
    licenseClass: string; cdl: string; endorsements: string;   // driver-license fields (isLicense records)
    monitoring: MonitoringConfig;
    uploadedBy: string;           // who uploaded this version
    uploadedAt: string;           // when (ISO date-time)
};

/**
 * Removable tag chips + a "saved tag" dropdown (reuse) + a "new tag" input.
 * `catalog` = all previously-saved tags (from the Settings ▸ Tags store); adding a new tag
 * bubbles up via onAdd, and the parent both selects it here and persists it to the catalog.
 */
function TagEditor({ tags, editable, catalog, onAdd, onRemove }: {
    tags: string[]; editable: boolean; catalog: string[]; onAdd: (t: string) => void; onRemove: (t: string) => void;
}) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const atMax = tags.length >= MAX_DOC_TAGS;

    const add = (t: string) => {
        const v = t.trim();
        if (!v || atMax || tags.some(x => x.toLowerCase() === v.toLowerCase())) { setQuery(''); return; }
        onAdd(v);
        setQuery('');
        setOpen(false);
    };

    const qTrim = query.trim();
    const ql = qTrim.toLowerCase();
    // 3-tier ranking: direct name matches, then same-section (group-title) matches, then synonym
    // matches — so "permit" shows the permit tags, then the rest of Permits & Authority, then related.
    const candidates = catalog.filter(t => !tags.some(x => x.toLowerCase() === t.toLowerCase()));
    const groupHit = (t: string) => {
        const g = groupTitleOf(t)?.toLowerCase();
        return !!g && !!ql && (g.includes(ql) || ql.includes(g));
    };
    const direct = candidates.filter(t => t.toLowerCase().includes(ql));
    const rest = candidates.filter(t => !t.toLowerCase().includes(ql));
    const group = rest.filter(groupHit);
    const related = rest.filter(t => !groupHit(t) && smartTagMatch(query, t));
    const suggestions = [...direct, ...group, ...related].slice(0, 10);
    const exactExists = [...catalog, ...tags].some(t => t.toLowerCase() === qTrim.toLowerCase());
    const canCreate = qTrim.length > 0 && !exactExists;
    const handleAdd = () => {
        if (canCreate) add(qTrim);
        else if (suggestions.length) add(suggestions[0]);
        else if (qTrim) add(qTrim);
    };

    return (
        <div className="w-full">
            <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    <Tag size={12} className="text-slate-400" />
                    <span className="text-[11px] font-semibold text-slate-500">Tags</span>
                </div>
                {editable && <span className={cn('text-[10px] font-bold tabular-nums', atMax ? 'text-amber-600' : 'text-slate-400')}>{tags.length}/{MAX_DOC_TAGS}</span>}
            </div>

            {/* Selected tags — colour-coded chips, full width */}
            {(tags.length > 0 || !editable) && (
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {tags.map(t => (
                        <span key={t} className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold', tagColor(t))}>
                            {t}
                            {editable && (
                                <button type="button" onClick={() => onRemove(t)} className="opacity-60 hover:opacity-100" title="Remove tag"><X size={10} /></button>
                            )}
                        </span>
                    ))}
                    {tags.length === 0 && !editable && <span className="text-[12px] text-slate-400">No tags</span>}
                </div>
            )}

            {/* Searchable smart combobox — full width */}
            {editable && (
                atMax ? (
                    <p className="text-[11px] font-medium text-amber-600">Maximum of {MAX_DOC_TAGS} tags reached — remove one to add another.</p>
                ) : (
                    <div className="relative w-full">
                        {/* z-30 keeps the input + Add button clickable above the dropdown's z-10 backdrop */}
                        <div className="relative z-30 flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={query}
                                    onChange={e => { setQuery(e.target.value); setOpen(true); }}
                                    onFocus={() => setOpen(true)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
                                        else if (e.key === 'Escape') { setOpen(false); }
                                    }}
                                    placeholder="Search or add a tag…"
                                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-400"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleAdd}
                                disabled={!qTrim}
                                className={cn(
                                    'inline-flex shrink-0 items-center gap-1 h-9 px-3.5 rounded-lg text-[13px] font-semibold transition-colors',
                                    qTrim ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                                )}
                            >
                                <Plus size={14} /> Add
                            </button>
                        </div>
                        {open && (
                            <>
                                <button type="button" aria-hidden className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
                                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                                    {suggestions.length === 0 && !canCreate && (
                                        <p className="px-2 py-2 text-[12px] text-slate-400">No matching tags.</p>
                                    )}
                                    {suggestions.map(t => (
                                        <button key={t} type="button" onClick={() => add(t)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-slate-50">
                                            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', tagColor(t))}>{t}</span>
                                        </button>
                                    ))}
                                    {canCreate && (
                                        <button type="button" onClick={() => add(qTrim)} className={cn('mt-1 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[12px] font-semibold text-blue-700 hover:bg-blue-50', suggestions.length > 0 && 'border-t border-slate-100 pt-2')}>
                                            <Plus size={13} /> Create &ldquo;{qTrim}&rdquo;
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )
            )}
        </div>
    );
}

/** A single dated version — the same clean form as the "single" layout, repeated per renewal, fully self-contained. */
function VersionCard({ r, v, index, editable, inputCls, numberRequired, tagCatalog, onAddToCatalog, onChange, onRemove }: {
    r: SafetyRecord;
    v: Ver;
    index: number;
    editable: boolean;
    inputCls: string;
    numberRequired: boolean;
    tagCatalog: string[];
    onAddToCatalog: (t: string) => void;
    onChange: (patch: Partial<Ver>) => void;
    onRemove: () => void;
}) {
    const isCurrent = index === 0;
    const [renaming, setRenaming] = useState(false);
    const [draft, setDraft] = useState(v.label);
    const [infoOpen, setInfoOpen] = useState(false);
    const states = STATES_BY_COUNTRY[v.country] ?? [];
    const onCountry = (val: string) => {
        const patch: Partial<Ver> = { country: val };
        if (!(STATES_BY_COUNTRY[val] ?? []).includes(v.stateProv)) patch.stateProv = '';
        onChange(patch);
    };
    const commitRename = () => { const t = draft.trim(); onChange({ label: t || v.label }); if (!t) setDraft(v.label); setRenaming(false); };
    return (
        <div className={cn('rounded-xl border p-4', isCurrent ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white')}>
            <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    {isCurrent && <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700"><Check size={9} /> Current</span>}
                    {renaming ? (
                        <input
                            autoFocus
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitRename(); } else if (e.key === 'Escape') { setDraft(v.label); setRenaming(false); } }}
                            onBlur={commitRename}
                            className="h-7 w-44 rounded-md border border-blue-300 bg-white px-2 text-[13px] font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    ) : (
                        <span className="truncate text-[13px] font-semibold text-slate-700">{v.label}</span>
                    )}
                    {editable && !renaming && (
                        <button type="button" onClick={() => { setDraft(v.label); setRenaming(true); }} title="Rename version" className="rounded p-0.5 text-slate-400 hover:text-blue-600"><SquarePen size={13} /></button>
                    )}
                    {/* Version details (who uploaded it, when) */}
                    <div className="relative">
                        <button type="button" onClick={() => setInfoOpen(o => !o)} title="Version details" className={cn('rounded p-0.5 hover:text-blue-600', infoOpen ? 'text-blue-600' : 'text-slate-400')}><Info size={14} /></button>
                        {infoOpen && (
                            <>
                                <button type="button" aria-hidden className="fixed inset-0 z-10 cursor-default" onClick={() => setInfoOpen(false)} />
                                <div className="absolute left-0 top-full z-20 mt-1 w-60 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Version details</p>
                                    <div className="space-y-1.5 text-[12px]">
                                        <div className="flex items-center gap-2">
                                            <User size={13} className="shrink-0 text-slate-400" />
                                            <span className="text-slate-500">Uploaded by</span>
                                            <span className="ml-auto truncate font-semibold text-slate-800">{v.uploadedBy || '—'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CalendarClock size={13} className="shrink-0 text-slate-400" />
                                            <span className="text-slate-500">When</span>
                                            <span className="ml-auto font-semibold text-slate-800">{fmtDateTime(v.uploadedAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {r.isLicense && v.licenseClass && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{v.licenseClass}</span>
                    )}
                    {editable && (
                        <button type="button" onClick={onRemove} title="Remove version" className="rounded-md p-1 text-slate-400 hover:text-rose-600"><X size={14} /></button>
                    )}
                </div>
            </div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Details</p>
            {r.isLicense ? (
                // Driver-license field set — matches the hiring Application license card.
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FieldPreview label="License Number" required={numberRequired}>
                        <input disabled={!editable} value={v.number} onChange={e => onChange({ number: e.target.value })} placeholder="Enter license number" className={inputCls} />
                    </FieldPreview>
                    <FieldPreview label="Country">
                        <select disabled={!editable} value={v.country} onChange={e => onCountry(e.target.value)} className={inputCls}>
                            <option value="">Select country</option>
                            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </FieldPreview>
                    <FieldPreview label="Licensing Authority">
                        <select disabled={!editable || states.length === 0} value={v.stateProv} onChange={e => onChange({ stateProv: e.target.value })} className={inputCls}>
                            <option value="">{states.length ? 'Select state / province' : '—'}</option>
                            {states.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </FieldPreview>
                    <FieldPreview label="License Class">
                        <select disabled={!editable} value={v.licenseClass} onChange={e => onChange({ licenseClass: e.target.value })} className={inputCls}>
                            <option value="">Select class</option>
                            {LICENSE_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </FieldPreview>
                    <FieldPreview label="Issue Date">
                        <input type="date" disabled={!editable} value={v.issueDate} onChange={e => onChange({ issueDate: e.target.value })} className={inputCls} />
                    </FieldPreview>
                    <FieldPreview label="Expiration Date" required>
                        <input type="date" disabled={!editable} value={v.monitorDate} onChange={e => onChange({ monitorDate: e.target.value })} className={inputCls} />
                    </FieldPreview>
                    <FieldPreview label="Commercial (CDL)">
                        <select disabled={!editable} value={v.cdl} onChange={e => onChange({ cdl: e.target.value })} className={inputCls}>
                            <option value="">—</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </FieldPreview>
                    <FieldPreview label="Endorsements">
                        <input disabled={!editable} value={v.endorsements} onChange={e => onChange({ endorsements: e.target.value })} placeholder="e.g. HazMat, Tanker" className={inputCls} />
                    </FieldPreview>
                </div>
            ) : (
                // Generic field set — jurisdiction + number + dates.
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FieldPreview label="Country">
                        <select disabled={!editable} value={v.country} onChange={e => onCountry(e.target.value)} className={inputCls}>
                            <option value="">Select country</option>
                            {(r.allCountries ? ALL_COUNTRIES : COUNTRIES).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </FieldPreview>
                    {!r.hideState && (
                        <FieldPreview label="State / Province">
                            <select disabled={!editable || states.length === 0} value={v.stateProv} onChange={e => onChange({ stateProv: e.target.value })} className={inputCls}>
                                <option value="">{states.length ? 'Select state / province' : '—'}</option>
                                {states.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </FieldPreview>
                    )}
                    {r.numberName && (
                        <FieldPreview label={r.numberName} required={numberRequired}>
                            <input disabled={!editable} value={v.number} onChange={e => onChange({ number: e.target.value })} placeholder={`Enter ${r.numberName}`} className={inputCls} />
                        </FieldPreview>
                    )}
                    {r.tracksIssueDate && (
                        <FieldPreview label="Issue / Effective Date">
                            <input type="date" disabled={!editable} value={v.issueDate} onChange={e => onChange({ issueDate: e.target.value })} className={inputCls} />
                        </FieldPreview>
                    )}
                    {isDateMonitored(r) ? (
                        <FieldPreview label={r.monitorType} required>
                            <input type="date" disabled={!editable} value={v.monitorDate} onChange={e => onChange({ monitorDate: e.target.value })} className={inputCls} />
                        </FieldPreview>
                    ) : (
                        <FieldPreview label="Status" required>
                            <select disabled={!editable} value={v.status} onChange={e => onChange({ status: e.target.value })} className={inputCls}>
                                <option value="">Select status</option>
                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </FieldPreview>
                    )}
                </div>
            )}
            {/* Uploaded document(s) — application-style tile(s); single file, or Front/Back slots */}
            <div className="mt-4 border-t border-slate-200 pt-4">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Uploaded Document</p>
                <DocumentUploader r={r} files={v.files} editable={editable} onChange={files => onChange({ files })} />
            </div>
            {/* Monitoring — its own separated section (enable on the current version; previous versions stay off) */}
            <div className="mt-4 border-t border-slate-200 pt-4">
                <MonitoringSettings r={r} value={v.monitoring} expiryDate={v.monitorDate} issueDate={v.issueDate} status={v.status} editable={editable} onChange={m => onChange({ monitoring: m })} />
            </div>
            {/* Tags — its own separated section */}
            {r.documentName && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                    <TagEditor
                        tags={v.tags}
                        editable={editable}
                        catalog={tagCatalog}
                        onAdd={t => {
                            if (!v.tags.some(x => x.toLowerCase() === t.toLowerCase())) onChange({ tags: [...v.tags, t] });
                            onAddToCatalog(t);
                        }}
                        onRemove={t => onChange({ tags: v.tags.filter(x => x !== t) })}
                    />
                </div>
            )}
        </div>
    );
}

// ── Monitoring & Notifications ────────────────────────────────────────

type MonitorBasis = 'issue' | 'expiry' | 'custom' | 'status';
interface MonitoringConfig {
    enabled: boolean;
    basis: MonitorBasis;          // what drives the reminders (a date, or the status value)
    customDate: string;           // manually-entered date when basis === 'custom'
    recurrence: string;           // renewal cadence (id from RECURRENCE_OPTIONS)
    reminders: number[];          // days-before reminder offsets (0 = on the date)
    channels: { email: boolean; inApp: boolean };
}

// Status values for status-based records (the monitored value captured in the form).
const STATUS_OPTIONS = ['Active', 'Pending', 'On File', 'Complete', 'Incomplete', 'Expired', 'Inactive'];

const RECURRENCE_OPTIONS: { id: string; label: string }[] = [
    { id: 'none', label: 'Does not recur' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'quarterly', label: 'Quarterly (Every 3 Months)' },
    { id: 'semiannually', label: 'Semi-Annually (Every 6 Months)' },
    { id: 'annually', label: 'Annually (Every 1 Year)' },
    { id: 'biennially', label: 'Every 2 Years' },
    { id: 'triennially', label: 'Every 3 Years' },
    { id: 'fiveyearly', label: 'Every 5 Years' },
];
const REMINDER_OPTIONS = [90, 60, 30, 7, 0]; // 0 = "On the date"
const reminderLabel = (d: number) => (d === 0 ? 'On the date' : `${d} Days Before`);

/** Map the record's free-text `recurring` note onto a recurrence option. */
function recurrenceFromRecord(r: SafetyRecord): string {
    const s = r.recurring.toLowerCase();
    if (/no (fixed|normal|scheduled|independent)|does not expire|usually static|static/.test(s)) return 'none';
    if (s.includes('month')) return 'monthly';
    if (s.includes('quarter')) return 'quarterly';
    if (s.includes('semi')) return 'semiannually';
    if (s.includes('bienn') || s.includes('every 2') || s.includes('2 year')) return 'biennially';
    if (s.includes('annual') || s.includes('yearly') || s.includes('year')) return 'annually';
    // "Recurring" / "Yes" / "Variable" / "Account-based" / "Periodic" → default to annual, user can change.
    return 'annually';
}

/** Sensible starting monitoring config derived from the record's classification. Starts OFF. */
function defaultMonitoring(r: SafetyRecord): MonitoringConfig {
    const statusBased = !isDateMonitored(r);
    return {
        enabled: false,                        // off by default — user opts in per record / current version
        basis: statusBased ? 'status' : 'expiry',
        customDate: '',
        recurrence: recurrenceFromRecord(r),
        reminders: statusBased ? [] : [90, 60, 30],
        channels: { email: true, inApp: true },
    };
}

function RadioPill({ label, checked, disabled, onClick }: { label: string; checked: boolean; disabled?: boolean; onClick: () => void }) {
    return (
        <button type="button" disabled={disabled} onClick={onClick} className={cn('inline-flex items-center gap-2 text-[13px]', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}>
            <span className={cn('flex h-4 w-4 items-center justify-center rounded-full border-2', checked ? 'border-blue-600' : 'border-slate-300')}>
                {checked && <span className="h-2 w-2 rounded-full bg-blue-600" />}
            </span>
            <span className={checked ? 'font-semibold text-slate-800' : 'text-slate-600'}>{label}</span>
        </button>
    );
}

function CheckRow({ label, checked, disabled, onClick }: { label: string; checked: boolean; disabled?: boolean; onClick: () => void }) {
    return (
        <button type="button" disabled={disabled} onClick={onClick} className={cn('inline-flex items-center gap-2 text-[13px] text-left', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}>
            <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border', checked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300')}>
                {checked && <Check size={11} />}
            </span>
            <span className={checked ? 'font-medium text-slate-800' : 'text-slate-600'}>{label}</span>
        </button>
    );
}

/**
 * Monitoring & Notifications module — embedded in the form so each record's renewal / expiry
 * (or status) can be watched with reminder offsets and channels. Reflects the record's own
 * monitorType (never the issue date unless tracked) and recurrence.
 */
function MonitoringSettings({ r, value, expiryDate = '', issueDate = '', status = '', editable, onChange }: {
    r: SafetyRecord; value: MonitoringConfig; expiryDate?: string; issueDate?: string; status?: string; editable: boolean; onChange: (next: MonitoringConfig) => void;
}) {
    const set = (patch: Partial<MonitoringConfig>) => onChange({ ...value, ...patch });
    // Switching basis: status monitoring has no date reminders → clear them; returning to a date basis restores sensible defaults.
    const setBasis = (basis: MonitorBasis) => {
        if (basis === 'status') onChange({ ...value, basis, reminders: [] });
        else onChange({ ...value, basis, reminders: value.reminders.length ? value.reminders : [90, 60, 30] });
    };
    const [collapsed, setCollapsed] = useState(false); // when enabled, the body can be collapsed to just the header
    const dateMonitored = isDateMonitored(r);
    const isStatus = value.basis === 'status';
    const basisLabel = value.basis === 'issue' ? 'Issue date' : value.basis === 'custom' ? 'Custom date' : value.basis === 'status' ? 'Status' : 'Expiry date';
    // The single concrete date the alerts are computed from — resolved from the chosen basis (status has no date).
    const monitoredDate = value.basis === 'issue' ? issueDate : value.basis === 'custom' ? value.customDate : value.basis === 'status' ? '' : expiryDate;
    const recLabel = RECURRENCE_OPTIONS.find(o => o.id === value.recurrence)?.label ?? 'Annually';
    const sortedReminders = [...value.reminders].sort((a, b) => b - a);
    const daysBefore = sortedReminders.filter(d => d > 0);
    const onDateReminder = sortedReminders.includes(0);
    const remindText = [daysBefore.length ? `${daysBefore.join(', ')} days before` : null, onDateReminder ? 'on the date' : null].filter(Boolean).join(' and ');
    const remindSentence = remindText ? `Reminders ${remindText}` : 'No reminders selected';
    const channelText = [value.channels.email && 'Email', value.channels.inApp && 'In-App'].filter(Boolean).join(', ') || 'no channels';

    const toggleReminder = (d: number) =>
        set({ reminders: value.reminders.includes(d) ? value.reminders.filter(x => x !== d) : [...value.reminders, d] });

    return (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {/* Header + enable toggle */}
            <div className="flex items-center justify-between gap-3 border-l-2 border-blue-500 bg-slate-50/70 px-4 py-3">
                <div className="flex items-center gap-2">
                    <Bell size={15} className="text-blue-500" />
                    <h4 className="text-[13px] font-bold text-slate-800">Monitoring &amp; Notifications</h4>
                    {value.enabled && (
                        <button
                            type="button"
                            onClick={() => setCollapsed(c => !c)}
                            title={collapsed ? 'Expand' : 'Collapse'}
                            aria-expanded={!collapsed}
                            className="ml-0.5 rounded p-0.5 text-slate-400 hover:text-slate-700"
                        >
                            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-slate-600">{value.enabled ? 'Enabled' : 'Disabled'}</span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={value.enabled}
                        aria-label="Enable monitoring"
                        disabled={!editable}
                        onClick={() => set({ enabled: !value.enabled })}
                        className={cn('relative h-5 w-9 rounded-full transition-colors', value.enabled ? 'bg-blue-600' : 'bg-slate-300', !editable && 'opacity-60 cursor-not-allowed')}
                    >
                        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', value.enabled ? 'left-[18px]' : 'left-0.5')} />
                    </button>
                </div>
            </div>

            {value.enabled && !collapsed ? (
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {/* Monitor based on + date/status + recurrence */}
                        <div className="space-y-4">
                            <div>
                                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Monitor based on</p>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                    {r.tracksIssueDate && <RadioPill label="Issue date" checked={value.basis === 'issue'} disabled={!editable} onClick={() => setBasis('issue')} />}
                                    {dateMonitored && <RadioPill label="Expiry date" checked={value.basis === 'expiry'} disabled={!editable} onClick={() => setBasis('expiry')} />}
                                    <RadioPill label="Custom date" checked={value.basis === 'custom'} disabled={!editable} onClick={() => setBasis('custom')} />
                                    {!dateMonitored && <RadioPill label="Status based" checked={value.basis === 'status'} disabled={!editable} onClick={() => setBasis('status')} />}
                                </div>
                            </div>
                            {isStatus ? (
                                <div>
                                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status to monitor</p>
                                    <div className={cn('inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-semibold',
                                        status ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-400')}>
                                        <Activity size={14} /> {status || 'Set the status in the form above'}
                                    </div>
                                    <p className="mt-1 text-[10px] text-slate-400">Monitors the Status field above — you’re alerted when it changes.</p>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Date to monitor</p>
                                        {value.basis === 'custom' ? (
                                            <>
                                                <input
                                                    type="date"
                                                    disabled={!editable}
                                                    value={value.customDate}
                                                    onChange={e => set({ customDate: e.target.value })}
                                                    className={editable ? MODAL_INPUT_EDIT : MODAL_INPUT_VIEW}
                                                />
                                                <p className="mt-1 text-[10px] text-slate-400">Enter a specific date to monitor — independent of the expiry / issue date.</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className={cn(
                                                    'inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-semibold',
                                                    monitoredDate ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-400',
                                                )}>
                                                    <CalendarClock size={14} />
                                                    {monitoredDate || `Set the ${basisLabel.toLowerCase()} above`}
                                                </div>
                                                <p className="mt-1 text-[10px] text-slate-400">Pulled from the {basisLabel.toLowerCase()} above — pick “Custom date” to enter your own.</p>
                                            </>
                                        )}
                                    </div>
                                    <div>
                                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Renewal recurrence</p>
                                        <select disabled={!editable} value={value.recurrence} onChange={e => set({ recurrence: e.target.value })} className={editable ? MODAL_INPUT_EDIT : MODAL_INPUT_VIEW}>
                                            {RECURRENCE_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Reminders + channels */}
                        <div className="space-y-4">
                            <div>
                                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Notification reminders</p>
                                {isStatus ? (
                                    <p className="text-[11px] text-slate-400">Date reminders don’t apply to status monitoring — you’re notified whenever the status changes.</p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                        {REMINDER_OPTIONS.map(d => (
                                            <CheckRow key={d} label={reminderLabel(d)} checked={value.reminders.includes(d)} disabled={!editable} onClick={() => toggleReminder(d)} />
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Notification channels</p>
                                <div className="flex flex-wrap items-center gap-4">
                                    <CheckRow label="Email" checked={value.channels.email} disabled={!editable} onClick={() => set({ channels: { ...value.channels, email: !value.channels.email } })} />
                                    <CheckRow label="In-App" checked={value.channels.inApp} disabled={!editable} onClick={() => set({ channels: { ...value.channels, inApp: !value.channels.inApp } })} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Projected schedule */}
                    <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-[12px] text-blue-800">
                        <Bell size={14} className="mt-0.5 shrink-0 text-blue-500" />
                        <div className="min-w-0">
                            <p className="font-semibold">Projected Notification Schedule</p>
                            <p className="text-blue-700">
                                {isStatus
                                    ? `Monitor status${status ? ` (${status})` : ''}. Notify on any status change · via ${channelText}.`
                                    : `Monitor ${basisLabel.toLowerCase()}${monitoredDate ? ` (${monitoredDate})` : ''}. ${remindSentence}${value.recurrence !== 'none' ? ` · repeats ${recLabel.replace(/\s*\(.*\)/, '')}` : ''} · via ${channelText}.`}
                            </p>
                        </div>
                    </div>
                </div>
            ) : null /* OFF → only the header/switch is shown */}
        </div>
    );
}

function FormPreview({ r, editable }: { r: SafetyRecord; editable: boolean }) {
    const numberRequired = r.type === 'C' || r.type === 'DC';
    const inputCls = editable ? MODAL_INPUT_EDIT : MODAL_INPUT_VIEW;
    const parsed = useMemo(() => parseJurisdiction(r.jurisdiction), [r.jurisdiction]);

    const multiUpload = r.uploadMode === 'recurring' || r.uploadMode === 'event';

    // Reusable tag catalog (Settings ▸ Tags) — powers the "saved tag" dropdown; custom tags persist back here.
    const { tags: tagCatalog, add: addToCatalog } = useSafetyTags();

    // Single set (single-upload document or compliance-only record): shared jurisdiction + one number + dates + one file + tags.
    const [country, setCountry] = useState(parsed.country);
    const [stateProv, setStateProv] = useState(parsed.state);
    const [tags, setTags] = useState<string[]>([]);
    const [number, setNumber] = useState('');
    const [issueDate, setIssueDate] = useState('');
    const [monitorDate, setMonitorDate] = useState('');
    const [status, setStatus] = useState('');
    const [singleFiles, setSingleFiles] = useState<Record<string, DocFile>>({});

    // Multi (recurring / event): each dated version is fully self-contained (own jurisdiction + number + dates + document + tags).
    const [versions, setVersions] = useState<Ver[]>([]);

    // Monitoring & notifications config for this record (preview-only).
    const [monitoring, setMonitoring] = useState<MonitoringConfig>(() => defaultMonitoring(r));

    const states = STATES_BY_COUNTRY[country] ?? [];
    const onCountry = (v: string) => {
        setCountry(v);
        if (!(STATES_BY_COUNTRY[v] ?? []).includes(stateProv)) setStateProv('');
    };

    const isLic = !!r.isLicense;
    const mkVersion = (year: number, demoTags: string[] = []): Ver => ({
        label: `Version ${year}`,
        number: r.numberName ? sampleNumber(r) : '',
        issueDate: r.tracksIssueDate ? `${year - 1}-01-15` : '',
        monitorDate: `${year}-12-31`,
        status: isDateMonitored(r) ? '' : 'Active',
        files: demoDocFiles(r, year),
        year,
        country: isLic ? 'United States' : parsed.country,
        stateProv: isLic ? 'Illinois' : parsed.state,
        licenseClass: isLic ? 'Class A' : '',
        cdl: isLic ? 'Yes' : '',
        endorsements: isLic ? 'HazMat, Tanker' : '',
        tags: demoTags,
        monitoring: defaultMonitoring(r),
        uploadedBy: currentUserName(),
        uploadedAt: `${year - 1}-12-20T10:15:00`,
    });
    // Blank version (no files) that inherits jurisdiction — user fills number/dates/document(s).
    const addBlankVersion = () => {
        const prev = versions[0];
        const base = mkVersion((prev?.year ?? 2025) + 1);
        return { ...base, files: {}, tags: [], country: prev?.country ?? base.country, stateProv: prev?.stateProv ?? base.stateProv, uploadedBy: currentUserName(), uploadedAt: new Date().toISOString() };
    };
    const addEmptyVersion = () => setVersions([addBlankVersion(), ...versions]);
    // Single-slot docs: dropping a file creates a new dated version carrying that file.
    const addVersionWithFile = (f: File) => setVersions([{ ...addBlankVersion(), files: { [SINGLE_SLOT]: toDocFile(f) } }, ...versions]);
    const updateVersion = (i: number, patch: Partial<Ver>) => setVersions(versions.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
    const removeVersion = (i: number) => setVersions(versions.filter((_, idx) => idx !== i));

    const fillDemo = () => {
        if (multiUpload) {
            // Enable monitoring only on the current (first) version; previous versions stay off.
            const current = mkVersion(2026, ['Verified', 'Primary']);
            current.monitoring = { ...current.monitoring, enabled: true };
            setVersions([current, mkVersion(2025, ['Superseded'])]);
        } else {
            setMonitoring(m => ({ ...m, enabled: true }));
            const c = parsed.country || 'Canada';
            setCountry(c);
            setStateProv(parsed.state || (STATES_BY_COUNTRY[c]?.[0] ?? ''));
            setTags(t => (t.length ? t : ['Verified', 'Primary']));
            if (r.numberName) setNumber(sampleNumber(r));
            if (r.tracksIssueDate) setIssueDate('2024-01-15');
            if (isDateMonitored(r)) setMonitorDate(r.configuredDate ?? '2026-12-31');
            else setStatus(s => s || 'Active');
            if (r.documentName) setSingleFiles(demoDocFiles(r));
        }
    };

    const jurisdictionFields = (
        <>
            <FieldPreview label="Country">
                <select disabled={!editable} value={country} onChange={e => onCountry(e.target.value)} className={inputCls}>
                    <option value="">Select country</option>
                    {(r.allCountries ? ALL_COUNTRIES : COUNTRIES).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </FieldPreview>
            {!r.hideState && (
                <FieldPreview label="State / Province">
                    <select disabled={!editable || states.length === 0} value={stateProv} onChange={e => setStateProv(e.target.value)} className={inputCls}>
                        <option value="">{states.length ? 'Select state / province' : '—'}</option>
                        {states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </FieldPreview>
            )}
        </>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
                <p className="text-[12px] text-slate-500">
                    {editable
                        ? 'Edit the data-entry form for this record. Changes are a preview and are not persisted.'
                        : 'Preview of the data-entry form for this record. Fields are derived from its classification (read-only).'}
                </p>
                {editable && (
                    <button
                        type="button"
                        onClick={fillDemo}
                        className="inline-flex shrink-0 items-center gap-1.5 h-8 px-3 rounded-lg border border-blue-200 bg-blue-50 text-[12px] font-semibold text-blue-700 hover:bg-blue-100"
                    >
                        <Sparkles size={13} /> Fill demo data
                    </button>
                )}
            </div>

            {multiUpload ? (
                <>
                    {/* Versioned sets — each dated version is a fully self-contained form (jurisdiction + number + dates + document + tags). */}
                    <div>
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                            <label className="text-[13px] font-semibold text-slate-700">{r.documentName}</label>
                            {r.docRequirement === 'required' && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-600">Required</span>}
                            {r.docRequirement === 'optional' && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">Optional</span>}
                            {r.uploadMode && <UploadModeChip mode={r.uploadMode} />}
                        </div>
                        <p className="mb-3 text-[11px] text-slate-400">
                            Each renewal/reissue captures its own country/state, number, dates, document and tags as a new dated version. Previous versions are retained.
                        </p>

                        {versions.length > 0 && (
                            <div className="space-y-3">
                                {versions.map((v, i) => (
                                    <VersionCard
                                        key={`${v.year}-${i}`}
                                        r={r}
                                        v={v}
                                        index={i}
                                        editable={editable}
                                        inputCls={inputCls}
                                        numberRequired={numberRequired}
                                        tagCatalog={tagCatalog}
                                        onAddToCatalog={addToCatalog}
                                        onChange={patch => updateVersion(i, patch)}
                                        onRemove={() => removeVersion(i)}
                                    />
                                ))}
                            </div>
                        )}

                        {editable && (
                            <div className="mt-3">
                                {docSlots(r).length > 1 ? (
                                    // Multi-slot docs (e.g. Front/Back): add an empty version, then upload each slot.
                                    <button
                                        type="button"
                                        onClick={addEmptyVersion}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-[12px] font-semibold text-slate-600 hover:border-blue-300 hover:bg-blue-50/40"
                                    >
                                        <Plus size={15} /> Add a new dated version
                                    </button>
                                ) : (
                                    <Dropzone
                                        editable
                                        onFile={addVersionWithFile}
                                        label="Drag a file here — or click — to add a new dated version"
                                        hint="Captures its own country/state, number, dates, document and tags; previous versions retained"
                                    />
                                )}
                            </div>
                        )}
                        {!editable && versions.length === 0 && <p className="text-[12px] text-slate-400">No versions uploaded.</p>}
                    </div>
                </>
            ) : (
                <>
                    {/* Details — one number + dates + jurisdiction. */}
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Details</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {r.numberName && (
                            <FieldPreview label={r.numberName} required={numberRequired}>
                                <input disabled={!editable} value={number} onChange={e => setNumber(e.target.value)} placeholder={`Enter ${r.numberName}`} className={inputCls} />
                            </FieldPreview>
                        )}
                        {r.tracksIssueDate && (
                            <FieldPreview label="Issue / Effective Date" hint="Stored for history — not the monitored date.">
                                <input type="date" disabled={!editable} value={issueDate} onChange={e => setIssueDate(e.target.value)} className={inputCls} />
                            </FieldPreview>
                        )}
                        {isDateMonitored(r) && (
                            <FieldPreview label={r.monitorType} required hint="Monitored date">
                                <input type="date" disabled={!editable} value={monitorDate} onChange={e => setMonitorDate(e.target.value)} className={inputCls} />
                            </FieldPreview>
                        )}
                        {!isDateMonitored(r) && (
                            <FieldPreview label="Status" required hint="Monitored status">
                                <select disabled={!editable} value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
                                    <option value="">Select status</option>
                                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </FieldPreview>
                        )}
                        {jurisdictionFields}
                    </div>

                    {r.documentName && (
                        <div className="border-t border-slate-200 pt-4">
                            <div className="mb-1 flex items-center gap-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Uploaded Document</p>
                                {r.uploadMode && <UploadModeChip mode={r.uploadMode} />}
                                {r.docRequirement === 'required' && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-600">Required</span>}
                                {r.docRequirement === 'optional' && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">Optional</span>}
                            </div>
                            <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">{r.documentName}</label>
                            <DocumentUploader r={r} files={singleFiles} editable={editable} onChange={setSingleFiles} />
                        </div>
                    )}
                </>
            )}

            {/* Monitoring & Notifications — single/compliance record (multi-upload monitoring lives per version). */}
            {!multiUpload && (
                <div className="border-t border-slate-200 pt-4">
                    <MonitoringSettings r={r} value={monitoring} expiryDate={monitorDate} issueDate={issueDate} status={status} editable={editable} onChange={setMonitoring} />
                </div>
            )}

            {/* Tags for the single document (multi-upload tags live inside each version). */}
            {!multiUpload && r.documentName && (
                <div className="border-t border-slate-200 pt-4">
                    <TagEditor
                        tags={tags}
                        editable={editable}
                        catalog={tagCatalog}
                        onAdd={t => {
                            setTags(prev => (prev.some(x => x.toLowerCase() === t.toLowerCase()) ? prev : [...prev, t]));
                            addToCatalog(t);
                        }}
                        onRemove={t => setTags(prev => prev.filter(x => x !== t))}
                    />
                </div>
            )}

            <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-[12px] text-blue-800">
                <Info size={14} className="mt-0.5 shrink-0 text-blue-500" />
                <span>{r.monitor}</span>
            </div>
        </div>
    );
}

function DataView({ r }: { r: SafetyRecord }) {
    const reqLabel = r.docRequirement === 'none' ? 'No document' : r.docRequirement === 'required' ? 'Required' : 'Optional';
    const rows: [string, string][] = [
        ['Record Name', r.recordName],
        ['Description', r.description],
        ['Category', r.category],
        ['Entity', r.entity],
        ['Record Type', RECORD_TYPE_LABEL[r.type]],
        ['Document Requirement', reqLabel],
        ['Compliance / Number Field', r.numberName || '—'],
        ['Document', r.documentName || '—'],
        ['Upload Mode', r.uploadMode ? UPLOAD_MODE_LABEL[r.uploadMode] : 'No document'],
        ['Recurring', r.recurring],
        ['Monitored Date', r.monitorType],
        ['Configured Date', r.configuredDate || '—'],
        ['Tracks Issue Date', r.tracksIssueDate ? 'Yes' : 'No'],
        ['Jurisdiction', r.jurisdiction],
        ['Monitoring Guidance', r.monitor],
        ['Note', r.note || '—'],
    ];
    return (
        <dl className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
            {rows.map(([k, v]) => (
                <div key={k} className="grid grid-cols-3 gap-3 px-4 py-2.5 odd:bg-slate-50/40">
                    <dt className="text-[12px] font-semibold text-slate-500">{k}</dt>
                    <dd className="col-span-2 text-[13px] text-slate-800">{v}</dd>
                </div>
            ))}
        </dl>
    );
}

// ── Category sub-tabs ─────────────────────────────────────────────────

function CardTabs({ tabs, active, onChange }: {
    tabs: { id: KeyNumberGroup | 'All'; label: string; count: number }[];
    active: KeyNumberGroup | 'All';
    onChange: (t: KeyNumberGroup | 'All') => void;
}) {
    return (
        <div className="border-y border-slate-200 bg-slate-50/40 px-5 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 -mb-px">
                {tabs.map(t => {
                    const isActive = active === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => onChange(t.id)}
                            className={cn(
                                'inline-flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-semibold whitespace-nowrap border-b-2 transition-colors',
                                isActive
                                    ? 'text-blue-600 border-blue-600'
                                    : 'text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300',
                            )}
                        >
                            {t.label}
                            <span className={cn(
                                'inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                                isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/70 text-slate-600',
                            )}>
                                {t.count}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ── Cell helpers ──────────────────────────────────────────────────────

const UPLOAD_MODE_TONE: Record<UploadMode, string> = {
    single: 'border-slate-200 bg-slate-50 text-slate-500',
    recurring: 'border-blue-200 bg-blue-50 text-blue-700',
    event: 'border-violet-200 bg-violet-50 text-violet-700',
};

function UploadModeChip({ mode }: { mode: UploadMode }) {
    const Icon = mode === 'single' ? FileText : History;
    const short = mode === 'single' ? 'Single' : mode === 'recurring' ? 'Recurring versions' : 'Event versions';
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap', UPLOAD_MODE_TONE[mode])}>
            <Icon size={9} /> {short}
        </span>
    );
}

function RequirementPill({ r }: { r: SafetyRecord }) {
    if (r.docRequirement === 'none') {
        return <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">No document</span>;
    }
    const required = r.docRequirement === 'required';
    return (
        <span className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
            required ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-amber-200 bg-amber-50 text-amber-700',
        )}>
            {required ? 'Required' : 'Optional'}
        </span>
    );
}

function MonitoringCell({ r }: { r: SafetyRecord }) {
    const dated = isDateMonitored(r);
    if (r.configuredDate) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                <CalendarClock size={12} /> {r.monitorType}
                <span className="font-mono text-[10px] text-emerald-600">· {r.configuredDate}</span>
            </span>
        );
    }
    if (dated) {
        return (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700">
                <Calendar size={12} className="text-slate-400" /> {r.monitorType}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500">
            <Activity size={12} className="text-slate-400" /> {r.monitorType}
        </span>
    );
}

// ── Small primitives ──────────────────────────────────────────────────

const ACCENT_CLS = {
    slate:   { border: 'border-l-slate-400',   iconBg: 'bg-slate-100',  iconColor: 'text-slate-600' },
    blue:    { border: 'border-l-blue-500',    iconBg: 'bg-blue-50',    iconColor: 'text-blue-600' },
    violet:  { border: 'border-l-violet-500',  iconBg: 'bg-violet-50',  iconColor: 'text-violet-600' },
    emerald: { border: 'border-l-emerald-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
} as const;

function SummaryTile({ label, value, Icon, accent }: {
    label: string;
    value: number;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    accent: keyof typeof ACCENT_CLS;
}) {
    const cls = ACCENT_CLS[accent];
    return (
        <div className={cn('bg-white border border-slate-200 border-l-4 rounded-xl p-3 shadow-sm flex items-center justify-between gap-3', cls.border)}>
            <div className="min-w-0">
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center mb-2', cls.iconBg)}>
                    <Icon size={14} className={cls.iconColor} />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">{label}</div>
            </div>
            <div className="text-2xl font-black tabular-nums text-slate-900 leading-none">{value}</div>
        </div>
    );
}
