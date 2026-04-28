import React, { useMemo, useState } from 'react';
import {
    LayoutGrid, Users, Check, ShieldAlert, AlertCircle, Pause,
    Download, Eye, Edit2, ArrowUp, ArrowDown, ArrowUpDown, Plus, Circle,
} from 'lucide-react';
import {
    ACCOUNTS_DB,
    cvorNscRinDisplay,
    type AccountRecord,
    type AccountStatus,
    type SafetyRating,
} from './accounts.data';
import { CarrierViewModal } from './CarrierViewModal';
import { CarrierEditModal } from './CarrierEditModal';
import { DataListToolbar, PaginationBar, type ColumnDef } from '@/components/ui/DataListToolbar';
import { cn } from '@/lib/utils';

// ── Status badge styling ───────────────────────────────────────────────────

const STATUS_BADGE: Record<AccountStatus, string> = {
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Inactive: 'bg-slate-100 text-slate-500 border-slate-200',
    Suspended: 'bg-red-50 text-red-700 border-red-200',
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
};
const STATUS_DOT: Record<AccountStatus, string> = {
    Active: 'bg-emerald-500',
    Inactive: 'bg-slate-400',
    Suspended: 'bg-red-500',
    Pending: 'bg-amber-500',
};
const RATING_BADGE: Record<SafetyRating, string> = {
    Satisfactory: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Conditional: 'bg-amber-50 text-amber-700 border-amber-200',
    Unsatisfactory: 'bg-red-50 text-red-700 border-red-200',
    'Not Rated': 'bg-slate-50 text-slate-500 border-slate-200',
};

// ── Columns ────────────────────────────────────────────────────────────────

const ALL_COLUMNS: ColumnDef[] = [
    { id: 'carrier', label: 'Carrier', visible: true },
    { id: 'dotNumber', label: 'DOT #', visible: true },
    { id: 'cvorNscRin', label: 'CVOR / NSC / RIN', visible: true },
    { id: 'location', label: 'Location', visible: true },
    { id: 'drivers', label: 'Drivers', visible: true },
    { id: 'assets', label: 'Assets', visible: true },
    { id: 'safetyRating', label: 'Safety Rating', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'createdAt', label: 'Created', visible: true },
    { id: 'actions', label: 'Actions', visible: true },
];

type SortKey =
    | 'legalName' | 'dotNumber' | 'cvorNscRin' | 'location'
    | 'drivers' | 'assets' | 'safetyRating' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';

interface AccountsListPageProps {
    onNavigate?: (path: string) => void;
    onSelectAccount?: (account: AccountRecord) => void;
    /** Hide the internal page title + Add button when rendered inside the AccountsTabsPage. */
    embedded?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const fmtDate = (d: string) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: '2-digit' });
};
const initials = (name: string) =>
    name.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean).slice(0, 2)
        .map((p) => p[0]!.toUpperCase()).join('');

const TH = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <th className={cn('px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap', className)}>
        {children}
    </th>
);
const TD = ({ children, className, onClick }: { children?: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) => (
    <td onClick={onClick} className={cn('px-4 py-3 text-sm align-middle', className)}>{children}</td>
);

// ── Page ───────────────────────────────────────────────────────────────────

export function AccountsListPage({ onNavigate, onSelectAccount, embedded }: AccountsListPageProps) {
    const [search, setSearch] = useState('');
    const [columns, setColumns] = useState<ColumnDef[]>(ALL_COLUMNS);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>({ key: 'legalName', dir: 'asc' });
    const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>('all');
    const [accounts, setAccounts] = useState<AccountRecord[]>(ACCOUNTS_DB);
    const [viewing, setViewing] = useState<AccountRecord | null>(null);
    const [editing, setEditing] = useState<AccountRecord | null>(null);

    const colVisible = useMemo(() => Object.fromEntries(columns.map((c) => [c.id, c.visible])), [columns]);
    const toggleColumn = (id: string) =>
        setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));

    const handleSort = (key: SortKey) => {
        setSort((prev) => {
            if (!prev || prev.key !== key) return { key, dir: 'asc' };
            if (prev.dir === 'asc') return { key, dir: 'desc' };
            return null;
        });
    };

    // KPI stats
    const stats = useMemo(() => ({
        total: accounts.length,
        active: accounts.filter((a) => a.status === 'Active').length,
        pending: accounts.filter((a) => a.status === 'Pending').length,
        suspended: accounts.filter((a) => a.status === 'Suspended').length,
        inactive: accounts.filter((a) => a.status === 'Inactive').length,
        drivers: accounts.reduce((s, a) => s + a.drivers, 0),
    }), [accounts]);

    const setKpi = (status: AccountStatus | 'all') => { setStatusFilter(status); setPage(1); };

    // Filter
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return accounts.filter((a) => {
            if (statusFilter !== 'all' && a.status !== statusFilter) return false;
            if (!q) return true;
            return (
                a.legalName.toLowerCase().includes(q) ||
                a.dbaName.toLowerCase().includes(q) ||
                a.dotNumber.toLowerCase().includes(q) ||
                cvorNscRinDisplay(a).toLowerCase().includes(q) ||
                a.city.toLowerCase().includes(q) ||
                a.state.toLowerCase().includes(q)
            );
        });
    }, [accounts, search, statusFilter]);

    // Sort
    const sorted = useMemo(() => {
        if (!sort) return filtered;
        const dir = sort.dir === 'asc' ? 1 : -1;
        return [...filtered].sort((a, b) => {
            let va: string | number;
            let vb: string | number;
            if (sort.key === 'location') { va = `${a.state} ${a.city}`; vb = `${b.state} ${b.city}`; }
            else if (sort.key === 'cvorNscRin') { va = cvorNscRinDisplay(a); vb = cvorNscRinDisplay(b); }
            else { va = (a as any)[sort.key]; vb = (b as any)[sort.key]; }
            if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
            return String(va).localeCompare(String(vb)) * dir;
        });
    }, [filtered, sort]);

    const paged = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        return sorted.slice(start, start + rowsPerPage);
    }, [sorted, page, rowsPerPage]);

    const handleSaveCarrier = (next: AccountRecord) => {
        setAccounts((prev) => prev.map((a) => (a.id === next.id ? next : a)));
    };

    const handleExport = () => {
        const headers = ['Legal Name', 'DBA', 'DOT #', 'CVOR/NSC/RIN', 'City', 'State', 'Country', 'Drivers', 'Assets', 'Safety Rating', 'Status', 'Created'];
        const rows = sorted.map((a) => [
            a.legalName, a.dbaName, a.dotNumber, cvorNscRinDisplay(a),
            a.city, a.state, a.country === 'US' ? 'United States' : 'Canada',
            a.drivers, a.assets, a.safetyRating, a.status, a.createdAt,
        ]);
        const csv = [headers, ...rows]
            .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'carriers.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-slate-50">
            {/* KPI cards (same as before, kept since they're useful as quick filters) */}
            <div className={cn("px-6", embedded ? "pt-5 pb-5" : "pt-6 pb-5")}>
                {!embedded && (
                    <div className="mb-5">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Accounts</h1>
                        <p className="mt-1 text-xs text-slate-500">
                            {accounts.length.toLocaleString()} carriers · click a row to open the carrier
                        </p>
                    </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <KpiCard label="Total" count={stats.total} icon={LayoutGrid} accent="blue"   active={statusFilter === 'all'}        onClick={() => setKpi('all')} />
                    <KpiCard label="Active" count={stats.active} icon={Check} accent="emerald" active={statusFilter === 'Active'}     onClick={() => setKpi('Active')} />
                    <KpiCard label="Pending" count={stats.pending} icon={AlertCircle} accent="amber" active={statusFilter === 'Pending'} onClick={() => setKpi('Pending')} />
                    <KpiCard label="Suspended" count={stats.suspended} icon={ShieldAlert} accent="rose" active={statusFilter === 'Suspended'} onClick={() => setKpi('Suspended')} />
                    <KpiCard label="Inactive" count={stats.inactive} icon={Pause} accent="slate" active={statusFilter === 'Inactive'} onClick={() => setKpi('Inactive')} />
                    <KpiCard label="Drivers" count={stats.drivers} icon={Users} accent="indigo" active={false} onClick={undefined} />
                </div>
            </div>

            {/* Main list card */}
            <div className="px-6 pb-6">
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <DataListToolbar
                        searchValue={search}
                        onSearchChange={(v) => { setSearch(v); setPage(1); }}
                        searchPlaceholder="Search name, DOT, CVOR/NSC/RIN, city…"
                        columns={columns}
                        onToggleColumn={toggleColumn}
                        totalItems={filtered.length}
                        currentPage={page}
                        rowsPerPage={rowsPerPage}
                        onPageChange={setPage}
                        onRowsPerPageChange={setRowsPerPage}
                    />

                    {/* Export + Add bar (parity with ServiceProfilesListPage) */}
                    <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/40">
                        <div className="text-xs text-slate-500">
                            {statusFilter !== 'all' && (
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="text-slate-400">Filter:</span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                                        {statusFilter}
                                    </span>
                                    <button onClick={() => setStatusFilter('all')} className="text-blue-600 hover:underline">Clear</button>
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExport}
                                className="h-8 px-3 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 shadow-sm"
                            >
                                <Download size={13} /> Export CSV
                            </button>
                            {!embedded && (
                                <button
                                    onClick={() => onNavigate?.('/accounts/new')}
                                    className="h-8 px-3 rounded-md bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
                                >
                                    <Plus size={13} /> Add Account
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {colVisible.carrier && <SortHeader label="Carrier" sortKey="legalName" sort={sort} onSort={handleSort} />}
                                    {colVisible.dotNumber && <SortHeader label="DOT #" sortKey="dotNumber" sort={sort} onSort={handleSort} />}
                                    {colVisible.cvorNscRin && <SortHeader label="CVOR / NSC / RIN" sortKey="cvorNscRin" sort={sort} onSort={handleSort} />}
                                    {colVisible.location && <SortHeader label="Location" sortKey="location" sort={sort} onSort={handleSort} />}
                                    {colVisible.drivers && <SortHeader label="Drivers" sortKey="drivers" sort={sort} onSort={handleSort} />}
                                    {colVisible.assets && <SortHeader label="Assets" sortKey="assets" sort={sort} onSort={handleSort} />}
                                    {colVisible.safetyRating && <SortHeader label="Safety Rating" sortKey="safetyRating" sort={sort} onSort={handleSort} />}
                                    {colVisible.status && <SortHeader label="Status" sortKey="status" sort={sort} onSort={handleSort} />}
                                    {colVisible.createdAt && <SortHeader label="Created" sortKey="createdAt" sort={sort} onSort={handleSort} />}
                                    {colVisible.actions && <TH className="text-right pr-6">Actions</TH>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paged.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="text-center py-16 text-slate-400 text-sm">
                                            No carriers match your filters.
                                        </td>
                                    </tr>
                                )}
                                {paged.map((a) => {
                                    const idRows: { label: string; value: string; cls: string }[] = [];
                                    if (a.cvorNumber) idRows.push({ label: 'CVOR', value: a.cvorNumber, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
                                    if (a.nscNumber) idRows.push({ label: 'NSC', value: a.nscNumber, cls: 'bg-blue-50 text-blue-700 border-blue-200' });
                                    if (a.rinNumber) idRows.push({ label: 'RIN', value: a.rinNumber, cls: 'bg-purple-50 text-purple-700 border-purple-200' });
                                    return (
                                        <tr
                                            key={a.id}
                                            onClick={() => { onSelectAccount?.(a); onNavigate?.(a.profilePath); }}
                                            className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                                        >
                                            {colVisible.carrier && (
                                                <TD>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                                                            {initials(a.legalName)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-semibold text-slate-900 truncate">{a.legalName}</div>
                                                            <div className="text-xs text-slate-500 truncate">DBA {a.dbaName || '—'}</div>
                                                        </div>
                                                    </div>
                                                </TD>
                                            )}
                                            {colVisible.dotNumber && (
                                                <TD className="font-mono text-xs text-slate-700">
                                                    {a.dotNumber || <span className="text-slate-300">—</span>}
                                                </TD>
                                            )}
                                            {colVisible.cvorNscRin && (
                                                <TD>
                                                    {idRows.length === 0 ? (
                                                        <span className="text-xs text-slate-300">—</span>
                                                    ) : (
                                                        <div className="flex flex-col gap-1">
                                                            {idRows.map((r) => (
                                                                <div key={r.label} className="flex items-center gap-1.5">
                                                                    <span className={cn('inline-flex items-center rounded border px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wider', r.cls)}>
                                                                        {r.label}
                                                                    </span>
                                                                    <code className="text-[12px] font-mono font-semibold text-slate-700">{r.value}</code>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </TD>
                                            )}
                                            {colVisible.location && (
                                                <TD>
                                                    <div className="text-sm font-semibold text-slate-900">{a.city}, {a.state}</div>
                                                    <div className="text-[11px] font-medium text-slate-400 inline-flex items-center gap-1 mt-0.5">
                                                        <Circle className="w-2 h-2 fill-current" />
                                                        {a.country === 'US' ? 'United States' : 'Canada'}
                                                    </div>
                                                </TD>
                                            )}
                                            {colVisible.drivers && <TD className="text-sm font-semibold text-slate-900 tabular-nums">{a.drivers.toLocaleString()}</TD>}
                                            {colVisible.assets && <TD className="text-sm font-semibold text-slate-900 tabular-nums">{a.assets.toLocaleString()}</TD>}
                                            {colVisible.safetyRating && (
                                                <TD>
                                                    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', RATING_BADGE[a.safetyRating])}>
                                                        {a.safetyRating}
                                                    </span>
                                                </TD>
                                            )}
                                            {colVisible.status && (
                                                <TD>
                                                    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', STATUS_BADGE[a.status])}>
                                                        <span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full', STATUS_DOT[a.status])} />
                                                        {a.status}
                                                    </span>
                                                </TD>
                                            )}
                                            {colVisible.createdAt && <TD className="text-xs text-slate-500">{fmtDate(a.createdAt)}</TD>}
                                            {colVisible.actions && (
                                                <TD className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                                    <div className="inline-flex items-center gap-1">
                                                        <ActionBtn icon={Eye} title="View carrier" onClick={() => setViewing(a)} />
                                                        <ActionBtn icon={Edit2} title="Edit carrier" onClick={() => setEditing(a)} />
                                                    </div>
                                                </TD>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <PaginationBar
                        totalItems={filtered.length}
                        currentPage={page}
                        rowsPerPage={rowsPerPage}
                        onPageChange={setPage}
                        onRowsPerPageChange={(r) => { setRowsPerPage(r); setPage(1); }}
                    />
                </div>
            </div>

            <CarrierViewModal
                account={viewing}
                onClose={() => setViewing(null)}
                onEdit={(a) => setEditing(a)}
                onOpenProfile={(a) => { onSelectAccount?.(a); onNavigate?.(a.profilePath); }}
            />
            <CarrierEditModal
                account={editing}
                onClose={() => setEditing(null)}
                onSave={handleSaveCarrier}
            />
        </div>
    );
}

// ── Building blocks ────────────────────────────────────────────────────────

function KpiCard({
    label, count, icon: Icon, accent, active, onClick,
}: {
    label: string; count: number; icon: React.ElementType;
    accent: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate' | 'indigo';
    active: boolean; onClick?: () => void;
}) {
    const accents: Record<string, { bar: string; bg: string; text: string; ring: string }> = {
        blue:    { bar: 'border-l-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-600',    ring: 'ring-blue-500' },
        emerald: { bar: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-500' },
        amber:   { bar: 'border-l-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-600',   ring: 'ring-amber-500' },
        rose:    { bar: 'border-l-rose-500',    bg: 'bg-rose-50',    text: 'text-rose-600',    ring: 'ring-rose-500' },
        slate:   { bar: 'border-l-slate-500',   bg: 'bg-slate-100',  text: 'text-slate-600',   ring: 'ring-slate-500' },
        indigo:  { bar: 'border-l-indigo-500',  bg: 'bg-indigo-50',  text: 'text-indigo-600',  ring: 'ring-indigo-500' },
    };
    const c = accents[accent];
    const isClickable = !!onClick;
    return (
        <button
            type="button"
            disabled={!isClickable}
            onClick={onClick}
            className={cn(
                'flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 shadow-sm transition-all text-left',
                c.bar,
                active ? cn('ring-1', c.ring) : 'border-slate-200 hover:shadow',
                !isClickable && 'cursor-default'
            )}
        >
            <div className="flex items-center gap-2.5">
                <div className={cn('p-2 rounded-full', c.bg, c.text)}>
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight">
                    {label}
                </span>
            </div>
            <div className="text-xl font-bold text-slate-900">{count.toLocaleString()}</div>
        </button>
    );
}

function SortHeader({
    label, sortKey, sort, onSort,
}: { label: string; sortKey: SortKey; sort: { key: SortKey; dir: SortDir } | null; onSort: (k: SortKey) => void }) {
    const isActive = sort?.key === sortKey;
    const Icon = !isActive ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className={cn(
                    'inline-flex items-center gap-1.5 transition-colors',
                    isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
                )}
            >
                {label} <Icon size={12} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
            </button>
        </th>
    );
}

function ActionBtn({ icon: Icon, title, onClick }: { icon: React.ElementType; title: string; onClick: () => void }) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            onClick={onClick}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
            <Icon size={14} />
        </button>
    );
}
