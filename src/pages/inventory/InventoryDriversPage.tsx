import { useMemo, useState } from 'react';
import {
    Search,
    Mail,
    Phone,
    MapPin,
    UserCheck,
    UserMinus,
    UserX,
    Users,
    Calendar,
    LayoutGrid,
    Filter,
    X,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
} from 'lucide-react';
import { ACCOUNTS_DB } from '@/pages/accounts/accounts.data';
import { CARRIER_DRIVERS } from '@/pages/accounts/carrier-drivers.data';
import type { Driver } from '@/data/mock-app-data';
import { AccountPicker } from './InventoryAssetsPage';

const cn = (...x: (string | boolean | null | undefined)[]) =>
    x.filter(Boolean).join(' ');

type DriverWithMeta = Driver & { _accountId: string; _carrierName: string };

// ── Status maps ─────────────────────────────────────────────────────────────

const STATUS_FILTERS: { key: string; label: string; color: 'blue' | 'emerald' | 'slate' | 'amber' | 'red'; icon: any }[] = [
    { key: 'All',        label: 'All Drivers', color: 'blue',    icon: LayoutGrid },
    { key: 'Active',     label: 'Active',      color: 'emerald', icon: UserCheck },
    { key: 'Inactive',   label: 'Inactive',    color: 'slate',   icon: UserMinus },
    { key: 'On Leave',   label: 'On Leave',    color: 'amber',   icon: Calendar },
    { key: 'Terminated', label: 'Terminated',  color: 'red',     icon: UserX },
];

const STATUS_BADGE: Record<string, string> = {
    Active:     'bg-emerald-50 text-emerald-700 border-emerald-200',
    Inactive:   'bg-slate-100 text-slate-600 border-slate-200',
    'On Leave': 'bg-amber-50 text-amber-700 border-amber-200',
    Terminated: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_DOT: Record<string, string> = {
    Active:     'bg-emerald-500',
    Inactive:   'bg-slate-400',
    'On Leave': 'bg-amber-500',
    Terminated: 'bg-red-500',
};

const COLOR_CLASSES: Record<string, { ringActive: string; borderL: string; iconBg: string; iconText: string }> = {
    blue:    { ringActive: 'ring-blue-500',    borderL: 'border-l-blue-500',    iconBg: 'bg-blue-50',    iconText: 'text-blue-600' },
    emerald: { ringActive: 'ring-emerald-500', borderL: 'border-l-emerald-500', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
    slate:   { ringActive: 'ring-slate-500',   borderL: 'border-l-slate-500',   iconBg: 'bg-slate-100',  iconText: 'text-slate-600' },
    amber:   { ringActive: 'ring-amber-500',   borderL: 'border-l-amber-500',   iconBg: 'bg-amber-50',   iconText: 'text-amber-600' },
    red:     { ringActive: 'ring-red-500',     borderL: 'border-l-red-500',     iconBg: 'bg-red-50',     iconText: 'text-red-600' },
};

type SortKey = 'name' | 'hiredDate' | 'carrier' | 'status';

// ── Page ────────────────────────────────────────────────────────────────────

export function InventoryDriversPage() {
    const [selectedId, setSelectedId] = useState<string | 'all'>('all');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<string>('All');
    const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });

    // Map id → carrier name once for fast lookup.
    const accountsById = useMemo(() => {
        const m = new Map<string, string>();
        ACCOUNTS_DB.forEach((a) => m.set(a.id, a.legalName));
        return m;
    }, []);

    const drivers = useMemo<DriverWithMeta[]>(() => {
        const tag = (id: string): DriverWithMeta[] =>
            (CARRIER_DRIVERS[id] ?? []).map((d) => ({
                ...d,
                _accountId: id,
                _carrierName: accountsById.get(id) ?? '—',
            }));

        if (selectedId === 'all') return ACCOUNTS_DB.flatMap((a) => tag(a.id));
        return tag(selectedId);
    }, [selectedId, accountsById]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return drivers.filter((d) => {
            if (status !== 'All' && d.status !== status) return false;
            if (q) {
                if (
                    !d.name.toLowerCase().includes(q) &&
                    !d.id.toLowerCase().includes(q) &&
                    !d.email.toLowerCase().includes(q) &&
                    !d.phone.toLowerCase().includes(q) &&
                    !d._carrierName.toLowerCase().includes(q)
                ) {
                    return false;
                }
            }
            return true;
        });
    }, [drivers, search, status]);

    const sorted = useMemo(() => {
        const dirMul = sort.dir === 'asc' ? 1 : -1;
        const copy = [...filtered];
        copy.sort((a, b) => {
            let va: string;
            let vb: string;
            if (sort.key === 'carrier') {
                va = a._carrierName;
                vb = b._carrierName;
            } else if (sort.key === 'hiredDate') {
                va = a.hiredDate || '';
                vb = b.hiredDate || '';
            } else if (sort.key === 'status') {
                va = a.status;
                vb = b.status;
            } else {
                va = a.name;
                vb = b.name;
            }
            return va.localeCompare(vb) * dirMul;
        });
        return copy;
    }, [filtered, sort]);

    const stats = useMemo(
        () => ({
            All:        drivers.length,
            Active:     drivers.filter((d) => d.status === 'Active').length,
            Inactive:   drivers.filter((d) => d.status === 'Inactive').length,
            'On Leave': drivers.filter((d) => d.status === 'On Leave').length,
            Terminated: drivers.filter((d) => d.status === 'Terminated').length,
        }),
        [drivers]
    );

    const selected = ACCOUNTS_DB.find((a) => a.id === selectedId);
    const anyFilter = !!search || status !== 'All';

    const clearFilters = () => {
        setSearch('');
        setStatus('All');
    };

    const handleSort = (key: SortKey) => {
        setSort((prev) =>
            prev.key === key
                ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { key, dir: 'asc' }
        );
    };

    const SortIcon = ({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) =>
        !active ? (
            <ArrowUpDown className="w-3 h-3 text-slate-300" />
        ) : dir === 'asc' ? (
            <ArrowUp className="w-3 h-3 text-blue-600" />
        ) : (
            <ArrowDown className="w-3 h-3 text-blue-600" />
        );

    return (
        <div className="h-full flex flex-col bg-[#F8FAFC] text-slate-900 overflow-hidden">
            {/* UNIFIED PAGE HEADER */}
            <div className="px-6 pt-6 pb-5 bg-white border-b border-slate-200/60 shadow-sm shrink-0 z-30">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inventory</span>
                                <span className="text-slate-300">·</span>
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Drivers</span>
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Driver Directory</h1>
                            <p className="mt-1 text-sm text-slate-500">
                                {selectedId === 'all' ? (
                                    <>
                                        Aggregating <span className="font-semibold text-slate-700">{drivers.length.toLocaleString()}</span> drivers across{' '}
                                        <span className="font-semibold text-slate-700">{ACCOUNTS_DB.length.toLocaleString()}</span> carriers
                                    </>
                                ) : (
                                    <>
                                        Showing <span className="font-semibold text-slate-700">{drivers.length.toLocaleString()}</span> drivers for{' '}
                                        <span className="font-semibold text-slate-700">{selected?.legalName ?? 'selected carrier'}</span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                    <AccountPicker selectedId={selectedId} onChange={setSelectedId} />
                </div>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-auto">
                <div className="px-6 pt-6 pb-8 space-y-5">
                    {/* STATUS QUICK FILTERS */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {STATUS_FILTERS.map((f) => {
                            const Icon = f.icon;
                            const c = COLOR_CLASSES[f.color];
                            const active = status === f.key;
                            return (
                                <button
                                    key={f.key}
                                    type="button"
                                    onClick={() => setStatus(f.key)}
                                    className={cn(
                                        'flex items-center justify-between p-4 bg-white rounded-xl border border-l-4 shadow-sm hover:shadow transition-all text-left',
                                        active ? cn('ring-1', c.ringActive, c.borderL) : cn(c.borderL, 'border-slate-200')
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn('p-2 rounded-full', c.iconBg, c.iconText)}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight">
                                            {f.label}
                                        </span>
                                    </div>
                                    <span className="text-2xl font-bold text-slate-900">
                                        {(stats as any)[f.key]?.toLocaleString() ?? 0}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* TOOLBAR — search + filter chips */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm">
                        <div className="px-5 py-4 flex items-center gap-3 flex-wrap">
                            <div className="relative flex-1 min-w-[260px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search drivers by name, email, phone, ID, or carrier…"
                                    className="h-10 w-full pl-10 pr-4 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5"
                                />
                            </div>
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                                <Filter className="w-3.5 h-3.5" />
                                {filtered.length.toLocaleString()} of {drivers.length.toLocaleString()} drivers
                            </span>
                            {anyFilter && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 border border-slate-200 rounded-lg transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" /> Clear filters
                                </button>
                            )}
                        </div>

                        {/* TABLE */}
                        <div className="border-t border-slate-100 overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[1100px]">
                                <thead className="bg-slate-50/80 border-b border-slate-200">
                                    <tr>
                                        <th
                                            className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 transition-colors"
                                            onClick={() => handleSort('name')}
                                        >
                                            <span className="inline-flex items-center gap-1.5">
                                                Driver <SortIcon active={sort.key === 'name'} dir={sort.dir} />
                                            </span>
                                        </th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">License</th>
                                        <th
                                            className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 transition-colors"
                                            onClick={() => handleSort('hiredDate')}
                                        >
                                            <span className="inline-flex items-center gap-1.5">
                                                Hired <SortIcon active={sort.key === 'hiredDate'} dir={sort.dir} />
                                            </span>
                                        </th>
                                        {selectedId === 'all' && (
                                            <th
                                                className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 transition-colors"
                                                onClick={() => handleSort('carrier')}
                                            >
                                                <span className="inline-flex items-center gap-1.5">
                                                    Carrier <SortIcon active={sort.key === 'carrier'} dir={sort.dir} />
                                                </span>
                                            </th>
                                        )}
                                        <th
                                            className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 transition-colors"
                                            onClick={() => handleSort('status')}
                                        >
                                            <span className="inline-flex items-center gap-1.5">
                                                Status <SortIcon active={sort.key === 'status'} dir={sort.dir} />
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-600">
                                    {sorted.length === 0 ? (
                                        <tr>
                                            <td colSpan={selectedId === 'all' ? 6 : 5} className="text-center py-20">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                                                        <Users className="w-8 h-8" />
                                                    </div>
                                                    <p className="text-slate-500 font-medium">
                                                        No drivers match the current filters
                                                    </p>
                                                    {anyFilter && (
                                                        <button
                                                            type="button"
                                                            onClick={clearFilters}
                                                            className="text-sm text-blue-600 hover:underline font-semibold"
                                                        >
                                                            Clear filters
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        sorted.map((d) => {
                                            const license = (d as any).licenses?.[0];
                                            return (
                                                <tr key={d.id + d._accountId} className="hover:bg-blue-50/40 transition-colors">
                                                    <td className="px-4 py-3 align-middle">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                                                                {d.avatarInitials}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-semibold text-slate-900 truncate">{d.name}</div>
                                                                <div className="text-[11px] text-slate-500 font-mono">{d.id}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 align-middle">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-xs text-slate-700 inline-flex items-center gap-1.5">
                                                                <Mail className="w-3 h-3 text-slate-400" />
                                                                {d.email}
                                                            </span>
                                                            <span className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                                                                <Phone className="w-3 h-3 text-slate-400" />
                                                                {d.phone}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 align-middle">
                                                        {license ? (
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-xs font-mono text-slate-700">
                                                                    {license.licenseNumber || '—'}
                                                                </span>
                                                                <span className="text-[11px] text-slate-500 inline-flex items-center gap-1.5">
                                                                    <MapPin className="w-3 h-3 text-slate-400" />
                                                                    {license.licenseClass || ''} {license.country || ''}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 align-middle">
                                                        <span className="text-xs text-slate-500">{d.hiredDate || '—'}</span>
                                                    </td>
                                                    {selectedId === 'all' && (
                                                        <td className="px-4 py-3 align-middle">
                                                            <span className="text-xs font-semibold text-slate-700 truncate inline-block max-w-[200px]">
                                                                {d._carrierName}
                                                            </span>
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-3 align-middle">
                                                        <span
                                                            className={cn(
                                                                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                                                                STATUS_BADGE[d.status] ?? STATUS_BADGE.Inactive
                                                            )}
                                                        >
                                                            <span
                                                                className={cn(
                                                                    'mr-1.5 h-1.5 w-1.5 rounded-full',
                                                                    STATUS_DOT[d.status] ?? STATUS_DOT.Inactive
                                                                )}
                                                            />
                                                            {d.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* FOOTER */}
                        <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3 flex items-center justify-between gap-3 flex-wrap text-xs text-slate-500">
                            <span>
                                Showing <span className="font-semibold text-slate-700">{sorted.length.toLocaleString()}</span> of{' '}
                                <span className="font-semibold text-slate-700">{drivers.length.toLocaleString()}</span> drivers
                                {selectedId !== 'all' && selected ? (
                                    <>
                                        {' '}for <span className="font-semibold text-slate-700">{selected.legalName}</span>
                                    </>
                                ) : null}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InventoryDriversPage;

export type { Driver };
