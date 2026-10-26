import React, { Fragment, useMemo, useState } from 'react';
import {
    LayoutGrid, Users, Check, ShieldAlert, AlertCircle, Pause, Building2,
    Download, PanelRight, SlidersHorizontal,
} from 'lucide-react';
import {
    ACCOUNTS_DB,
    cvorNscRinDisplay,
    type AccountRecord,
    type AccountStatus,
    type SafetyRating,
} from './accounts.data';
import { SERVICE_PROFILES_DB } from './service-profiles.data';
import { CarrierViewModal } from './CarrierViewModal';
import { CarrierEditModal } from './CarrierEditModal';
import { RowActions } from '@/components/ui/RowActions';
import { KpiStatRow, type KpiStat } from '@/components/ui/KpiStatCard';
import {
    ColumnPicker, FilterSelect, ListToolbar, ResetFilters, SortTh, TableGroupBand, TablePager,
    useTableSort, type PickerColumn,
} from '@/components/ui/ListChrome';
import { PAGE_PAD } from '@/components/ui/ListPageHeader';
import { ListScrollFrame } from '@/components/ui/ListScrollFrame';
import { chipsFromStats, useHeaderChips } from '@/components/ui/list-header-bridge';
import { type AppUser } from '@/data/users.data';
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

const STATUSES: AccountStatus[] = ['Active', 'Pending', 'Suspended', 'Inactive'];
const RATINGS: SafetyRating[] = ['Satisfactory', 'Conditional', 'Unsatisfactory', 'Not Rated'];

// ── Columns ────────────────────────────────────────────────────────────────

type Col =
    | 'carrier' | 'dotNumber' | 'cvorNscRin' | 'service' | 'location'
    | 'drivers' | 'assets' | 'safetyRating' | 'status' | 'createdAt';

const COLUMNS: PickerColumn<Col>[] = [
    { id: 'carrier', label: 'Carrier', locked: true },
    { id: 'dotNumber', label: 'DOT #' },
    { id: 'cvorNscRin', label: 'CVOR / NSC / RIN' },
    { id: 'service', label: 'Service profile' },
    { id: 'location', label: 'Location' },
    { id: 'drivers', label: 'Drivers' },
    { id: 'assets', label: 'Assets' },
    { id: 'safetyRating', label: 'Safety rating' },
    { id: 'status', label: 'Status' },
    { id: 'createdAt', label: 'Created' },
];

type GroupBy = 'none' | 'status' | 'safetyRating' | 'service' | 'country' | 'state';
const GROUPS: { id: GroupBy; label: string }[] = [
    { id: 'none', label: 'No grouping' },
    { id: 'status', label: 'Group: Status' },
    { id: 'safetyRating', label: 'Group: Safety rating' },
    { id: 'service', label: 'Group: Service profile' },
    { id: 'country', label: 'Group: Country' },
    { id: 'state', label: 'Group: State / province' },
];

interface AccountsListPageProps {
    onNavigate?: (path: string) => void;
    onSelectAccount?: (account: AccountRecord) => void;
    /** Rendered inside another page's header (Accounts tabs, Super Admin dashboard). */
    embedded?: boolean;
    /** Logged-in user — drives row-level visibility (admins only see what they manage/created). */
    currentUser?: AppUser | null;
    /** The table body is the thing that scrolls; a host that condenses its header listens here. */
    scrollRef?: React.Ref<HTMLDivElement>;
    onScroll?: React.UIEventHandler<HTMLDivElement>;
    /** Horizontal padding, matched to the host header. */
    pad?: string;
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
const countryName = (a: AccountRecord) => (a.country === 'US' ? 'United States' : 'Canada');
const serviceName = (a: AccountRecord) => {
    const sp = SERVICE_PROFILES_DB.find((p) => p.id === a.serviceProfileId);
    return sp ? sp.dbaName || sp.legalName : '';
};

// Pinned to the top of the table's own scroll box, so a column keeps its name 30 rows down.
// The rule under it is an inset shadow: a sticky cell's own border scrolls away with the rows.
const PIN_TH = 'sticky top-0 z-10 bg-slate-50 shadow-[inset_0_-1px_0_#e2e8f0]';

const TD = ({ children, className, onClick }: { children?: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) => (
    <td onClick={onClick} className={cn('px-4 py-2.5 text-sm align-middle whitespace-nowrap', className)}>{children}</td>
);

// ── Page ───────────────────────────────────────────────────────────────────

export function AccountsListPage({ onNavigate, onSelectAccount, currentUser, scrollRef, onScroll, pad = PAGE_PAD }: AccountsListPageProps) {
    const [search, setSearch] = useState('');
    const [visible, setVisible] = useState<Set<Col>>(() => new Set(COLUMNS.map((c) => c.id)));
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>('all');
    const [rating, setRating] = useState('');
    const [country, setCountry] = useState('');
    const [service, setService] = useState('');
    const [groupBy, setGroupBy] = useState<GroupBy>('none');
    // Phones only: the filter row folds behind a button so the table keeps the screen.
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [accounts, setAccounts] = useState<AccountRecord[]>(ACCOUNTS_DB);
    const [viewing, setViewing] = useState<AccountRecord | null>(null);
    const [editing, setEditing] = useState<AccountRecord | null>(null);

    // Role-aware visibility:
    //   - Super admin → all carriers
    //   - Admin → carriers they manage OR created OR under their service profile
    //   - User → carriers they're assigned to (managedAccountIds or accountId)
    const accountsScoped = useMemo(() => {
        if (!currentUser || currentUser.role === 'super-admin') return accounts;
        const managed = currentUser.managedAccountIds && currentUser.managedAccountIds.length > 0
            ? currentUser.managedAccountIds
            : currentUser.accountId ? [currentUser.accountId] : [];
        const sp = currentUser.serviceProfileId;
        return accounts.filter((a) =>
            managed.includes(a.id) ||
            (a.createdByUserId && a.createdByUserId === currentUser.id) ||
            (!!sp && a.serviceProfileId === sp)
        );
    }, [accounts, currentUser]);

    const show = (c: Col) => visible.has(c);
    const toggleColumn = (id: Col) =>
        setVisible((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const colCount = COLUMNS.filter((c) => c.locked || visible.has(c.id)).length + 1;
    const serviceOptions = useMemo(
        () => [...new Set(accountsScoped.map(serviceName).filter(Boolean))].sort(),
        [accountsScoped],
    );

    // KPI stats — based on the scoped list, not the full DB
    const stats: KpiStat[] = useMemo(() => [
        { id: 'all', label: 'Total', value: accountsScoped.length, Icon: LayoutGrid, accent: 'blue' },
        { id: 'Active', label: 'Active', value: accountsScoped.filter((a) => a.status === 'Active').length, Icon: Check, accent: 'emerald' },
        { id: 'Pending', label: 'Pending', value: accountsScoped.filter((a) => a.status === 'Pending').length, Icon: AlertCircle, accent: 'amber' },
        { id: 'Suspended', label: 'Suspended', value: accountsScoped.filter((a) => a.status === 'Suspended').length, Icon: ShieldAlert, accent: 'rose' },
        { id: 'Inactive', label: 'Inactive', value: accountsScoped.filter((a) => a.status === 'Inactive').length, Icon: Pause, accent: 'slate' },
        { id: 'drivers', label: 'Drivers', value: accountsScoped.reduce((s, a) => s + a.drivers, 0).toLocaleString(), Icon: Users, accent: 'indigo' },
    ], [accountsScoped]);

    // Filter
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return accountsScoped.filter((a) => {
            if (statusFilter !== 'all' && a.status !== statusFilter) return false;
            if (rating && a.safetyRating !== rating) return false;
            if (country && countryName(a) !== country) return false;
            if (service && serviceName(a) !== service) return false;
            if (!q) return true;
            return (
                a.legalName.toLowerCase().includes(q) ||
                a.dbaName.toLowerCase().includes(q) ||
                a.dotNumber.toLowerCase().includes(q) ||
                cvorNscRinDisplay(a).toLowerCase().includes(q) ||
                a.city.toLowerCase().includes(q) ||
                a.state.toLowerCase().includes(q) ||
                serviceName(a).toLowerCase().includes(q)
            );
        });
    }, [accountsScoped, search, statusFilter, rating, country, service]);

    // Sort
    const readers = useMemo(() => ({
        carrier: (a: AccountRecord) => a.legalName,
        dotNumber: (a: AccountRecord) => a.dotNumber,
        cvorNscRin: (a: AccountRecord) => cvorNscRinDisplay(a),
        service: (a: AccountRecord) => serviceName(a),
        location: (a: AccountRecord) => `${a.state} ${a.city}`,
        drivers: (a: AccountRecord) => a.drivers,
        assets: (a: AccountRecord) => a.assets,
        safetyRating: (a: AccountRecord) => a.safetyRating,
        status: (a: AccountRecord) => a.status,
        createdAt: (a: AccountRecord) => a.createdAt,
    }), []);
    const { sort, onSort, sorted } = useTableSort<Col, AccountRecord>(filtered, readers, { col: 'carrier', dir: 'asc' });

    // Group — the bands follow the sort inside each group, groups in their natural order.
    const groupOf = (a: AccountRecord): { rank: number | string; label: string } | null => {
        switch (groupBy) {
            case 'status': return { rank: STATUSES.indexOf(a.status), label: a.status };
            case 'safetyRating': return { rank: RATINGS.indexOf(a.safetyRating), label: a.safetyRating };
            case 'service': { const s = serviceName(a); return { rank: s || '~', label: s || 'No service profile' }; }
            case 'country': return { rank: countryName(a), label: countryName(a) };
            case 'state': return { rank: `${a.country} ${a.state}`, label: `${a.state}, ${a.country}` };
            default: return null;
        }
    };
    const grouped = useMemo(() => {
        if (groupBy === 'none') return sorted;
        return sorted
            .map((a, i) => ({ a, i, g: groupOf(a)! }))
            .sort((x, y) => {
                const r = typeof x.g.rank === 'number' && typeof y.g.rank === 'number'
                    ? x.g.rank - y.g.rank
                    : String(x.g.rank).localeCompare(String(y.g.rank));
                return r || x.i - y.i;
            })
            .map((r) => r.a);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- groupOf reads groupBy only
    }, [sorted, groupBy]);
    const groupCounts = useMemo(() => {
        const m = new Map<string, number>();
        if (groupBy !== 'none') grouped.forEach((a) => { const l = groupOf(a)!.label; m.set(l, (m.get(l) ?? 0) + 1); });
        return m;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- groupOf reads groupBy only
    }, [grouped, groupBy]);

    const pages = Math.max(1, Math.ceil(grouped.length / pageSize));
    const safePage = Math.min(page, pages);
    const paged = grouped.slice((safePage - 1) * pageSize, safePage * pageSize);

    const filterCount = [statusFilter !== 'all', !!rating, !!country, !!service, groupBy !== 'none'].filter(Boolean).length;
    const mobileFold = filtersOpen ? 'contents' : 'max-md:hidden contents';
    // The same figures, for the page header to show once the cards have scrolled away.
    useHeaderChips(chipsFromStats(stats, statusFilter, (id) => { if (id !== 'drivers') { setStatusFilter(id as AccountStatus | 'all'); setPage(1); } }));
    const touched = statusFilter !== 'all' || !!rating || !!country || !!service || groupBy !== 'none' || search.trim() !== '';
    const reset = () => {
        setStatusFilter('all'); setRating(''); setCountry(''); setService(''); setGroupBy('none'); setSearch(''); setPage(1);
    };
    const set = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };
    const openCarrier = (a: AccountRecord) => { onSelectAccount?.(a); onNavigate?.(a.profilePath); };

    const handleSaveCarrier = (next: AccountRecord) => {
        setAccounts((prev) => prev.map((a) => (a.id === next.id ? next : a)));
    };

    const handleExport = () => {
        const headers = ['Legal Name', 'DBA', 'DOT #', 'CVOR/NSC/RIN', 'Service Profile', 'City', 'State', 'Country', 'Drivers', 'Assets', 'Safety Rating', 'Status', 'Created'];
        const rows = grouped.map((a) => [
            a.legalName, a.dbaName, a.dotNumber, cvorNscRinDisplay(a), serviceName(a),
            a.city, a.state, countryName(a),
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
        // The KPI cards scroll up and away (the page header then shows their figures); the
        // list card below is one screen tall, so the rows scroll under their own header.
        <>
        <ListScrollFrame
            pad={pad}
            above={<KpiStatRow
                stats={stats}
                activeId={statusFilter}
                onPick={(id) => { if (id !== 'drivers') { setStatusFilter(id as AccountStatus | 'all'); setPage(1); } }}
            />}
            title='Carrier profile list'
            count={grouped.length}
            total={accountsScoped.length}
            description='Every carrier profile you can see — click a row to open the carrier.'
            actions={<>
                <button type="button" onClick={handleExport}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
                    <Download size={14} /> Export CSV
                </button>
                <ColumnPicker columns={COLUMNS} visible={visible} onToggle={toggleColumn} />
            </>}
            scrollRef={scrollRef}
            onScroll={onScroll}
            contentKey={`${filtersOpen}|${paged.length}`}
            toolbar={
                <ListToolbar
                    search={search}
                    onSearch={set(setSearch)}
                    placeholder="Search name, DOT, CVOR/NSC/RIN, city…"
                    filters={<div className={mobileFold}>
                        <FilterSelect value={statusFilter === 'all' ? '' : statusFilter} onChange={set((v: string) => setStatusFilter((v || 'all') as AccountStatus | 'all'))} title="Status" allLabel="All statuses" options={STATUSES} />
                        <FilterSelect value={rating} onChange={set(setRating)} title="Safety rating" allLabel="All safety ratings" options={RATINGS} />
                        <FilterSelect value={country} onChange={set(setCountry)} title="Country" allLabel="All countries" options={['United States', 'Canada']} />
                        {serviceOptions.length > 0 && (
                            <FilterSelect value={service} onChange={set(setService)} title="Service profile" allLabel="All service profiles" options={serviceOptions} />
                        )}
                    </div>}
                    filtersExtra={<>
                        <button
                            type="button"
                            onClick={() => setFiltersOpen((o) => !o)}
                            aria-expanded={filtersOpen}
                            className={cn('inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold md:hidden',
                                filterCount ? 'border-blue-300 bg-blue-50/60 text-blue-700' : 'border-slate-200 bg-white text-slate-600')}
                        >
                            <SlidersHorizontal size={14} /> Filters{filterCount ? ` · ${filterCount}` : ''}
                        </button>
                        <div className={mobileFold}>
                        <select
                            value={groupBy}
                            onChange={(e) => { setGroupBy(e.target.value as GroupBy); setPage(1); }}
                            title="Group the list"
                            className={cn(
                                'h-9 shrink-0 rounded-lg border px-2.5 text-[13px] font-semibold outline-none focus:ring-2 focus:ring-blue-500/30',
                                groupBy === 'none' ? 'border-slate-200 bg-white text-slate-600' : 'border-blue-300 bg-blue-50/60 text-blue-700',
                            )}
                        >
                            {GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                        </select>
                        <ResetFilters on={touched} onReset={reset} />
                        </div>
                    </>}
                />
            }
            footer={<TablePager
                    page={safePage}
                    pageSize={pageSize}
                    total={grouped.length}
                    onPage={setPage}
                    onPageSize={(n) => { setPageSize(n); setPage(1); }}
                />}
        >
            <table className="w-full">
                        <thead>
                            <tr>
                                <SortTh col="carrier" label="Carrier" sortable sort={sort} onSort={onSort} className={PIN_TH} />
                                {show('dotNumber') && <SortTh col="dotNumber" label="DOT #" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                                {show('cvorNscRin') && <SortTh col="cvorNscRin" label="CVOR / NSC / RIN" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                                {show('service') && <SortTh col="service" label="Service profile" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                                {show('location') && <SortTh col="location" label="Location" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                                {show('drivers') && <SortTh col="drivers" label="Drivers" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                                {show('assets') && <SortTh col="assets" label="Assets" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                                {show('safetyRating') && <SortTh col="safetyRating" label="Safety rating" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                                {show('status') && <SortTh col="status" label="Status" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                                {show('createdAt') && <SortTh col="createdAt" label="Created" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                                <SortTh label="Actions" sort={sort} className={cn(PIN_TH, 'right-0 z-20 w-[84px] pr-4 text-right shadow-[inset_0_-1px_0_#e2e8f0,inset_1px_0_0_#e2e8f0]')} />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paged.length === 0 && (
                                <tr>
                                    <td colSpan={colCount} className="px-4 py-16 text-center">
                                        <Building2 size={28} className="mx-auto mb-2 text-slate-300" />
                                        <p className="text-sm font-semibold text-slate-700">No carriers match your filters</p>
                                        {touched && (
                                            <button type="button" onClick={reset}
                                                className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                                                Clear filters
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )}
                            {paged.map((a, i) => {
                                const g = groupOf(a);
                                const prev = i === 0 || !g ? null : groupOf(paged[i - 1]);
                                const idRows: { label: string; value: string; cls: string }[] = [];
                                if (a.cvorNumber) idRows.push({ label: 'CVOR', value: a.cvorNumber, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
                                if (a.nscNumber) idRows.push({ label: 'NSC', value: a.nscNumber, cls: 'bg-blue-50 text-blue-700 border-blue-200' });
                                if (a.rinNumber) idRows.push({ label: 'RIN', value: a.rinNumber, cls: 'bg-purple-50 text-purple-700 border-purple-200' });
                                const sp = serviceName(a);
                                return (
                                    <Fragment key={a.id}>
                                        {g && (!prev || prev.label !== g.label) && (
                                            <TableGroupBand label={g.label} count={groupCounts.get(g.label) ?? 0} colSpan={colCount} />
                                        )}
                                        <tr onClick={() => openCarrier(a)} className="group cursor-pointer transition-colors hover:bg-slate-50">
                                            <TD>
                                                <div className="flex items-center gap-2.5" title={`${a.legalName} · DBA ${a.dbaName || '—'}`}>
                                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-100 text-[10px] font-bold text-blue-700">
                                                        {initials(a.legalName)}
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-900">{a.legalName}</span>
                                                    {a.dbaName && <span className="text-xs text-slate-500">· DBA {a.dbaName}</span>}
                                                </div>
                                            </TD>
                                            {show('dotNumber') && (
                                                <TD className="font-mono text-xs text-slate-700">
                                                    {a.dotNumber || <span className="text-slate-300">—</span>}
                                                </TD>
                                            )}
                                            {show('cvorNscRin') && (
                                                <TD>
                                                    {idRows.length === 0 ? (
                                                        <span className="text-xs text-slate-300">—</span>
                                                    ) : (
                                                        <div className="flex items-center gap-3">
                                                            {idRows.map((r) => (
                                                                <div key={r.label} className="flex items-center gap-1.5">
                                                                    <span className={cn('inline-flex items-center rounded border px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wider', r.cls)}>
                                                                        {r.label}
                                                                    </span>
                                                                    <code className="font-mono text-[12px] font-semibold text-slate-700">{r.value}</code>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </TD>
                                            )}
                                            {show('service') && (
                                                <TD className="text-[13px] text-slate-700">{sp || <span className="text-slate-300">—</span>}</TD>
                                            )}
                                            {show('location') && (
                                                <TD>
                                                    <span className="text-sm font-semibold text-slate-900">{a.city}, {a.state}</span>
                                                    <span className="ml-1.5 text-[11px] font-medium text-slate-500" title={countryName(a)}>
                                                        {a.country === 'US' ? 'US' : 'CA'}
                                                    </span>
                                                </TD>
                                            )}
                                            {show('drivers') && <TD className="font-semibold tabular-nums text-slate-900">{a.drivers.toLocaleString()}</TD>}
                                            {show('assets') && <TD className="font-semibold tabular-nums text-slate-900">{a.assets.toLocaleString()}</TD>}
                                            {show('safetyRating') && (
                                                <TD>
                                                    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', RATING_BADGE[a.safetyRating])}>
                                                        {a.safetyRating}
                                                    </span>
                                                </TD>
                                            )}
                                            {show('status') && (
                                                <TD>
                                                    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', STATUS_BADGE[a.status])}>
                                                        <span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full', STATUS_DOT[a.status])} />
                                                        {a.status}
                                                    </span>
                                                </TD>
                                            )}
                                            {show('createdAt') && <TD className="text-xs text-slate-500">{fmtDate(a.createdAt)}</TD>}
                                            <TD className="sticky right-0 bg-white pr-4 text-right shadow-[inset_1px_0_0_#f1f5f9] group-hover:bg-slate-50" onClick={(e) => e.stopPropagation()}>
                                                <RowActions
                                                    noun="carrier"
                                                    name={a.legalName}
                                                    openLabel="Open carrier profile"
                                                    onOpen={() => openCarrier(a)}
                                                    onEdit={() => setEditing(a)}
                                                    extra={[{ label: 'Quick view', icon: PanelRight, onClick: () => setViewing(a) }]}
                                                />
                                            </TD>
                                        </tr>
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
        </ListScrollFrame>

            <CarrierViewModal
                account={viewing}
                onClose={() => setViewing(null)}
                onEdit={(a) => setEditing(a)}
                onOpenProfile={openCarrier}
            />
            <CarrierEditModal
                account={editing}
                onClose={() => setEditing(null)}
                onSave={handleSaveCarrier}
            />
        </>
    );
}
