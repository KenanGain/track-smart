import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
    Search,
    Plus,
    Download,
    ChevronLeft,
    ChevronRight,
    Building2,
    Truck,
    Users,
    MapPin,
    ShieldCheck,
    X,
    Filter,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    Check,
} from 'lucide-react';
import {
    ACCOUNTS_DB,
    STATUS_BADGE,
    RATING_BADGE,
    type AccountRecord,
    type AccountStatus,
    type SafetyRating,
    type AccountCountry,
} from './accounts.data';

const cn = (...classes: (string | boolean | undefined | null)[]) =>
    classes.filter(Boolean).join(' ');

const Badge = ({ label, cls }: { label: string; cls: string }) => (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold', cls)}>
        {label}
    </span>
);

const fmtDate = (d: string) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: '2-digit' });
};

const initials = (name: string) =>
    name
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0]!.toUpperCase())
        .join('');

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

// ── Sort + column filter types ───────────────────────────────────────────────

type SortKey =
    | 'legalName'
    | 'dotNumber'
    | 'mcNumber'
    | 'location'
    | 'drivers'
    | 'assets'
    | 'safetyRating'
    | 'status'
    | 'createdAt';

type SortDir = 'asc' | 'desc';

interface ColumnFilters {
    status: Set<AccountStatus>;
    country: Set<AccountCountry>;
    state: Set<string>;
    safetyRating: Set<SafetyRating>;
}

const EMPTY_FILTERS: ColumnFilters = {
    status: new Set(),
    country: new Set(),
    state: new Set(),
    safetyRating: new Set(),
};

// ── Column filter popover ────────────────────────────────────────────────────

interface ColumnFilterProps<T extends string> {
    label: string;
    options: T[];
    selected: Set<T>;
    onChange: (next: Set<T>) => void;
}

function ColumnFilter<T extends string>({ label, options, selected, onChange }: ColumnFilterProps<T>) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDocClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [open]);

    const toggle = (value: T) => {
        const next = new Set(selected);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        onChange(next);
    };

    const hasActive = selected.size > 0;

    return (
        <div ref={ref} className="relative inline-block">
            <button
                type="button"
                onClick={e => {
                    e.stopPropagation();
                    setOpen(v => !v);
                }}
                className={cn(
                    'ml-1 inline-flex items-center justify-center w-5 h-5 rounded transition-colors',
                    hasActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                )}
                title={`Filter by ${label}`}
                aria-label={`Filter by ${label}`}
            >
                <Filter className="w-3 h-3" />
            </button>
            {open && (
                <div className="absolute z-30 mt-1 left-0 w-52 bg-white border border-slate-200 rounded-lg shadow-xl py-1 text-left">
                    <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-100">
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</span>
                        {hasActive && (
                            <button
                                onClick={() => onChange(new Set())}
                                className="text-xs text-blue-600 hover:underline font-medium"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1">
                        {options.length === 0 && (
                            <p className="px-3 py-2 text-xs text-slate-400">No options</p>
                        )}
                        {options.map(opt => {
                            const isSelected = selected.has(opt);
                            return (
                                <button
                                    key={opt}
                                    onClick={() => toggle(opt)}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <span
                                        className={cn(
                                            'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                                            isSelected
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : 'border-slate-300 bg-white'
                                        )}
                                    >
                                        {isSelected && <Check className="w-3 h-3" />}
                                    </span>
                                    <span className="truncate">{opt}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Sortable header cell ─────────────────────────────────────────────────────

interface SortHeaderProps {
    label: string;
    sortKey: SortKey;
    currentSort: { key: SortKey; dir: SortDir } | null;
    onSort: (key: SortKey) => void;
    align?: 'left' | 'right';
    children?: React.ReactNode; // for optional filter slot
}

function SortHeader({ label, sortKey, currentSort, onSort, align = 'left', children }: SortHeaderProps) {
    const active = currentSort?.key === sortKey;
    const Icon = !active ? ArrowUpDown : currentSort.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
        <th
            className={cn(
                'px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap select-none',
                align === 'right' ? 'text-right' : 'text-left'
            )}
        >
            <div className={cn('flex items-center gap-1', align === 'right' ? 'justify-end' : 'justify-start')}>
                <button
                    type="button"
                    onClick={() => onSort(sortKey)}
                    className={cn(
                        'inline-flex items-center gap-1 hover:text-slate-700 transition-colors',
                        active && 'text-blue-700'
                    )}
                >
                    <span>{label}</span>
                    <Icon className="w-3 h-3" />
                </button>
                {children}
            </div>
        </th>
    );
}

interface AccountsListPageProps {
    onNavigate?: (path: string) => void;
    onSelectAccount?: (account: AccountRecord) => void;
}

export function AccountsListPage({ onNavigate, onSelectAccount }: AccountsListPageProps) {
    const [search, setSearch] = useState('');
    const [columnFilters, setColumnFilters] = useState<ColumnFilters>(EMPTY_FILTERS);
    const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>({ key: 'legalName', dir: 'asc' });
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState<number>(25);

    // ── Unique option lists for filter popovers (computed once from the DB) ──
    const statusOptions = useMemo<AccountStatus[]>(
        () => Array.from(new Set(ACCOUNTS_DB.map(a => a.status))).sort(),
        []
    );
    const countryOptions = useMemo<AccountCountry[]>(
        () => Array.from(new Set(ACCOUNTS_DB.map(a => a.country))).sort() as AccountCountry[],
        []
    );
    const stateOptions = useMemo<string[]>(
        () => Array.from(new Set(ACCOUNTS_DB.map(a => a.state))).sort(),
        []
    );
    const ratingOptions = useMemo<SafetyRating[]>(
        () => Array.from(new Set(ACCOUNTS_DB.map(a => a.safetyRating))).sort() as SafetyRating[],
        []
    );

    // ── Apply search + column filters ────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return ACCOUNTS_DB.filter(a => {
            if (columnFilters.status.size > 0 && !columnFilters.status.has(a.status)) return false;
            if (columnFilters.country.size > 0 && !columnFilters.country.has(a.country)) return false;
            if (columnFilters.state.size > 0 && !columnFilters.state.has(a.state)) return false;
            if (columnFilters.safetyRating.size > 0 && !columnFilters.safetyRating.has(a.safetyRating)) return false;
            if (!q) return true;
            return (
                a.legalName.toLowerCase().includes(q) ||
                a.dbaName.toLowerCase().includes(q) ||
                a.dotNumber.toLowerCase().includes(q) ||
                a.mcNumber.toLowerCase().includes(q) ||
                a.city.toLowerCase().includes(q) ||
                a.state.toLowerCase().includes(q)
            );
        });
    }, [search, columnFilters]);

    // ── Sort ──────────────────────────────────────────────────────────────────
    const sorted = useMemo(() => {
        if (!sort) return filtered;
        const dirMul = sort.dir === 'asc' ? 1 : -1;
        const copy = [...filtered];
        copy.sort((a, b) => {
            const va = sort.key === 'location' ? `${a.state} ${a.city}` : (a as any)[sort.key];
            const vb = sort.key === 'location' ? `${b.state} ${b.city}` : (b as any)[sort.key];
            if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dirMul;
            return String(va).localeCompare(String(vb)) * dirMul;
        });
        return copy;
    }, [filtered, sort]);

    // ── Pagination ───────────────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
    const safePage = Math.min(page, totalPages);
    const rows = sorted.slice((safePage - 1) * perPage, safePage * perPage);

    const filterCount =
        columnFilters.status.size +
        columnFilters.country.size +
        columnFilters.state.size +
        columnFilters.safetyRating.size;
    const anyFilter = !!search || filterCount > 0;

    const clearFilters = () => {
        setSearch('');
        setColumnFilters({
            status: new Set(),
            country: new Set(),
            state: new Set(),
            safetyRating: new Set(),
        });
        setPage(1);
    };

    const handleSort = (key: SortKey) => {
        setSort(prev => {
            if (!prev || prev.key !== key) return { key, dir: 'asc' };
            if (prev.dir === 'asc') return { key, dir: 'desc' };
            return null; // third click clears sort
        });
    };

    const handleRowClick = (account: AccountRecord) => {
        onSelectAccount?.(account);
        onNavigate?.(account.profilePath);
    };

    const kpi = useMemo(() => {
        const total = ACCOUNTS_DB.length;
        const active = ACCOUNTS_DB.filter(a => a.status === 'Active').length;
        const drivers = ACCOUNTS_DB.reduce((s, a) => s + a.drivers, 0);
        const assets = ACCOUNTS_DB.reduce((s, a) => s + a.assets, 0);
        return { total, active, drivers, assets };
    }, []);

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 shrink-0">
                <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <nav className="flex items-center gap-2 mb-1 text-sm font-medium text-slate-500" aria-label="Breadcrumb">
                            <span>Accounts</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-900">Directory</span>
                        </nav>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Accounts</h1>
                        <p className="mt-1 text-xs text-slate-500">
                            {ACCOUNTS_DB.length.toLocaleString()} carriers · Click a row to open the carrier profile
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-all">
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                        <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-all">
                            <Plus className="w-4 h-4" />
                            Add Account
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="p-4 space-y-4">
                    {/* KPIs */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <KPICard label="Total Accounts" value={kpi.total.toLocaleString()} icon={Building2} barColor="bg-blue-500" textColor="text-blue-700" />
                        <KPICard label="Active" value={kpi.active.toLocaleString()} icon={ShieldCheck} barColor="bg-emerald-500" textColor="text-emerald-700" />
                        <KPICard label="Drivers" value={kpi.drivers.toLocaleString()} icon={Users} barColor="bg-indigo-500" textColor="text-indigo-700" />
                        <KPICard label="Assets" value={kpi.assets.toLocaleString()} icon={Truck} barColor="bg-amber-500" textColor="text-amber-700" />
                    </div>

                    {/* Search bar */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
                        <div className="flex flex-col sm:flex-row gap-2 items-center">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    className="w-full h-9 pl-8 pr-3 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                    placeholder="Search legal name, DBA, DOT, MC, city, state…"
                                    value={search}
                                    onChange={e => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                />
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                                {filterCount > 0 && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1">
                                        {filterCount} column filter{filterCount === 1 ? '' : 's'} active
                                    </span>
                                )}
                                {anyFilter && (
                                    <button
                                        onClick={clearFilters}
                                        className="flex items-center gap-1 h-8 px-2.5 text-xs font-medium border border-slate-200 rounded-lg bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                                    >
                                        <X className="w-3 h-3" /> Clear all
                                    </button>
                                )}
                                <span className="text-xs text-slate-400 whitespace-nowrap">
                                    {sorted.length.toLocaleString()} results
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
                        <div className="overflow-x-auto overflow-y-visible">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <SortHeader label="Carrier" sortKey="legalName" currentSort={sort} onSort={handleSort} />
                                        <SortHeader label="DOT #" sortKey="dotNumber" currentSort={sort} onSort={handleSort} />
                                        <SortHeader label="MC #" sortKey="mcNumber" currentSort={sort} onSort={handleSort} />
                                        <SortHeader label="Location" sortKey="location" currentSort={sort} onSort={handleSort}>
                                            <ColumnFilter<AccountCountry>
                                                label="Country"
                                                options={countryOptions}
                                                selected={columnFilters.country}
                                                onChange={next => { setColumnFilters(f => ({ ...f, country: next })); setPage(1); }}
                                            />
                                            <ColumnFilter<string>
                                                label="State/Prov"
                                                options={stateOptions}
                                                selected={columnFilters.state}
                                                onChange={next => { setColumnFilters(f => ({ ...f, state: next })); setPage(1); }}
                                            />
                                        </SortHeader>
                                        <SortHeader label="Drivers" sortKey="drivers" currentSort={sort} onSort={handleSort} align="right" />
                                        <SortHeader label="Assets" sortKey="assets" currentSort={sort} onSort={handleSort} align="right" />
                                        <SortHeader label="Safety Rating" sortKey="safetyRating" currentSort={sort} onSort={handleSort}>
                                            <ColumnFilter<SafetyRating>
                                                label="Safety Rating"
                                                options={ratingOptions}
                                                selected={columnFilters.safetyRating}
                                                onChange={next => { setColumnFilters(f => ({ ...f, safetyRating: next })); setPage(1); }}
                                            />
                                        </SortHeader>
                                        <SortHeader label="Status" sortKey="status" currentSort={sort} onSort={handleSort}>
                                            <ColumnFilter<AccountStatus>
                                                label="Status"
                                                options={statusOptions}
                                                selected={columnFilters.status}
                                                onChange={next => { setColumnFilters(f => ({ ...f, status: next })); setPage(1); }}
                                            />
                                        </SortHeader>
                                        <SortHeader label="Created" sortKey="createdAt" currentSort={sort} onSort={handleSort} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="text-center py-12 text-slate-400 text-sm">
                                                No accounts match the current filters.
                                            </td>
                                        </tr>
                                    )}
                                    {rows.map(a => (
                                        <tr
                                            key={a.id}
                                            onClick={() => handleRowClick(a)}
                                            className="border-b border-slate-100 cursor-pointer hover:bg-blue-50/30 transition-colors"
                                        >
                                            <td className="px-3 py-2.5 max-w-[320px]">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 text-xs font-bold text-blue-700">
                                                        {initials(a.legalName)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-800 text-sm truncate">{a.legalName}</p>
                                                        <p className="text-xs text-slate-400 truncate">DBA: {a.dbaName}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <code className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-mono font-semibold">
                                                    {a.dotNumber}
                                                </code>
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <code className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-mono font-semibold">
                                                    {a.mcNumber}
                                                </code>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center gap-1.5 text-slate-700">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span className="text-xs">
                                                        <span className="font-medium">{a.city}</span>
                                                        <span className="text-slate-400">, {a.state} · {a.country}</span>
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 text-right tabular-nums text-xs font-semibold text-slate-700">
                                                {a.drivers.toLocaleString()}
                                            </td>
                                            <td className="px-3 py-2.5 text-right tabular-nums text-xs font-semibold text-slate-700">
                                                {a.assets.toLocaleString()}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <Badge label={a.safetyRating} cls={RATING_BADGE[a.safetyRating]} />
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <Badge label={a.status} cls={STATUS_BADGE[a.status]} />
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-500">
                                                {fmtDate(a.createdAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-3 flex-wrap bg-slate-50/50">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>Rows per page:</span>
                                <select
                                    className="h-7 px-2 border border-slate-200 rounded bg-white text-xs focus:outline-none"
                                    value={perPage}
                                    onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                                >
                                    {PAGE_SIZE_OPTIONS.map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                                <span className="ml-3 text-slate-400">
                                    Showing {sorted.length === 0 ? 0 : (safePage - 1) * perPage + 1}
                                    –{Math.min(safePage * perPage, sorted.length)} of {sorted.length.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">
                                    Page {safePage} of {totalPages}
                                </span>
                                <button
                                    disabled={safePage <= 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className="h-7 w-7 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    disabled={safePage >= totalPages}
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    className="h-7 w-7 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const KPICard = ({
    label, value, icon: Icon, barColor, textColor,
}: {
    label: string;
    value: string | number;
    icon: React.ElementType;
    barColor: string;
    textColor: string;
}) => (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex overflow-hidden">
        <div className={cn('w-1.5 shrink-0', barColor)} />
        <div className="flex-1 p-3 min-w-0">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-xs text-slate-500 truncate">{label}</p>
                    <p className={cn('text-2xl font-bold mt-0.5', textColor)}>{value}</p>
                </div>
                <div className={cn('rounded-lg p-1.5 shrink-0 bg-slate-50')}>
                    <Icon className={cn('w-4 h-4', textColor)} />
                </div>
            </div>
        </div>
    </div>
);
