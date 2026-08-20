import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    ChevronLeft, AlertTriangle, ShieldCheck, Pencil, Trash2, FileText, Camera, Video, Eye,
    Building2, User, Car, Users, Shield, Cloud, MapPin, Truck, Activity as ActivityIcon,
    Boxes, Gauge, Clock, Search, ChevronsUpDown, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { tagColor } from '@/pages/compliance/safety-tags.data';
import { ACCIDENT_TYPES, RISK_TYPE_TONE, type AccidentRiskType } from '@/data/accident-types.data';
import {
    ACCIDENT_STATUS_META, SOURCE_META, ACTIVITY_ROLE_META,
    type AccidentRecord, type AccidentFile, type AccidentActivity,
} from '@/data/accident-records.data';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDateTime(dt?: string): string {
    if (!dt) return '—';
    const [d, t] = dt.split('T');
    const [y, m, day] = (d || '').split('-');
    if (!y) return dt;
    return `${MONTHS[Number(m) - 1] ?? m} ${Number(day)}, ${y}${t ? ` · ${t}` : ''}`;
}
function typeLabel(id: string): string {
    return ACCIDENT_TYPES.find(t => t.id === id)?.displayName ?? '';
}
const yesNo = (v?: boolean) => (v ? 'Yes' : 'No');
const composed = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(', ');
const has = (...vals: unknown[]) => vals.some(v => v !== undefined && v !== null && v !== '' && v !== false && !(Array.isArray(v) && v.length === 0));

// ── Small read-only building blocks ──────────────────────────────
function InfoCard({ title, icon: Icon, right, children }: { title: string; icon: LucideIcon; right?: ReactNode; children: ReactNode }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
                <Icon size={15} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">{title}</h3>
                {right && <div className="ml-auto">{right}</div>}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}
function Field({ label, value, wide }: { label: string; value?: ReactNode; wide?: boolean }) {
    const empty = value === undefined || value === null || value === '' || value === false;
    return (
        <div className={wide ? 'col-span-2 sm:col-span-3' : ''}>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-0.5 text-[13px] text-slate-800">{empty ? <span className="text-slate-300">—</span> : value}</dd>
        </div>
    );
}
function Grid({ children }: { children: ReactNode }) {
    return <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">{children}</dl>;
}
function ChipList({ items }: { items?: string[] }) {
    if (!items || items.length === 0) return <span className="text-slate-300">—</span>;
    return (
        <div className="flex flex-wrap gap-1.5">
            {items.map(x => <span key={x} className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">{x}</span>)}
        </div>
    );
}
/** Classify a file by extension into a coloured type badge. */
function fileKind(name: string): { label: string; tone: string } {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return { label: 'Image', tone: 'border-blue-200 bg-blue-50 text-blue-700' };
    if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) return { label: 'Video', tone: 'border-violet-200 bg-violet-50 text-violet-700' };
    if (ext === 'pdf') return { label: 'PDF', tone: 'border-rose-200 bg-rose-50 text-rose-700' };
    return { label: 'Document', tone: 'border-slate-200 bg-slate-100 text-slate-600' };
}

/** Coloured tag chips (reuses the shared document-tag palette), truncated past 3. */
function TagChips({ tags }: { tags?: string[] }) {
    if (!tags || tags.length === 0) return <span className="text-[13px] text-slate-300">—</span>;
    return (
        <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map(t => <span key={t} className={cn('inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold', tagColor(t))}>{t}</span>)}
            {tags.length > 3 && <span className="text-[10px] font-semibold text-slate-400">+{tags.length - 3}</span>}
        </div>
    );
}

type DocGroupDef = { label: string; icon: LucideIcon; files?: AccidentFile[] };
type DocSortCol = 'group' | 'file' | 'type' | 'size';
const DOC_PAGE_SIZES = [10, 25, 50];
const fmtSize = (b?: number) => (b == null ? '—' : b < 1024 ? `${b} B` : `${(b / 1024).toFixed(0)} KB`);

/** Shared list-view section — the same shell as the compliance "Documents & records":
 *  header + Show-history toggle, a search / type-filter toolbar, a sortable table
 *  (desktop) / cards (mobile) of every uploaded file, and a pagination footer. */
function DocListSection({ title, groups }: { title: string; groups: DocGroupDef[] }) {
    const [showHistory, setShowHistory] = useState(false);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'Image' | 'Video' | 'PDF' | 'Document'>('all');
    const [sort, setSort] = useState<{ col: DocSortCol; dir: 'asc' | 'desc' } | null>(null);
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);

    const allRows = groups.flatMap(g => (g.files ?? []).map(f => ({ group: g.label, icon: g.icon, file: f, kind: fileKind(f.fileName) })));
    const historyCount = 0; // prototype: accident files aren't versioned yet

    const q = search.trim().toLowerCase();
    let rows = allRows.filter(r => {
        if (typeFilter !== 'all' && r.kind.label !== typeFilter) return false;
        if (q && !`${r.group} ${r.file.fileName} ${r.file.note ?? ''} ${(r.file.tags ?? []).join(' ')}`.toLowerCase().includes(q)) return false;
        return true;
    });
    if (sort) {
        const val = (r: typeof allRows[number]) => sort.col === 'group' ? r.group : sort.col === 'file' ? r.file.fileName
            : sort.col === 'type' ? r.kind.label : String(r.file.fileSize ?? 0).padStart(12, '0');
        rows = [...rows].sort((a, b) => val(a).localeCompare(val(b), undefined, { numeric: true, sensitivity: 'base' }) * (sort.dir === 'desc' ? -1 : 1));
    }
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, pages);
    const startIdx = (safePage - 1) * pageSize;
    const pageRows = rows.slice(startIdx, startIdx + pageSize);

    useEffect(() => { setPage(1); }, [search, typeFilter, pageSize]);
    const toggleSort = (col: DocSortCol) => setSort(s => (s?.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));
    const Th = ({ col, label, className }: { col?: DocSortCol; label: string; className?: string }) => (
        <th className={cn('px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500', className)}>
            {col ? (
                <button type="button" onClick={() => toggleSort(col)} className="inline-flex items-center gap-1 hover:text-slate-700">
                    {label}<ChevronsUpDown size={11} className={sort?.col === col ? 'text-blue-500' : 'text-slate-300'} />
                </button>
            ) : label}
        </th>
    );

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Header — title + Show history toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
                <h3 className="text-[13px] font-bold text-slate-700">{title}</h3>
                <button type="button" disabled={historyCount === 0} onClick={() => setShowHistory(v => !v)}
                    title={historyCount === 0 ? 'No older records yet' : showHistory ? 'Hide historical records' : 'Show historical records'}
                    className={cn('inline-flex items-center gap-2 text-[12px] font-semibold', historyCount === 0 ? 'cursor-not-allowed text-slate-300' : 'text-slate-600 hover:text-slate-800')}>
                    <span className={cn('relative h-5 w-9 rounded-full transition-colors', showHistory && historyCount > 0 ? 'bg-blue-600' : 'bg-slate-300')}>
                        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', showHistory && historyCount > 0 ? 'left-[18px]' : 'left-0.5')} />
                    </span>
                    Show history
                    <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">{historyCount}</span>
                </button>
            </div>

            {allRows.length === 0 ? (
                <div className="px-5 py-14 text-center">
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FileText size={20} /></div>
                    <p className="text-sm font-semibold text-slate-700">No documents captured yet</p>
                    <p className="mt-1 text-[13px] text-slate-500">Files uploaded on this accident appear here.</p>
                </div>
            ) : (
                <>
                    {/* Toolbar — search + type filter */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
                        <div className="relative min-w-[200px] max-w-sm flex-1">
                            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents, files…"
                                className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
                            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 focus:outline-none">
                            <option value="all">All types</option>
                            <option value="Image">Image</option>
                            <option value="Video">Video</option>
                            <option value="PDF">PDF</option>
                            <option value="Document">Document</option>
                        </select>
                    </div>

                    {pageRows.length === 0 ? (
                        <div className="px-5 py-12 text-center text-sm text-slate-500">No documents match your search / filters.</div>
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="hidden md:block">
                                <table className="w-full table-fixed">
                                    <colgroup><col className="w-[18%]" /><col className="w-[22%]" /><col className="w-[10%]" /><col className="w-[22%]" /><col className="w-[18%]" /><col className="w-[10%]" /></colgroup>
                                    <thead className="border-b border-slate-200 bg-slate-50/50">
                                        <tr>
                                            <Th col="group" label="Document" className="pl-5" />
                                            <Th col="file" label="File" />
                                            <Th col="type" label="Type" />
                                            <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Tags</th>
                                            <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Notes</th>
                                            <th className="px-4 py-2.5 pr-5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageRows.map((r, i) => (
                                            <tr key={r.file.id + i} className="border-b border-slate-100 align-top last:border-0 hover:bg-slate-50/50">
                                                <td className="px-4 py-3 pl-5"><span className="flex items-center gap-2 text-[13px] font-medium text-slate-700"><r.icon size={14} className="shrink-0 text-slate-400" /><span className="truncate" title={r.group}>{r.group}</span></span></td>
                                                <td className="px-4 py-3"><span className="flex items-center gap-2 text-[13px] text-slate-700"><FileText size={13} className="shrink-0 text-emerald-600" /><span className="truncate" title={r.file.fileName}>{r.file.fileName}</span></span></td>
                                                <td className="px-4 py-3"><span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', r.kind.tone)}>{r.kind.label}</span></td>
                                                <td className="px-4 py-3"><TagChips tags={r.file.tags} /></td>
                                                <td className="px-4 py-3">{r.file.note ? <span className="block max-w-full truncate text-[12px] text-slate-600" title={r.file.note}>{r.file.note}</span> : <span className="text-[13px] text-slate-300">—</span>}</td>
                                                <td className="px-4 py-3 pr-5 text-right"><button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"><Eye size={12} /> View</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile cards */}
                            <ul className="divide-y divide-slate-100 md:hidden">
                                {pageRows.map((r, i) => (
                                    <li key={r.file.id + i} className="space-y-2 px-4 py-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><r.icon size={12} className="shrink-0 text-slate-400" />{r.group}</p>
                                                <p className="truncate text-[13px] text-slate-700" title={r.file.fileName}>{r.file.fileName}</p>
                                                <p className="mt-0.5 text-[11px] text-slate-400">{fmtSize(r.file.fileSize)}</p>
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                                                <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', r.kind.tone)}>{r.kind.label}</span>
                                                <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600"><Eye size={11} /> View</button>
                                            </div>
                                        </div>
                                        {(r.file.tags?.length || r.file.note) && (
                                            <div className="space-y-1">
                                                <TagChips tags={r.file.tags} />
                                                {r.file.note && <p className="text-[12px] text-slate-600">{r.file.note}</p>}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>

                            {/* Pagination footer */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
                                <label className="flex items-center gap-1.5 text-[12px] text-slate-500">Rows per page
                                    <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none">
                                        {DOC_PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </label>
                                <div className="flex items-center gap-1">
                                    <span className="mr-2 text-[12px] text-slate-500 tabular-nums">{startIdx + 1}–{Math.min(startIdx + pageSize, total)} of {total}</span>
                                    <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="inline-flex h-8 items-center rounded-md border border-slate-200 px-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Prev</button>
                                    <span className="px-2 text-[12px] text-slate-600 tabular-nums">Page {safePage} of {pages}</span>
                                    <button type="button" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)} className="inline-flex h-8 items-center rounded-md border border-slate-200 px-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}

type TabId = 'overview' | 'documents' | 'evidence' | 'activity';

export function AccidentDetailPage({ record, onBack, onEdit, onDelete }: {
    record: AccidentRecord;
    onBack: () => void;
    onEdit: () => void;
    onDelete?: (id: string) => void;
}) {
    const [tab, setTab] = useState<TabId>('overview');
    const st = ACCIDENT_STATUS_META[record.status];
    const src = SOURCE_META[record.source];
    const title = typeLabel(record.accidentTypeId) || 'Accident report';

    // Derive activity if none was stored (older records) from the reported/verified stamps.
    const activity = useMemo<AccidentActivity[]>(() => {
        if (record.activity && record.activity.length) return [...record.activity].sort((a, b) => a.at.localeCompare(b.at));
        const list: AccidentActivity[] = [{
            id: 'derived-report', at: record.dateTime || record.reportedAt, by: record.reportedBy,
            role: record.source === 'driver-app' ? 'driver' : 'office',
            action: record.source === 'driver-app' ? 'Reported' : 'Created',
            detail: record.source === 'driver-app' ? 'Submitted from the mobile app.' : 'Entered from the office.',
        }];
        if (record.verifiedBy && record.verifiedAt) list.push({ id: 'derived-verify', at: record.verifiedAt, by: record.verifiedBy, role: 'manager', action: 'Verified' });
        return list;
    }, [record]);

    const docCount = (record.driverStatementFiles?.length ?? 0) + (record.policeReportFiles?.length ?? 0)
        + (record.citationFiles?.length ?? 0) + (record.repairFiles?.length ?? 0)
        + (record.witnesses ?? []).reduce((n, w) => n + (w.statementFiles?.length ?? 0), 0);
    const evidenceCount = (record.photoFiles?.length ?? 0) + (record.videoFiles?.length ?? 0);

    const TABS: { id: TabId; label: string; count?: number }[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'documents', label: 'Documents', count: docCount },
        { id: 'evidence', label: 'Evidence', count: evidenceCount },
        { id: 'activity', label: 'Activity', count: activity.length },
    ];

    const summaryRows: { label: string; value: ReactNode }[] = [
        { label: 'Driver', value: record.driverName || '—' },
        { label: 'Vehicle unit', value: record.unitId || '—' },
        { label: 'Date & time', value: fmtDateTime(record.dateTime) },
        { label: 'Location', value: record.location || '—' },
        { label: 'Accident type', value: typeLabel(record.accidentTypeId) || 'Unclassified' },
        { label: 'Severity', value: record.severity ? <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', RISK_TYPE_TONE[record.severity as AccidentRiskType])}>{record.severity}</span> : '—' },
        { label: 'Preventability', value: record.preventable || '—' },
        { label: 'Claim number', value: record.claimNumber || '—' },
        { label: 'Reported by', value: `${record.reportedBy} · ${record.reportedAt}` },
        { label: 'Verified by', value: record.verifiedBy ? `${record.verifiedBy} · ${record.verifiedAt}` : '—' },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-8">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
                    <ChevronLeft size={16} /> Back to list
                </button>

                {/* ── Summary header card ── */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><AlertTriangle size={20} /></span>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-bold text-slate-900">{title}</h1>
                                    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', st.tone)}><span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}</span>
                                    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold', src.tone)}>{src.label}</span>
                                    {record.injuries && <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">Injury</span>}
                                </div>
                                <p className="mt-1 text-sm text-slate-500">{record.driverName || '—'} · {record.unitId || '—'} · {fmtDateTime(record.dateTime)}</p>
                            </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {record.status !== 'verified' && (
                                <button type="button" onClick={onEdit}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700">
                                    <ShieldCheck size={14} /> Review &amp; verify
                                </button>
                            )}
                            <button type="button" onClick={onEdit}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
                                <Pencil size={14} /> Edit
                            </button>
                            {onDelete && (
                                <button type="button" onClick={() => { onDelete(record.id); onBack(); }}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3.5 py-2 text-sm font-bold text-rose-600 shadow-sm hover:bg-rose-50">
                                    <Trash2 size={14} /> Delete
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Key-facts grid */}
                    <div className="grid grid-cols-1 border-t border-slate-100 sm:grid-cols-2">
                        {summaryRows.map((r, i) => (
                            <div key={i} className={cn('flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3', i % 2 === 0 && 'sm:border-r sm:border-slate-100')}>
                                <span className="text-[13px] text-slate-500">{r.label}</span>
                                <span className="text-right text-[13px] font-semibold text-slate-800">{r.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div className="flex items-center gap-1 border-b border-slate-200">
                    {TABS.map(t => {
                        const on = tab === t.id;
                        return (
                            <button key={t.id} type="button" onClick={() => setTab(t.id)}
                                className={cn('inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                                    on ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800')}>
                                {t.label}
                                {t.count !== undefined && <span className={cn('inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums', on ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/70 text-slate-600')}>{t.count}</span>}
                            </button>
                        );
                    })}
                </div>

                {tab === 'overview' && <OverviewTab record={record} />}
                {tab === 'documents' && <DocumentsTab record={record} />}
                {tab === 'evidence' && <EvidenceTab record={record} />}
                {tab === 'activity' && <ActivityTab activity={activity} />}
            </div>
        </div>
    );
}

// ── Overview ─────────────────────────────────────────────────────
function OverviewTab({ record: r }: { record: AccidentRecord }) {
    return (
        <div className="space-y-5">
            <InfoCard title="Owner information" icon={Building2}>
                <Grid>
                    <Field label="Name" value={r.ownerName} />
                    <Field label="Phone" value={r.ownerPhone} />
                    <Field label="Policy number" value={r.policyNumber} />
                    <Field label="Address" value={composed(r.ownerStreet, r.ownerCity, composed(r.ownerState, r.ownerZip), r.ownerCountry)} wide />
                    <Field label="NSC / CVOR number" value={r.nscCvor} />
                </Grid>
            </InfoCard>

            <InfoCard title="Driver information" icon={User}>
                <Grid>
                    <Field label="Name" value={r.driverName} />
                    <Field label="Phone" value={r.driverPhone} />
                    <Field label="Licence number" value={r.licenceNumber} />
                    <Field label="Address" value={composed(r.driverStreet, r.driverCity, composed(r.driverState, r.driverZip), r.driverCountry)} wide />
                    <Field label="Licence expiry" value={r.licenceExpiry} />
                    <Field label="Province of issue" value={r.licenceProvince} />
                    <Field label="Last duty status" value={r.lastDutyStatus} />
                    <Field label="Last DVIR status" value={r.lastDvirStatus} />
                </Grid>
            </InfoCard>

            <InfoCard title="Accident & collision" icon={FileText}>
                <div className="space-y-4">
                    <Field label="What happened" value={r.description} wide />
                    <Grid>
                        <Field label="Direction of travel" value={r.directionOfTravel} />
                        <Field label="Speed prior" value={r.travelSpeed ? `${r.travelSpeed} ${r.travelSpeedUnit ?? 'km/h'}` : ''} />
                        <Field label="Headlights on" value={r.travelSpeed || r.directionOfTravel ? yesNo(r.headlightsOn) : ''} />
                        <Field label="Lane (1 = shoulder)" value={r.laneNumber} />
                        <Field label="Lanes wide" value={r.lanesWide} />
                        <Field label="Landmarks" value={r.landmarks} />
                        <Field label="Warning signals" value={r.warningSignals ? `Yes — ${r.warningSignalDesc || 'given'}` : ''} wide />
                    </Grid>
                </div>
            </InfoCard>

            <InfoCard title="Severity & cargo" icon={Boxes}>
                <Grid>
                    <Field label="Fatalities" value={r.numFatalities} />
                    <Field label="Injuries" value={r.numInjuries} />
                    <Field label="Vehicles towed" value={r.numVehiclesTowed} />
                    <Field label="Tow away" value={yesNo(r.towAway)} />
                    <Field label="HAZMAT spilled" value={yesNo(r.hazmatSpill)} />
                    <Field label="Commodity lost" value={r.commodityLost} />
                    <Field label="Cargo lost" value={r.cargoLost} />
                    <Field label="Cargo damaged" value={yesNo(r.cargoDamaged)} />
                    <Field label="Est. damage value" value={r.cargoDamageValue} />
                    {r.cargoDamaged && <Field label="Damage description" value={r.cargoDamageDesc} wide />}
                </Grid>
            </InfoCard>

            {has(r.odometerAfter, r.hrsDrivingAtCrash, r.hrsOnDutyAtCrash) && (
                <InfoCard title="At the time of the crash" icon={Gauge}>
                    <Grid>
                        <Field label="Odometer after crash" value={r.odometerAfter} />
                        <Field label="Hours driving at crash" value={r.hrsDrivingAtCrash} />
                        <Field label="Hours on duty at crash" value={r.hrsOnDutyAtCrash} />
                    </Grid>
                </InfoCard>
            )}

            {has(r.roadType, r.postedSpeed, r.roadCondsList, r.trafficControlsList, r.trafficCondsList, r.weatherList, r.visibilityList) && (
                <InfoCard title="Road & environment" icon={Cloud}>
                    <div className="space-y-4">
                        <Grid>
                            <Field label="Road type" value={r.roadType} />
                            <Field label="Posted speed" value={r.postedSpeed} />
                        </Grid>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div><dt className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Road conditions</dt><ChipList items={r.roadCondsList} /></div>
                            <div><dt className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Traffic controls</dt><ChipList items={r.trafficControlsList} /></div>
                            <div><dt className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Traffic conditions</dt><ChipList items={r.trafficCondsList} /></div>
                            <div><dt className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Weather</dt><ChipList items={r.weatherList} /></div>
                            <div><dt className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Visibility</dt><ChipList items={r.visibilityList} /></div>
                        </div>
                    </div>
                </InfoCard>
            )}

            <InfoCard title="Location" icon={MapPin}>
                <Grid>
                    <Field label="Description" value={r.location} wide />
                    <Field label="Street address" value={r.accStreet} />
                    <Field label="City" value={r.accCity} />
                    <Field label="State / province" value={r.accState} />
                    <Field label="Country" value={r.accCountry} />
                    <Field label="Zip / pin" value={r.accZip} />
                    <Field label="Location type" value={r.locationType} />
                </Grid>
            </InfoCard>

            {(r.otherVehicles?.length ?? 0) > 0 && (
                <InfoCard title="Other vehicles" icon={Car} right={<span className="text-[11px] font-semibold text-slate-400">{r.otherVehicles!.length}</span>}>
                    <div className="space-y-4">
                        {r.otherVehicles!.map((v, i) => (
                            <div key={v.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                                <p className="mb-3 text-sm font-bold text-slate-700">Vehicle {i + 1}</p>
                                <Grid>
                                    <Field label="Year / make" value={composed(v.year, v.make)} />
                                    <Field label="Colour" value={v.colour} />
                                    <Field label="Plate" value={v.plate} />
                                    <Field label="Driver" value={v.driverName} />
                                    <Field label="Driver phone" value={v.driverPhone} />
                                    <Field label="Licence" value={v.licenceNumber} />
                                    <Field label="Owner / employer" value={v.ownerName} />
                                    <Field label="Persons in vehicle" value={v.personsInVehicle} />
                                    <Field label="Injured" value={v.injured ? composed('Yes', v.injuredDriver ? 'driver' : undefined, v.injuredPassenger ? 'passenger' : undefined) : 'No'} />
                                    <Field label="Insurance" value={composed(v.insuranceCompany, v.policyNumber)} />
                                    <Field label="Action / movement" value={<ChipList items={[...(v.actions ?? []), v.actionsOther].filter(Boolean) as string[]} />} wide />
                                </Grid>
                            </div>
                        ))}
                    </div>
                </InfoCard>
            )}

            {(r.witnesses?.length ?? 0) > 0 && (
                <InfoCard title="Witnesses" icon={Users} right={<span className="text-[11px] font-semibold text-slate-400">{r.witnesses!.length}</span>}>
                    <div className="space-y-4">
                        {r.witnesses!.map((w, i) => (
                            <div key={w.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                                <p className="mb-3 text-sm font-bold text-slate-700">Witness {i + 1}</p>
                                <Grid>
                                    <Field label="Name" value={w.name} />
                                    <Field label="Phone" value={w.phone} />
                                    <Field label="Prov. / state" value={w.province} />
                                    <Field label="Address" value={w.address} wide />
                                    <Field label="Saw the accident" value={yesNo(w.sawAccident)} />
                                    <Field label="Where they were" value={w.whereWhen} wide />
                                    <Field label="Probable cause" value={w.cause} wide />
                                </Grid>
                            </div>
                        ))}
                    </div>
                </InfoCard>
            )}

            {r.policePresent && (
                <InfoCard title="Police report" icon={Shield}>
                    <Grid>
                        <Field label="Report number" value={r.policeReport} />
                        <Field label="Agency" value={r.policeAgency} />
                        <Field label="Agency phone" value={r.policeAgencyPhone} />
                        <Field label="Officer 1" value={composed(r.officer1Name, r.officer1Badge && `#${r.officer1Badge}`)} />
                        <Field label="Officer 2" value={composed(r.officer2Name, r.officer2Badge && `#${r.officer2Badge}`)} />
                        <Field label="Citation issued" value={yesNo(r.citationIssued)} />
                        {r.citationIssued && <Field label="Citation / ticket number" value={r.citationNumber} />}
                        <Field label="Anyone arrested" value={r.arrested ? composed('Yes', r.arrestedName) : 'No'} />
                        <Field label="Note" value={r.policeNote} wide />
                    </Grid>
                </InfoCard>
            )}

            {has(r.towAway, r.insuranceCarrier, r.towCompany, r.repairVendor, r.repairStatus) && (
                <InfoCard title="Insurance, tow & repair" icon={Truck}>
                    <Grid>
                        <Field label="Insurance carrier" value={r.insuranceCarrier} />
                        <Field label="Policy number" value={r.insurancePolicyNumber} />
                        <Field label="Adjuster" value={composed(r.adjusterName, r.adjusterPhone)} />
                        <Field label="TPA / third-party admin" value={r.tpaAdmin} />
                        <Field label="Tow company" value={r.towCompany} />
                        <Field label="Tow bill" value={r.towBill} />
                        <Field label="Repair vendor" value={r.repairVendor} />
                        <Field label="Repair status" value={r.repairStatus} />
                    </Grid>
                </InfoCard>
            )}

            <InfoCard title="Verification" icon={ShieldCheck}>
                <Grid>
                    <Field label="Severity" value={r.severity} />
                    <Field label="Risk points" value={r.points === '' || r.points === undefined ? '' : String(r.points)} />
                    <Field label="Preventability" value={r.preventable} />
                    <Field label="Claim number" value={r.claimNumber} />
                    <Field label="Insurer" value={r.insurer} />
                    <Field label="Third party" value={r.thirdParty} />
                    <Field label="Manager notes" value={r.managerNotes} wide />
                    <Field label="Verified by" value={r.verifiedBy ? `${r.verifiedBy} · ${r.verifiedAt}` : ''} />
                </Grid>
            </InfoCard>
        </div>
    );
}

// ── Documents ────────────────────────────────────────────────────
function DocumentsTab({ record: r }: { record: AccidentRecord }) {
    const groups: DocGroupDef[] = [
        { label: 'Driver statement', icon: FileText, files: r.driverStatementFiles },
        { label: 'Police report', icon: Shield, files: r.policeReportFiles },
        { label: 'Citation / ticket', icon: FileText, files: r.citationFiles },
        { label: 'Repairs document', icon: Truck, files: r.repairFiles },
        ...(r.witnesses ?? []).filter(w => (w.statementFiles?.length ?? 0) > 0).map((w, i) => ({
            label: `Witness statement — ${w.name || `Witness ${i + 1}`}`, icon: Users, files: w.statementFiles,
        })),
    ];
    return <DocListSection title="Documents & records" groups={groups} />;
}

// ── Evidence ─────────────────────────────────────────────────────
function EvidenceTab({ record: r }: { record: AccidentRecord }) {
    const groups: DocGroupDef[] = [
        { label: 'Photos of the scene', icon: Camera, files: r.photoFiles },
        { label: 'Evidence video', icon: Video, files: r.videoFiles },
    ];
    return <DocListSection title="Evidence" groups={groups} />;
}

// ── Activity ─────────────────────────────────────────────────────
function ActivityTab({ activity }: { activity: AccidentActivity[] }) {
    if (activity.length === 0) {
        return <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">No activity recorded yet.</div>;
    }
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
                <ActivityIcon size={15} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Activity — who updated this record, and when</h3>
            </div>
            <ol className="relative space-y-5 border-l border-slate-200 pl-6">
                {activity.map(a => {
                    const role = ACTIVITY_ROLE_META[a.role];
                    return (
                        <li key={a.id} className="relative">
                            <span className={cn('absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white', role.ring)} />
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-slate-800">{a.action}</span>
                                <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold', role.tone)}>{role.label}</span>
                                <span className="flex items-center gap-1 text-[12px] text-slate-400"><Clock size={11} /> {fmtDateTime(a.at)}</span>
                            </div>
                            <p className="mt-0.5 text-[13px] text-slate-600">
                                <span className="font-medium text-slate-700">{a.by}</span>{a.detail ? ` — ${a.detail}` : ''}
                            </p>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
