import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
    Search,
    Plus,
    Download,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    LayoutGrid,
    Users,
    Check,
    ShieldAlert,
    AlertCircle,
    Pause,
    X,
    Filter,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    Columns,
    Circle,
} from 'lucide-react';
import {
    ACCOUNTS_DB,
    cvorNscRinDisplay,
    type AccountRecord,
    type AccountStatus,
    type SafetyRating,
    type AccountCountry,
} from './accounts.data';
import {
    getCarrierCompliance,
    COMPLIANCE_LEVEL_BADGE,
    COMPLIANCE_LEVEL_DOT,
    type ComplianceLevel,
} from './compliance.utils';
import { Truck as TruckIcon, FileText as FileTextIcon, KeyRound as KeyRoundIcon, Users as UsersIcon } from 'lucide-react';

// ── UI Utility ──────────────────────────────────────────────────────────────

const cn = (...classes: (string | boolean | undefined | null)[]) =>
    classes.filter(Boolean).join(' ');

// ── UI Primitives (shadcn-style, local) ─────────────────────────────────────

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }>(
    ({ className, variant = 'default', size = 'default', ...props }, ref) => {
        const variants: Record<string, string> = {
            default: 'bg-[#2563EB] text-white hover:bg-blue-700 shadow-sm border border-transparent',
            destructive: 'bg-red-500 text-white hover:bg-red-600 shadow-sm border border-transparent',
            outline: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-medium',
            secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 border border-transparent',
            ghost: 'hover:bg-slate-100 text-slate-500 hover:text-slate-900',
            link: 'text-[#2563EB] underline-offset-4 hover:underline p-0 h-auto font-medium',
        };
        const sizes: Record<string, string> = {
            default: 'h-9 px-4 py-2',
            sm: 'h-8 px-3 text-xs',
            xs: 'h-7 px-2.5 text-[11px]',
            icon: 'h-8 w-8',
        };
        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            />
        );
    });
Button.displayName = 'Button';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, type, ...props }, ref) => (
        <input
            type={type}
            className={cn(
                'flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-normal transition-all placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-slate-50',
                className
            )}
            ref={ref}
            {...props}
        />
    ));
Input.displayName = 'Input';

const Badge = ({ children, variant = 'default', className }: { children: React.ReactNode; variant?: string; className?: string }) => {
    const variants: Record<string, string> = {
        default: 'bg-slate-100 text-slate-800 border-transparent',
        Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        Inactive: 'bg-slate-100 text-slate-500 border-slate-200',
        Suspended: 'bg-red-50 text-red-700 border-red-200',
        Pending: 'bg-amber-50 text-amber-700 border-amber-200',
        Satisfactory: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        Conditional: 'bg-amber-50 text-amber-700 border-amber-200',
        Unsatisfactory: 'bg-red-50 text-red-700 border-red-200',
        'Not Rated': 'bg-slate-50 text-slate-500 border-slate-200',
    };
    const dotColor: Record<string, string> = {
        Active: 'bg-emerald-500',
        Inactive: 'bg-slate-400',
        Suspended: 'bg-red-500',
        Pending: 'bg-amber-500',
        Satisfactory: 'bg-emerald-500',
        Conditional: 'bg-amber-500',
        Unsatisfactory: 'bg-red-500',
        'Not Rated': 'bg-slate-400',
    };
    return (
        <div className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', variants[variant] || variants.default, className)}>
            {dotColor[variant] && (
                <span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full', dotColor[variant])} />
            )}
            {children}
        </div>
    );
};

// ── Table Components ────────────────────────────────────────────────────────

const TH = ({ children, className, align = 'left' }: { children?: React.ReactNode; className?: string; align?: string }) => (
    <th className={cn(
        'px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
        className
    )}>
        {children}
    </th>
);

const TD = ({ children, className, align = 'left' }: { children?: React.ReactNode; className?: string; align?: string }) => (
    <td className={cn(
        'px-4 py-3 text-sm whitespace-nowrap align-middle',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
        className
    )}>
        {children}
    </td>
);

// ── Formatting helpers ──────────────────────────────────────────────────────

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

// ── Sort + column filter types ──────────────────────────────────────────────

type SortKey =
    | 'legalName'
    | 'dotNumber'
    | 'cvorNscRin'
    | 'location'
    | 'drivers'
    | 'assets'
    | 'safetyRating'
    | 'status'
    | 'createdAt';

type SortDir = 'asc' | 'desc';

interface ColumnFilters {
    legalName: string;
    dotNumber: string;
    cvorNscRin: string;
    status: Set<AccountStatus>;
    country: Set<AccountCountry>;
    state: Set<string>;
    safetyRating: Set<SafetyRating>;
    driversMin: number | null;
    driversMax: number | null;
    assetsMin: number | null;
    assetsMax: number | null;
    createdYear: string;
}

const EMPTY_FILTERS: ColumnFilters = {
    legalName: '',
    dotNumber: '',
    cvorNscRin: '',
    status: new Set(),
    country: new Set(),
    state: new Set(),
    safetyRating: new Set(),
    driversMin: null,
    driversMax: null,
    assetsMin: null,
    assetsMax: null,
    createdYear: '',
};

// ── Dropdown helper ─────────────────────────────────────────────────────────

function useDropdown(open: boolean, setOpen: (v: boolean) => void) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const onDocClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [open, setOpen]);
    return ref;
}

function FilterIconButton({ active, onClick, label }: { active: boolean; onClick: (e: React.MouseEvent) => void; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'ml-1 inline-flex items-center justify-center w-5 h-5 rounded transition-colors',
                active ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/80'
            )}
            title={`Filter by ${label}`}
            aria-label={`Filter by ${label}`}
        >
            <Filter className="w-3 h-3" />
        </button>
    );
}

// ── Filter primitives ───────────────────────────────────────────────────────

function ColumnValueFilter<T extends string>({ label, options, selected, onChange }: { label: string; options: T[]; selected: Set<T>; onChange: (next: Set<T>) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useDropdown(open, setOpen);
    const toggle = (value: T) => {
        const next = new Set(selected);
        if (next.has(value)) next.delete(value); else next.add(value);
        onChange(next);
    };
    const hasActive = selected.size > 0;
    return (
        <div ref={ref} className="relative inline-block">
            <FilterIconButton active={hasActive} onClick={e => { e.stopPropagation(); setOpen(v => !v); }} label={label} />
            {open && (
                <div className="absolute z-30 mt-1 left-0 w-56 bg-white border border-slate-200/60 rounded-xl shadow-lg py-1 text-left normal-case">
                    <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                        {hasActive && (
                            <button onClick={() => onChange(new Set())} className="text-[11px] text-[#2563EB] hover:underline font-semibold">Clear</button>
                        )}
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1">
                        {options.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">No options</p>}
                        {options.map(opt => {
                            const isSelected = selected.has(opt);
                            return (
                                <button
                                    key={opt}
                                    onClick={() => toggle(opt)}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                                >
                                    <span className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0', isSelected ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'border-slate-300 bg-white')}>
                                        {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
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

function ColumnTextFilter({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
    const [open, setOpen] = useState(false);
    const ref = useDropdown(open, setOpen);
    const hasActive = value.trim().length > 0;
    return (
        <div ref={ref} className="relative inline-block">
            <FilterIconButton active={hasActive} onClick={e => { e.stopPropagation(); setOpen(v => !v); }} label={label} />
            {open && (
                <div className="absolute z-30 mt-1 left-0 w-60 bg-white border border-slate-200/60 rounded-xl shadow-lg p-3 normal-case">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                        {hasActive && (
                            <button onClick={() => onChange('')} className="text-[11px] text-[#2563EB] hover:underline font-semibold">Clear</button>
                        )}
                    </div>
                    <Input
                        autoFocus
                        className="h-8 text-sm"
                        placeholder={placeholder ?? 'Contains…'}
                        value={value}
                        onChange={e => onChange(e.target.value)}
                    />
                </div>
            )}
        </div>
    );
}

function ColumnRangeFilter({ label, min, max, onChange }: { label: string; min: number | null; max: number | null; onChange: (next: { min: number | null; max: number | null }) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useDropdown(open, setOpen);
    const hasActive = min !== null || max !== null;
    const toNum = (s: string): number | null => (s.trim() === '' ? null : Number(s));
    return (
        <div ref={ref} className="relative inline-block">
            <FilterIconButton active={hasActive} onClick={e => { e.stopPropagation(); setOpen(v => !v); }} label={label} />
            {open && (
                <div className="absolute z-30 mt-1 right-0 w-60 bg-white border border-slate-200/60 rounded-xl shadow-lg p-3 normal-case">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                        {hasActive && (
                            <button onClick={() => onChange({ min: null, max: null })} className="text-[11px] text-[#2563EB] hover:underline font-semibold">Clear</button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            min={0}
                            className="h-8 text-sm"
                            placeholder="Min"
                            value={min ?? ''}
                            onChange={e => onChange({ min: toNum(e.target.value), max })}
                        />
                        <span className="text-xs text-slate-400">–</span>
                        <Input
                            type="number"
                            min={0}
                            className="h-8 text-sm"
                            placeholder="Max"
                            value={max ?? ''}
                            onChange={e => onChange({ min, max: toNum(e.target.value) })}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function ColumnYearFilter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useDropdown(open, setOpen);
    const hasActive = value !== '';
    return (
        <div ref={ref} className="relative inline-block">
            <FilterIconButton active={hasActive} onClick={e => { e.stopPropagation(); setOpen(v => !v); }} label={label} />
            {open && (
                <div className="absolute z-30 mt-1 left-0 w-48 bg-white border border-slate-200/60 rounded-xl shadow-lg py-1 normal-case">
                    <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                        {hasActive && (
                            <button onClick={() => onChange('')} className="text-[11px] text-[#2563EB] hover:underline font-semibold">Clear</button>
                        )}
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1">
                        <button
                            onClick={() => onChange('')}
                            className={cn('w-full px-3 py-1.5 text-sm text-left hover:bg-slate-50 transition-colors', value === '' ? 'font-semibold text-[#2563EB] bg-blue-50/40' : 'text-slate-700')}
                        >
                            All years
                        </button>
                        {options.map(y => (
                            <button
                                key={y}
                                onClick={() => onChange(y)}
                                className={cn('w-full px-3 py-1.5 text-sm text-left hover:bg-slate-50 transition-colors', value === y ? 'font-semibold text-[#2563EB] bg-blue-50/40' : 'text-slate-700')}
                            >
                                {y}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function LocationFilter({
    countryOptions, stateOptions,
    countrySel, stateSel,
    onChange,
}: {
    countryOptions: AccountCountry[];
    stateOptions: string[];
    countrySel: Set<AccountCountry>;
    stateSel: Set<string>;
    onChange: (next: { country: Set<AccountCountry>; state: Set<string> }) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useDropdown(open, setOpen);
    const hasActive = countrySel.size > 0 || stateSel.size > 0;

    const visibleStateOptions = useMemo(() => {
        if (countrySel.size === 0) return stateOptions;
        const allowed = new Set<string>();
        for (const a of ACCOUNTS_DB) if (countrySel.has(a.country)) allowed.add(a.state);
        return stateOptions.filter(s => allowed.has(s));
    }, [countrySel, stateOptions]);

    const toggleCountry = (c: AccountCountry) => {
        const next = new Set(countrySel);
        if (next.has(c)) next.delete(c); else next.add(c);
        let nextStates = new Set(stateSel);
        if (next.size > 0) {
            const allowed = new Set<string>();
            for (const a of ACCOUNTS_DB) if (next.has(a.country)) allowed.add(a.state);
            nextStates = new Set([...stateSel].filter(s => allowed.has(s)));
        }
        onChange({ country: next, state: nextStates });
    };

    const toggleState = (s: string) => {
        const next = new Set(stateSel);
        if (next.has(s)) next.delete(s); else next.add(s);
        onChange({ country: countrySel, state: next });
    };

    return (
        <div ref={ref} className="relative inline-block">
            <FilterIconButton active={hasActive} onClick={e => { e.stopPropagation(); setOpen(v => !v); }} label="Location" />
            {open && (
                <div className="absolute z-30 mt-1 left-0 w-72 bg-white border border-slate-200/60 rounded-xl shadow-lg normal-case">
                    <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Location</span>
                        {hasActive && (
                            <button
                                onClick={() => onChange({ country: new Set(), state: new Set() })}
                                className="text-[11px] text-[#2563EB] hover:underline font-semibold"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <div className="px-3 pt-2 pb-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Country</p>
                        <div className="flex gap-1">
                            {countryOptions.map(c => {
                                const active = countrySel.has(c);
                                return (
                                    <button
                                        key={c}
                                        onClick={() => toggleCountry(c)}
                                        className={cn(
                                            'px-3 h-7 rounded-lg text-xs font-semibold border transition-colors',
                                            active
                                                ? 'bg-slate-900 text-white border-slate-900'
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        )}
                                    >
                                        {c}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="px-3 pt-2 pb-2 border-t border-slate-100 mt-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">State / Province</p>
                        <div className="max-h-48 overflow-y-auto -mx-1">
                            {visibleStateOptions.length === 0 && <p className="px-2 py-1.5 text-xs text-slate-400">No states</p>}
                            {visibleStateOptions.map(s => {
                                const active = stateSel.has(s);
                                return (
                                    <button
                                        key={s}
                                        onClick={() => toggleState(s)}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 rounded text-left"
                                    >
                                        <span className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0', active ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'border-slate-300 bg-white')}>
                                            {active && <Check className="w-3 h-3" strokeWidth={3} />}
                                        </span>
                                        <span className="truncate">{s}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Sortable header cell ────────────────────────────────────────────────────

function SortHeaderCell({
    label, sortKey, currentSort, onSort, align = 'left', className, children,
}: {
    label: string;
    sortKey: SortKey;
    currentSort: { key: SortKey; dir: SortDir } | null;
    onSort: (key: SortKey) => void;
    align?: 'left' | 'right';
    className?: string;
    children?: React.ReactNode;
}) {
    const active = currentSort?.key === sortKey;
    const Icon = !active ? ArrowUpDown : currentSort.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
        <TH align={align} className={className}>
            <div className={cn('flex items-center gap-1', align === 'right' ? 'justify-end' : 'justify-start')}>
                <button
                    type="button"
                    onClick={() => onSort(sortKey)}
                    className={cn('inline-flex items-center gap-1 hover:text-slate-700 transition-colors', active && 'text-[#2563EB]')}
                >
                    <span>{label}</span>
                    <Icon className="w-3 h-3" />
                </button>
                {children}
            </div>
        </TH>
    );
}

// ── Page component ──────────────────────────────────────────────────────────

interface AccountsListPageProps {
    onNavigate?: (path: string) => void;
    onSelectAccount?: (account: AccountRecord) => void;
}

type AccountColKey = 'carrier' | 'dotNumber' | 'cvorNscRin' | 'location' | 'drivers' | 'assets' | 'safetyRating' | 'status' | 'createdAt';
const ALL_ACCOUNT_COLUMNS: { key: AccountColKey; label: string }[] = [
    { key: 'carrier',       label: 'Carrier' },
    { key: 'dotNumber',     label: 'DOT #' },
    { key: 'cvorNscRin',    label: 'CVOR / NSC / RIN' },
    { key: 'location',      label: 'Location' },
    { key: 'drivers',       label: 'Drivers' },
    { key: 'assets',        label: 'Assets' },
    { key: 'safetyRating',  label: 'Safety Rating' },
    { key: 'status',        label: 'Status' },
    { key: 'createdAt',     label: 'Created' },
];

export function AccountsListPage({ onNavigate, onSelectAccount }: AccountsListPageProps) {
    const [search, setSearch] = useState('');
    const [columnFilters, setColumnFilters] = useState<ColumnFilters>(EMPTY_FILTERS);
    const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>({ key: 'legalName', dir: 'asc' });
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState<number>(25);
    const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
    const [colVis, setColVis] = useState<Record<AccountColKey, boolean>>({
        carrier: true, dotNumber: true, cvorNscRin: true, location: true, drivers: true,
        assets: true, safetyRating: true, status: true, createdAt: true,
    });
    const columnsMenuRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (columnsMenuRef.current && !columnsMenuRef.current.contains(e.target as Node)) setColumnsMenuOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);
    const visible = (k: AccountColKey) => colVis[k];
    const visibleCount = ALL_ACCOUNT_COLUMNS.filter(c => colVis[c.key]).length;

    const updateFilters = (patch: Partial<ColumnFilters>) => {
        setColumnFilters(prev => ({ ...prev, ...patch }));
        setPage(1);
    };

    // ── Option lists for filter popovers ─────────────────────────────────────
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
    const yearOptions = useMemo<string[]>(
        () => Array.from(new Set(ACCOUNTS_DB.map(a => a.createdAt.slice(0, 4)))).sort().reverse(),
        []
    );

    // ── Filter + sort ────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const nameQ = columnFilters.legalName.trim().toLowerCase();
        const dotQ = columnFilters.dotNumber.trim().toLowerCase();
        const cvorQ = columnFilters.cvorNscRin.trim().toLowerCase();

        return ACCOUNTS_DB.filter(a => {
            if (columnFilters.status.size > 0 && !columnFilters.status.has(a.status)) return false;
            if (columnFilters.country.size > 0 && !columnFilters.country.has(a.country)) return false;
            if (columnFilters.state.size > 0 && !columnFilters.state.has(a.state)) return false;
            if (columnFilters.safetyRating.size > 0 && !columnFilters.safetyRating.has(a.safetyRating)) return false;

            if (columnFilters.driversMin !== null && a.drivers < columnFilters.driversMin) return false;
            if (columnFilters.driversMax !== null && a.drivers > columnFilters.driversMax) return false;
            if (columnFilters.assetsMin !== null && a.assets < columnFilters.assetsMin) return false;
            if (columnFilters.assetsMax !== null && a.assets > columnFilters.assetsMax) return false;

            if (columnFilters.createdYear && a.createdAt.slice(0, 4) !== columnFilters.createdYear) return false;

            if (nameQ && !(a.legalName.toLowerCase().includes(nameQ) || a.dbaName.toLowerCase().includes(nameQ))) return false;
            if (dotQ && !a.dotNumber.toLowerCase().includes(dotQ)) return false;
            if (cvorQ && !cvorNscRinDisplay(a).toLowerCase().includes(cvorQ)) return false;

            if (q) {
                const cvorAll = cvorNscRinDisplay(a).toLowerCase();
                if (!(
                    a.legalName.toLowerCase().includes(q) ||
                    a.dbaName.toLowerCase().includes(q) ||
                    a.dotNumber.toLowerCase().includes(q) ||
                    cvorAll.includes(q) ||
                    a.city.toLowerCase().includes(q) ||
                    a.state.toLowerCase().includes(q)
                )) return false;
            }
            return true;
        });
    }, [search, columnFilters]);

    const sorted = useMemo(() => {
        if (!sort) return filtered;
        const dirMul = sort.dir === 'asc' ? 1 : -1;
        const copy = [...filtered];
        copy.sort((a, b) => {
            let va: string | number;
            let vb: string | number;
            if (sort.key === 'location') {
                va = `${a.state} ${a.city}`;
                vb = `${b.state} ${b.city}`;
            } else if (sort.key === 'cvorNscRin') {
                va = cvorNscRinDisplay(a);
                vb = cvorNscRinDisplay(b);
            } else {
                va = (a as any)[sort.key];
                vb = (b as any)[sort.key];
            }
            if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dirMul;
            return String(va).localeCompare(String(vb)) * dirMul;
        });
        return copy;
    }, [filtered, sort]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
    const safePage = Math.min(page, totalPages);
    const rows = sorted.slice((safePage - 1) * perPage, safePage * perPage);

    const activeColumnFilterCount =
        (columnFilters.legalName ? 1 : 0) +
        (columnFilters.dotNumber ? 1 : 0) +
        (columnFilters.cvorNscRin ? 1 : 0) +
        (columnFilters.status.size > 0 ? 1 : 0) +
        (columnFilters.country.size > 0 ? 1 : 0) +
        (columnFilters.state.size > 0 ? 1 : 0) +
        (columnFilters.safetyRating.size > 0 ? 1 : 0) +
        ((columnFilters.driversMin !== null || columnFilters.driversMax !== null) ? 1 : 0) +
        ((columnFilters.assetsMin !== null || columnFilters.assetsMax !== null) ? 1 : 0) +
        (columnFilters.createdYear ? 1 : 0);

    const anyFilter = !!search || activeColumnFilterCount > 0;

    const clearFilters = () => {
        setSearch('');
        setColumnFilters(EMPTY_FILTERS);
        setPage(1);
    };

    const handleSort = (key: SortKey) => {
        setSort(prev => {
            if (!prev || prev.key !== key) return { key, dir: 'asc' };
            if (prev.dir === 'asc') return { key, dir: 'desc' };
            return null;
        });
    };

    const handleRowClick = (account: AccountRecord) => {
        onSelectAccount?.(account);
        onNavigate?.(account.profilePath);
    };

    // KPI stats — each card acts as a quick filter on status (like AssetDirectoryPage).
    const stats = useMemo(() => ({
        total: ACCOUNTS_DB.length,
        active: ACCOUNTS_DB.filter(a => a.status === 'Active').length,
        pending: ACCOUNTS_DB.filter(a => a.status === 'Pending').length,
        suspended: ACCOUNTS_DB.filter(a => a.status === 'Suspended').length,
        inactive: ACCOUNTS_DB.filter(a => a.status === 'Inactive').length,
        drivers: ACCOUNTS_DB.reduce((s, a) => s + a.drivers, 0),
    }), []);

    const statusFilterFromKpi = (status: AccountStatus | 'all') => {
        if (status === 'all') {
            updateFilters({ status: new Set() });
        } else {
            updateFilters({ status: new Set([status]) });
        }
    };
    const kpiActive = (status: AccountStatus | 'all') => {
        if (status === 'all') return columnFilters.status.size === 0;
        return columnFilters.status.size === 1 && columnFilters.status.has(status);
    };

    return (
        <div className="min-h-full bg-[#F8FAFC] text-slate-900">
            {/* HEADER SECTION */}
            <div className="px-6 pt-6 pb-6 bg-white border-b border-slate-200/60 shadow-sm">
                <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Accounts</h1>
                            <p className="mt-1 text-xs text-slate-500">
                                {ACCOUNTS_DB.length.toLocaleString()} carriers · Click a row to open the carrier profile
                            </p>
                        </div>
                    </div>

                    {/* KPI CARDS (clickable status filters) */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <button onClick={() => statusFilterFromKpi('all')} className={cn('flex items-center justify-between p-4 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all', kpiActive('all') ? 'ring-1 ring-blue-500 border-l-blue-500' : 'border-l-blue-500 border-slate-200')}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-blue-50 text-blue-600"><LayoutGrid className="w-4 h-4" /></div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Total<br />Accounts</span>
                            </div>
                            <div className="text-xl font-bold text-slate-900">{stats.total}</div>
                        </button>
                        <button onClick={() => statusFilterFromKpi('Active')} className={cn('flex items-center justify-between p-4 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all', kpiActive('Active') ? 'ring-1 ring-emerald-500 border-l-emerald-500' : 'border-l-emerald-500 border-slate-200')}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-emerald-50 text-emerald-600"><Check className="w-4 h-4" /></div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Active<br />Accounts</span>
                            </div>
                            <div className="text-xl font-bold text-slate-900">{stats.active}</div>
                        </button>
                        <button onClick={() => statusFilterFromKpi('Pending')} className={cn('flex items-center justify-between p-4 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all', kpiActive('Pending') ? 'ring-1 ring-amber-500 border-l-amber-500' : 'border-l-amber-500 border-slate-200')}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-amber-50 text-amber-600"><AlertCircle className="w-4 h-4" /></div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Pending<br />Accounts</span>
                            </div>
                            <div className="text-xl font-bold text-slate-900">{stats.pending}</div>
                        </button>
                        <button onClick={() => statusFilterFromKpi('Suspended')} className={cn('flex items-center justify-between p-4 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all', kpiActive('Suspended') ? 'ring-1 ring-rose-500 border-l-rose-500' : 'border-l-rose-500 border-slate-200')}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-rose-50 text-rose-600"><ShieldAlert className="w-4 h-4" /></div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Suspended<br />Accounts</span>
                            </div>
                            <div className="text-xl font-bold text-slate-900">{stats.suspended}</div>
                        </button>
                        <button onClick={() => statusFilterFromKpi('Inactive')} className={cn('flex items-center justify-between p-4 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all', kpiActive('Inactive') ? 'ring-1 ring-slate-500 border-l-slate-500' : 'border-l-slate-500 border-slate-200')}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-slate-100 text-slate-600"><Pause className="w-4 h-4" /></div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Inactive<br />Accounts</span>
                            </div>
                            <div className="text-xl font-bold text-slate-900">{stats.inactive}</div>
                        </button>
                        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-l-4 border-l-indigo-500 border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-indigo-50 text-indigo-600"><Users className="w-4 h-4" /></div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Total<br />Drivers</span>
                            </div>
                            <div className="text-xl font-bold text-slate-900">{stats.drivers.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* TOOLBAR — single inline row: search + counter + filter chip + actions */}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full mt-2">
                        <div className="relative w-full lg:w-80 shrink-0">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <Input
                                placeholder="Search name, DOT, CVOR/NSC/RIN, city…"
                                className="pl-10 h-10 text-[14px] bg-white shadow-sm border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all w-full leading-relaxed rounded-lg"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            />
                        </div>
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                            {sorted.length.toLocaleString()} of {ACCOUNTS_DB.length.toLocaleString()} results
                        </span>
                        {activeColumnFilterCount > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 whitespace-nowrap">
                                <Filter className="w-3 h-3" />
                                {activeColumnFilterCount} filter{activeColumnFilterCount === 1 ? '' : 's'}
                            </span>
                        )}
                        {anyFilter && (
                            <Button variant="outline" size="sm" onClick={clearFilters} className="h-8 gap-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 whitespace-nowrap">
                                <X className="w-3.5 h-3.5" /> Clear all
                            </Button>
                        )}
                        <div className="ml-auto flex items-center gap-3 shrink-0">
                            <div className="hidden lg:block w-px h-6 bg-slate-200"></div>

                            {/* Columns dropdown */}
                            <div className="relative" ref={columnsMenuRef}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setColumnsMenuOpen(o => !o)}
                                    className={cn('h-9 gap-2 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium shadow-sm rounded-lg', columnsMenuOpen && 'border-blue-500 ring-2 ring-blue-500/15')}
                                >
                                    <Columns size={14} className="text-slate-500" /> Columns
                                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded">{visibleCount}/{ALL_ACCOUNT_COLUMNS.length}</span>
                                    <ChevronDown size={14} className="ml-0.5 -mr-1 text-slate-400" />
                                </Button>
                                {columnsMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-30">
                                        <div className="px-3 pb-2 mb-1 border-b border-slate-100 flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Visible Columns</span>
                                            <button
                                                onClick={() => setColVis({ carrier:true, dotNumber:true, cvorNscRin:true, location:true, drivers:true, assets:true, safetyRating:true, status:true, createdAt:true })}
                                                className="text-[11px] text-blue-600 hover:underline font-medium"
                                            >Show all</button>
                                        </div>
                                        <div className="max-h-72 overflow-y-auto">
                                            {ALL_ACCOUNT_COLUMNS.map(col => (
                                                <label key={col.key} className="flex items-center px-3 py-1.5 hover:bg-slate-50 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={colVis[col.key]}
                                                        onChange={e => setColVis(prev => ({ ...prev, [col.key]: e.target.checked }))}
                                                        disabled={col.key === 'carrier'}
                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-3 h-4 w-4 disabled:opacity-50"
                                                    />
                                                    <span className="text-sm text-slate-700">{col.label}</span>
                                                    {col.key === 'carrier' && <span className="ml-auto text-[9px] text-slate-400 italic">anchor</span>}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Button variant="outline" size="sm" className="h-9 gap-2 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium shadow-sm rounded-lg">
                                <Download size={14} className="text-slate-500" /> Export
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => onNavigate?.('/accounts/new')}
                                className="h-9 gap-2 px-4 shadow-sm bg-[#2563EB] hover:bg-blue-600 text-white font-medium rounded-lg"
                            >
                                <Plus size={16} /> Add Account
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN LIST VIEW — inline with page, no card wrapper */}
            <div className="px-6 pb-6">
                <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1300px]">
                            <thead className="bg-slate-50/80 border-b border-slate-200">
                                <tr>
                                    {visible('carrier') && (
                                        <SortHeaderCell label="Carrier" sortKey="legalName" currentSort={sort} onSort={handleSort} className="pl-6 min-w-[260px]">
                                            <ColumnTextFilter label="Carrier" value={columnFilters.legalName} onChange={v => updateFilters({ legalName: v })} placeholder="Name or DBA…" />
                                        </SortHeaderCell>
                                    )}
                                    {visible('dotNumber') && (
                                        <SortHeaderCell label="DOT #" sortKey="dotNumber" currentSort={sort} onSort={handleSort} className="w-36">
                                            <ColumnTextFilter label="DOT #" value={columnFilters.dotNumber} onChange={v => updateFilters({ dotNumber: v })} placeholder="Contains digits…" />
                                        </SortHeaderCell>
                                    )}
                                    {visible('cvorNscRin') && (
                                        <SortHeaderCell label="CVOR / NSC / RIN" sortKey="cvorNscRin" currentSort={sort} onSort={handleSort} className="min-w-[220px]">
                                            <ColumnTextFilter label="CVOR / NSC / RIN" value={columnFilters.cvorNscRin} onChange={v => updateFilters({ cvorNscRin: v })} placeholder="e.g. CVOR, ON-, RIN…" />
                                        </SortHeaderCell>
                                    )}
                                    {visible('location') && (
                                        <SortHeaderCell label="Location" sortKey="location" currentSort={sort} onSort={handleSort} className="min-w-[200px]">
                                            <LocationFilter
                                                countryOptions={countryOptions}
                                                stateOptions={stateOptions}
                                                countrySel={columnFilters.country}
                                                stateSel={columnFilters.state}
                                                onChange={({ country, state }) => updateFilters({ country, state })}
                                            />
                                        </SortHeaderCell>
                                    )}
                                    {visible('drivers') && (
                                        <SortHeaderCell label="Drivers" sortKey="drivers" currentSort={sort} onSort={handleSort} align="right" className="w-28">
                                            <ColumnRangeFilter label="Drivers" min={columnFilters.driversMin} max={columnFilters.driversMax} onChange={({ min, max }) => updateFilters({ driversMin: min, driversMax: max })} />
                                        </SortHeaderCell>
                                    )}
                                    {visible('assets') && (
                                        <SortHeaderCell label="Assets" sortKey="assets" currentSort={sort} onSort={handleSort} align="right" className="w-28">
                                            <ColumnRangeFilter label="Assets" min={columnFilters.assetsMin} max={columnFilters.assetsMax} onChange={({ min, max }) => updateFilters({ assetsMin: min, assetsMax: max })} />
                                        </SortHeaderCell>
                                    )}
                                    {visible('safetyRating') && (
                                        <SortHeaderCell label="Safety Rating" sortKey="safetyRating" currentSort={sort} onSort={handleSort} className="w-44">
                                            <ColumnValueFilter<SafetyRating> label="Safety Rating" options={ratingOptions} selected={columnFilters.safetyRating} onChange={next => updateFilters({ safetyRating: next })} />
                                        </SortHeaderCell>
                                    )}
                                    {visible('status') && (
                                        <SortHeaderCell label="Status" sortKey="status" currentSort={sort} onSort={handleSort} className="w-36">
                                            <ColumnValueFilter<AccountStatus> label="Status" options={statusOptions} selected={columnFilters.status} onChange={next => updateFilters({ status: next })} />
                                        </SortHeaderCell>
                                    )}
                                    {visible('createdAt') && (
                                        <SortHeaderCell label="Created" sortKey="createdAt" currentSort={sort} onSort={handleSort} className="w-32 pr-6">
                                            <ColumnYearFilter label="Created year" value={columnFilters.createdYear} options={yearOptions} onChange={v => updateFilters({ createdYear: v })} />
                                        </SortHeaderCell>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600">
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={visibleCount} className="text-center py-20">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                                                    <Search className="w-8 h-8" />
                                                </div>
                                                <p className="text-slate-500 font-medium">No accounts match the current filters</p>
                                                {anyFilter && (
                                                    <button onClick={clearFilters} className="text-sm text-[#2563EB] hover:underline font-medium">
                                                        Clear all filters
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((a) => {
                                        const idRows: Array<{ label: string; value: string; cls: string }> = [];
                                        if (a.cvorNumber) idRows.push({ label: 'CVOR', value: a.cvorNumber, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
                                        if (a.nscNumber)  idRows.push({ label: 'NSC',  value: a.nscNumber,  cls: 'bg-blue-50 text-blue-700 border-blue-200' });
                                        if (a.rinNumber)  idRows.push({ label: 'RIN',  value: a.rinNumber,  cls: 'bg-purple-50 text-purple-700 border-purple-200' });
                                        return (
                                            <tr
                                                key={a.id}
                                                onClick={() => handleRowClick(a)}
                                                className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                                            >
                                                {visible('carrier') && (
                                                    <TD className="pl-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 text-xs font-bold text-blue-700">
                                                                {initials(a.legalName)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-slate-900 text-sm truncate">{a.legalName}</p>
                                                                <p className="text-[11px] text-slate-400 truncate">DBA: {a.dbaName}</p>
                                                            </div>
                                                        </div>
                                                    </TD>
                                                )}
                                                {visible('dotNumber') && (
                                                    <TD>
                                                        {a.dotNumber ? (
                                                            <code className="text-[12px] font-mono font-bold bg-slate-50 px-2 py-1 rounded-lg text-slate-700 border border-slate-200/50 shadow-inner">
                                                                {a.dotNumber}
                                                            </code>
                                                        ) : (
                                                            <span className="text-xs text-slate-300">—</span>
                                                        )}
                                                    </TD>
                                                )}
                                                {visible('cvorNscRin') && (
                                                    <TD>
                                                        {idRows.length === 0 ? (
                                                            <span className="text-xs text-slate-300">—</span>
                                                        ) : (
                                                            <div className="flex flex-col gap-1">
                                                                {idRows.map(r => (
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
                                                {visible('location') && (
                                                    <TD>
                                                        <div className="flex flex-col">
                                                            <span className="text-[13px] font-bold text-slate-900 leading-tight">{a.city}, {a.state}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5 flex items-center gap-1">
                                                                <Circle className="w-2 h-2 fill-current" /> {a.country === 'US' ? 'United States' : 'Canada'}
                                                            </span>
                                                        </div>
                                                    </TD>
                                                )}
                                                {visible('drivers') && (
                                                    <TD align="right">
                                                        <span className="text-[13px] font-bold text-slate-900 tabular-nums">{a.drivers.toLocaleString()}</span>
                                                    </TD>
                                                )}
                                                {visible('assets') && (
                                                    <TD align="right">
                                                        <span className="text-[13px] font-bold text-slate-900 tabular-nums">{a.assets.toLocaleString()}</span>
                                                    </TD>
                                                )}
                                                {visible('safetyRating') && (
                                                    <TD>
                                                        <Badge variant={a.safetyRating}>{a.safetyRating}</Badge>
                                                    </TD>
                                                )}
                                                {visible('status') && (
                                                    <TD>
                                                        <Badge variant={a.status}>{a.status}</Badge>
                                                    </TD>
                                                )}
                                                {visible('createdAt') && (
                                                    <TD className="pr-6">
                                                        <span className="text-xs font-semibold text-slate-500">{fmtDate(a.createdAt)}</span>
                                                    </TD>
                                                )}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION FOOTER */}
                    <div className="shrink-0 border-t border-slate-200 bg-slate-50/50 px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>Rows per page:</span>
                            <select
                                className="h-7 px-2 border border-slate-200 rounded-lg bg-white text-xs focus:outline-none focus:border-blue-400"
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
                            <Button variant="outline" size="icon" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-8 w-8">
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="outline" size="icon" disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="h-8 w-8">
                                <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
}
