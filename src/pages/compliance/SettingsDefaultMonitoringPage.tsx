import { useMemo, useState, useEffect } from 'react';
import {
    BellRing, Building2, Truck, User, UserCheck, ShieldCheck, Mail,
    Plus, X, Pencil, Trash2, ArrowRight, Info, Check, Search,
    ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, FileText, ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAccountById } from '@/pages/accounts/accounts.data';
import { getDriversForAccount } from '@/pages/accounts/carrier-drivers.data';
import { getAssetsForAccount } from '@/pages/accounts/carrier-assets.data';
import { APP_USERS, findUserById, getManagedAccountIds, type AppUser } from '@/data/users.data';
import {
    useMonitoringRouting,
    type RoutingRecipient, type NotificationRole,
    ROLE_PRESETS, roleRecipient, OWNER_RECIPIENT,
} from '@/pages/compliance/monitoring-routing.data';

// A driver/asset a role can target individually.
type Subject = { id: string; name: string; sub?: string };

/**
 * Settings ▸ Default Compliance & Monitoring — manages NOTIFICATION ROLES. A role is a simple
 * checklist (all carrier compliance / all drivers / all assets, or specific ones) plus the user(s)
 * to notify. Drives the "Notified" resolution on the Default Compliance Monitoring page. Channels
 * (email / in-app) are chosen per record, not here.
 */

// ── avatar helpers ────────────────────────────────────────────────────
const GRADIENTS = ['from-blue-500 to-blue-700', 'from-emerald-500 to-emerald-700', 'from-amber-500 to-amber-700', 'from-violet-500 to-violet-700', 'from-rose-500 to-rose-700', 'from-teal-500 to-teal-700'];
function initialsOf(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
function hashGradient(seed: string): string {
    let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return GRADIENTS[h % GRADIENTS.length];
}

// ── recipient chip ────────────────────────────────────────────────────
function RecipientChip({ r, onRemove, size = 'sm' }: { r: RoutingRecipient; onRemove?: () => void; size?: 'sm' | 'md' }) {
    const dim = size === 'md' ? 'h-6 w-6 text-[10px]' : 'h-5 w-5 text-[9px]';
    let badge: React.ReactNode;
    if (r.kind === 'owner') {
        badge = <span className={cn('inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-600 shrink-0', dim)}><UserCheck size={size === 'md' ? 13 : 11} /></span>;
    } else if (r.kind === 'role') {
        badge = <span className={cn('inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shrink-0', dim)}><ShieldCheck size={size === 'md' ? 13 : 11} /></span>;
    } else if (r.kind === 'contact') {
        badge = <span className={cn('inline-flex items-center justify-center rounded-full bg-teal-100 text-teal-600 shrink-0', dim)}><Mail size={size === 'md' ? 13 : 11} /></span>;
    } else {
        const u = findUserById(r.id.replace(/^user:/, ''));
        const initials = u?.initials ?? initialsOf(r.name);
        const gradient = u?.avatarGradient ?? hashGradient(r.name);
        badge = <span className={cn('inline-flex items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shrink-0', dim, gradient)}>{initials}</span>;
    }
    return (
        <span className={cn('inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-0.5 pl-0.5 pr-2', size === 'md' ? 'text-[12px]' : 'text-[11px]')}>
            {badge}
            <span className="font-medium text-slate-700 max-w-[140px] truncate">{r.name}</span>
            {onRemove && (
                <button type="button" onClick={onRemove} className="text-slate-300 hover:text-rose-500"><X size={13} /></button>
            )}
        </span>
    );
}

// Entity filter tabs for the roles list (mirrors the New Compliance & Documents entity tabs).
type CoverTab = 'all' | 'carrier' | 'drivers' | 'assets';
const COVER_TABS: { key: CoverTab; label: string; Icon: typeof Building2 }[] = [
    { key: 'all', label: 'All roles', Icon: ListChecks },
    { key: 'carrier', label: 'Carrier', Icon: Building2 },
    { key: 'drivers', label: 'Drivers', Icon: User },
    { key: 'assets', label: 'Assets', Icon: Truck },
];
function roleCoversTab(r: NotificationRole, tab: CoverTab): boolean {
    if (tab === 'all') return true;
    if (tab === 'carrier') return r.carrier;
    if (tab === 'drivers') return r.allDrivers || r.driverIds.length > 0;
    return r.allAssets || r.assetIds.length > 0;
}

// KPI tile matching the New Compliance & Documents summary tiles.
const STAT_ACCENT = {
    slate: { border: 'border-l-slate-400', iconBg: 'bg-slate-100', iconColor: 'text-slate-600' },
    blue: { border: 'border-l-blue-500', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
    violet: { border: 'border-l-violet-500', iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
    emerald: { border: 'border-l-emerald-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
} as const;
function RoleStatTile({ label, value, Icon, accent }: { label: string; value: number; Icon: typeof Building2; accent: keyof typeof STAT_ACCENT }) {
    const cls = STAT_ACCENT[accent];
    return (
        <div className={cn('bg-white border border-slate-200 border-l-4 rounded-xl p-3 shadow-sm flex items-center justify-between gap-3', cls.border)}>
            <div className="min-w-0">
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center mb-2', cls.iconBg)}><Icon size={14} className={cls.iconColor} /></div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">{label}</div>
            </div>
            <div className="text-2xl font-black tabular-nums text-slate-900 leading-none">{value}</div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════
export function SettingsDefaultMonitoringPage({ accountId, onNavigate }: { accountId?: string; onNavigate?: (path: string) => void }) {
    const account = accountId ? getAccountById(accountId) : undefined;
    const carrierName = account ? (account.dbaName || account.legalName) : 'the selected carrier';

    const drivers = useMemo(() => (accountId ? getDriversForAccount(accountId) : []), [accountId]);
    const assets = useMemo(() => (accountId ? getAssetsForAccount(accountId) : []), [accountId]);
    const users = useMemo<AppUser[]>(() => APP_USERS.filter(u =>
        u.status === 'Active' && (u.role === 'super-admin' || (getManagedAccountIds(u) ?? []).includes(accountId ?? ''))), [accountId]);
    // Subjects the checklist can target individually or group — by entity.
    const subjectsByEntity = useMemo<Record<'Driver' | 'Asset', Subject[]>>(() => ({
        Driver: drivers.map(d => ({ id: d.id, name: d.name, sub: 'Driver' })),
        Asset: assets.map(a => ({ id: a.id, name: a.unitNumber, sub: `${a.make} ${a.model}`.trim() })),
    }), [drivers, assets]);
    const { roles, addRole, updateRole, removeRole } = useMonitoringRouting(accountId, users);

    const [editingRole, setEditingRole] = useState<NotificationRole | 'new' | null>(null);
    const [coverTab, setCoverTab] = useState<CoverTab>('all');

    const saveRole = (role: NotificationRole) => {
        if (editingRole === 'new') { const { id, ...rest } = role; void id; addRole(rest); }
        else if (editingRole) { updateRole(editingRole.id, role); }
        setEditingRole(null);
    };

    const tabCounts = useMemo<Record<CoverTab, number>>(() => ({
        all: roles.length,
        carrier: roles.filter(r => r.carrier).length,
        drivers: roles.filter(r => r.allDrivers || r.driverIds.length > 0).length,
        assets: roles.filter(r => r.allAssets || r.assetIds.length > 0).length,
    }), [roles]);
    const stats = useMemo(() => ({
        total: roles.length,
        enabled: roles.filter(r => r.enabled).length,
        paused: roles.filter(r => !r.enabled).length,
        people: new Set(roles.flatMap(r => r.recipients.map(x => x.id))).size,
    }), [roles]);
    const shownRoles = useMemo(() => roles.filter(r => roleCoversTab(r, coverTab)), [roles, coverTab]);
    const activeTabLabel = COVER_TABS.find(t => t.key === coverTab)?.label ?? 'All roles';

    // ── Editing: a dedicated sub-page (its own header + tabs) ──────────
    if (editingRole) {
        return (
            <div className="flex-1 bg-slate-50 min-h-screen">
                <RoleEditorPage initial={editingRole === 'new' ? null : editingRole}
                    users={users} drivers={drivers} subjectsByEntity={subjectsByEntity}
                    onSave={saveRole} onCancel={() => setEditingRole(null)} />
            </div>
        );
    }

    return (
        <div className="flex-1 bg-slate-50 min-h-screen">
            {/* Header + entity tabs */}
            <div className="bg-white border-b border-slate-200">
                <div className="px-4 sm:px-8 py-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <BellRing size={20} />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-2xl font-bold text-slate-900">Monitoring settings</h1>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    Decide <span className="font-semibold text-slate-700">who</span> gets compliance notifications for <span className="font-semibold text-slate-700">{carrierName}</span> — create roles and assign people.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {onNavigate && (
                                <button type="button" onClick={() => onNavigate('/default-compliance-monitoring')}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                                    View monitoring <ArrowRight size={14} />
                                </button>
                            )}
                            <button type="button" onClick={() => setEditingRole('new')}
                                className="inline-flex shrink-0 items-center gap-1.5 h-9 px-3.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm">
                                <Plus size={15} /> Create role
                            </button>
                        </div>
                    </div>

                    {/* Entity tabs */}
                    <div className="flex items-center gap-1 mt-4 -mb-5 overflow-x-auto">
                        {COVER_TABS.map(t => {
                            const active = coverTab === t.key;
                            const Icon = t.Icon;
                            return (
                                <button key={t.key} type="button" onClick={() => setCoverTab(t.key)}
                                    className={cn('inline-flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                                        active ? 'text-blue-600 border-blue-600' : 'text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300')}>
                                    <Icon size={15} className={active ? 'text-blue-600' : 'text-slate-400'} />
                                    {t.label}
                                    <span className={cn('inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                                        active ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/70 text-slate-600')}>
                                        {tabCounts[t.key]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="px-4 sm:px-8 py-6 space-y-5">
                {/* KPI tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <RoleStatTile label="Total roles" value={stats.total} Icon={ListChecks} accent="slate" />
                    <RoleStatTile label="Enabled" value={stats.enabled} Icon={Check} accent="emerald" />
                    <RoleStatTile label="Paused" value={stats.paused} Icon={X} accent="violet" />
                    <RoleStatTile label="People notified" value={stats.people} Icon={User} accent="blue" />
                </div>

                {/* Info banner */}
                <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-[13px] text-blue-800">
                    <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
                    <p>
                        Showing <strong>{shownRoles.length}</strong> role{shownRoles.length === 1 ? '' : 's'} for <strong>{activeTabLabel}</strong>.
                        This page decides <strong>who</strong> gets notified — each record decides <strong>when</strong> reminders fire (its own 90 / 60 / 30 / 7-day settings) and whether they’re email or in-app.
                    </p>
                </div>

                {/* Roles list */}
                <RolesView carrierName={carrierName} roles={shownRoles} tabLabel={activeTabLabel} filtered={coverTab !== 'all'}
                    onCreate={() => setEditingRole('new')} onEdit={r => setEditingRole(r)}
                    onToggle={r => updateRole(r.id, { enabled: !r.enabled })} onDelete={id => removeRole(id)} />
            </div>
        </div>
    );
}

// ══ NOTIFICATION ROLES — the app's standard list (desktop table + mobile cards) ══════════
type CoverChip = { Icon: typeof Building2; label: string };
function coversChips(role: NotificationRole): CoverChip[] {
    const chips: CoverChip[] = [];
    if (role.carrier) chips.push({ Icon: Building2, label: 'Carrier compliance' });
    if (role.allDrivers) chips.push({ Icon: User, label: 'All drivers' });
    else if (role.driverIds.length) chips.push({ Icon: User, label: `${role.driverIds.length} driver${role.driverIds.length === 1 ? '' : 's'}` });
    if (role.allAssets) chips.push({ Icon: Truck, label: 'All assets' });
    else if (role.assetIds.length) chips.push({ Icon: Truck, label: `${role.assetIds.length} asset${role.assetIds.length === 1 ? '' : 's'}` });
    return chips;
}
function RoleToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
    return (
        <button type="button" role="switch" aria-checked={on} onClick={onClick}
            className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', on ? 'bg-blue-600' : 'bg-slate-300')}>
            <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', on ? 'left-[18px]' : 'left-0.5')} />
        </button>
    );
}
function CoverPill({ Icon, label }: CoverChip) {
    return <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600"><Icon size={11} className="text-slate-400" /> {label}</span>;
}

const ROLE_PAGE_SIZES = [10, 25, 50, 100];
type RoleSortCol = 'name' | 'covers' | 'notifies';

function RolesView({ carrierName, roles, tabLabel, filtered: isFiltered, onCreate, onEdit, onToggle, onDelete }: {
    carrierName: string;
    roles: NotificationRole[];
    tabLabel: string;
    filtered: boolean;
    onCreate: () => void; onEdit: (r: NotificationRole) => void; onToggle: (r: NotificationRole) => void; onDelete: (id: string) => void;
}) {
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<{ col: RoleSortCol; dir: 'asc' | 'desc' }>({ col: 'name', dir: 'asc' });
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return roles;
        return roles.filter(r => [r.name, ...coversChips(r).map(c => c.label), ...r.recipients.map(x => x.name)].join(' ').toLowerCase().includes(q));
    }, [roles, search]);

    const sorted = useMemo(() => {
        const val = (r: NotificationRole) =>
            sort.col === 'name' ? r.name.toLowerCase()
                : sort.col === 'covers' ? String(coversChips(r).length).padStart(3, '0')
                    : String(r.recipients.length).padStart(3, '0');
        const arr = [...filtered].sort((a, b) => val(a).localeCompare(val(b), undefined, { numeric: true }));
        if (sort.dir === 'desc') arr.reverse();
        return arr;
    }, [filtered, sort]);

    useEffect(() => { setPage(1); }, [search, sort, pageSize]);
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pageRows = sorted.slice(start, start + pageSize);

    const toggleSort = (col: RoleSortCol) => setSort(prev => (prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));
    const Th = ({ col, label, className }: { col: RoleSortCol; label: string; className?: string }) => {
        const active = sort.col === col;
        const Ic = active ? (sort.dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
        return (
            <th className={cn('px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap', className)}>
                <button type="button" onClick={() => toggleSort(col)} className={cn('inline-flex items-center gap-1 hover:text-slate-700 transition-colors', active && 'text-blue-600')}>
                    {label} <Ic size={12} className={active ? '' : 'text-slate-300'} />
                </button>
            </th>
        );
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 sm:px-5 py-4 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><UserCheck size={18} /></div>
                    <div className="min-w-0">
                        <h2 className="text-base font-bold text-slate-800">Notification roles</h2>
                        <p className="text-[12px] text-slate-500">{tabLabel} · {carrierName}</p>
                    </div>
                    <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-bold text-slate-500">{roles.length}</span>
                </div>
            </div>

            {roles.length === 0 ? (
                <div className="px-6 py-14 text-center">
                    <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center"><UserCheck size={22} /></div>
                    {isFiltered ? (
                        <>
                            <h3 className="text-base font-bold text-slate-800">No roles cover {tabLabel}</h3>
                            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">No notification role targets these records yet. Create one, or switch tabs to see the others.</p>
                        </>
                    ) : (
                        <>
                            <h3 className="text-base font-bold text-slate-800">No roles yet</h3>
                            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">A role is a simple checklist — pick records (all carrier compliance, all drivers, all assets, or specific ones) and the user who should be notified.</p>
                        </>
                    )}
                    <button type="button" onClick={onCreate} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Plus size={15} /> Create {isFiltered ? 'a' : 'your first'} role</button>
                </div>
            ) : (
                <>
                    {/* Toolbar — search */}
                    <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-slate-100 flex-wrap">
                        <div className="relative flex-1 min-w-[220px] max-w-sm">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roles, people…"
                                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                        </div>
                    </div>

                    {pageRows.length === 0 ? (
                        <div className="px-5 py-12 text-center text-sm text-slate-500">No roles match “{search}”.</div>
                    ) : (
                        <>
                            {/* Mobile / narrow — stacked cards */}
                            <div className="lg:hidden divide-y divide-slate-100">
                                {pageRows.map(role => <RoleCard key={role.id} role={role} onEdit={() => onEdit(role)} onToggle={() => onToggle(role)} onDelete={() => onDelete(role.id)} />)}
                            </div>
                            {/* Desktop — table */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full min-w-[720px]">
                                    <thead className="border-b border-slate-200 bg-slate-50/50">
                                        <tr>
                                            <Th col="name" label="Role" className="pl-5" />
                                            <Th col="covers" label="Covers" />
                                            <Th col="notifies" label="Notifies" />
                                            <th className="px-4 py-2.5 pr-5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageRows.map(role => <RoleTableRow key={role.id} role={role} onEdit={() => onEdit(role)} onToggle={() => onToggle(role)} onDelete={() => onDelete(role.id)} />)}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Pagination */}
                    <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-slate-200 flex-wrap">
                        <div className="flex items-center gap-3 text-[12px] text-slate-500">
                            <label className="flex items-center gap-1.5">
                                Rows per page
                                <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                    {ROLE_PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </label>
                            <span className="tabular-nums">{total === 0 ? '0' : `${start + 1}–${Math.min(start + pageSize, total)}`} of {total}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}
                                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                                <ChevronLeft size={14} /> Prev
                            </button>
                            <span className="px-2 text-[12px] text-slate-600 tabular-nums">Page {safePage} of {totalPages}</span>
                            <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}
                                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                                Next <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </>
            )}

            <div className="border-t border-slate-100 bg-slate-50/60 px-4 sm:px-5 py-3">
                <p className="text-[12px] text-slate-500 inline-flex items-start gap-1.5"><Info size={14} className="mt-0.5 shrink-0 text-slate-400" /> Anyone assigned to a matching role is notified. Whether it's email or in-app is chosen on each record.</p>
            </div>
        </div>
    );
}

// Desktop table row
function RoleTableRow({ role, onEdit, onToggle, onDelete }: { role: NotificationRole; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
    const chips = coversChips(role);
    return (
        <tr className={cn('border-b border-slate-100 last:border-0 align-top transition-colors', role.enabled ? 'hover:bg-slate-50/50' : 'bg-slate-50/40')}>
            <td className="px-4 py-3.5 pl-5">
                <div className="flex items-center gap-2.5">
                    <RoleToggle on={role.enabled} onClick={onToggle} />
                    <div className="min-w-0">
                        <div className={cn('text-sm font-bold', role.enabled ? 'text-slate-900' : 'text-slate-500')}>{role.name}</div>
                        {role.description && <div className="text-[11px] text-slate-400 truncate max-w-[220px]">{role.description}</div>}
                        {!role.enabled && <span className="mt-0.5 inline-block rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">Paused</span>}
                    </div>
                </div>
            </td>
            <td className="px-4 py-3.5">
                <div className="flex flex-wrap gap-1.5 max-w-[320px]">
                    {chips.length === 0 ? <span className="text-[12px] text-slate-400">—</span> : chips.map((c, i) => <CoverPill key={i} {...c} />)}
                </div>
            </td>
            <td className="px-4 py-3.5">
                <div className="flex flex-wrap gap-1 max-w-[240px]">
                    {role.recipients.length === 0 ? <span className="text-[12px] text-slate-400">No one</span> : role.recipients.map(r => <RecipientChip key={r.id} r={r} />)}
                </div>
            </td>
            <td className="px-4 py-3.5 pr-5">
                <div className="flex items-center justify-end gap-1">
                    <button type="button" onClick={onEdit} title="Edit role" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-blue-600"><Pencil size={14} /></button>
                    <button type="button" onClick={onDelete} title="Delete role" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"><Trash2 size={14} /></button>
                </div>
            </td>
        </tr>
    );
}

// Mobile card
function RoleCard({ role, onEdit, onToggle, onDelete }: { role: NotificationRole; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
    const chips = coversChips(role);
    return (
        <div className={cn('px-4 py-3.5 transition-colors', role.enabled ? '' : 'bg-slate-50/40')}>
            <div className="flex items-start gap-3">
                <div className="pt-0.5"><RoleToggle on={role.enabled} onClick={onToggle} /></div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={cn('text-sm font-bold', role.enabled ? 'text-slate-900' : 'text-slate-500')}>{role.name}</h3>
                        {!role.enabled && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">Paused</span>}
                    </div>
                    {role.description && <p className="mt-0.5 text-[11px] text-slate-400">{role.description}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-0.5">Covers</span>
                        {chips.length === 0 ? <span className="text-[12px] text-slate-400">Nothing selected</span> : chips.map((c, i) => <CoverPill key={i} {...c} />)}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-0.5">Notifies</span>
                        {role.recipients.length === 0 ? <span className="text-[12px] text-slate-400">No one</span> : role.recipients.map(r => <RecipientChip key={r.id} r={r} />)}
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={onEdit} title="Edit role" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-blue-600"><Pencil size={14} /></button>
                    <button type="button" onClick={onDelete} title="Delete role" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"><Trash2 size={14} /></button>
                </div>
            </div>
        </div>
    );
}

function emptyRole(): NotificationRole {
    return { id: 'new', name: '', description: '', enabled: true, carrier: false, allDrivers: false, allAssets: false, driverIds: [], assetIds: [], recipients: [] };
}
// One tab in the role editor.
type EditorTabKey = 'details' | 'records' | 'users';
function EditorTab({ active, onClick, Icon, label, count }: { active: boolean; onClick: () => void; Icon: typeof Info; label: React.ReactNode; count?: number }) {
    return (
        <button type="button" onClick={onClick}
            className={cn('inline-flex flex-1 sm:flex-none items-center justify-center sm:justify-start gap-2 px-2 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                active ? 'text-blue-600 border-blue-600' : 'text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300')}>
            <Icon size={15} className={cn('shrink-0', active ? 'text-blue-600' : 'text-slate-400')} />
            <span>{label}</span>
            {typeof count === 'number' && (
                <span className={cn('inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums', active ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/70 text-slate-600')}>{count}</span>
            )}
        </button>
    );
}
function RoleCheckItem({ Icon, label, sub, checked, onToggle }: { Icon: typeof Building2; label: string; sub?: string; checked: boolean; onToggle: () => void }) {
    return (
        <button type="button" onClick={onToggle}
            className={cn('flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors', checked ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/20' : 'border-slate-200 bg-white hover:bg-slate-50')}>
            <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded border shrink-0', checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white')}>{checked && <Check size={13} />}</span>
            <Icon size={16} className={checked ? 'text-blue-600' : 'text-slate-400'} />
            <span className="min-w-0"><span className="block text-[13px] font-semibold text-slate-800">{label}</span>{sub && <span className="block text-[11px] text-slate-400">{sub}</span>}</span>
        </button>
    );
}
// Full-page role editor (not a modal) — channels are set per record, so there's no "Send via" here.
function RoleEditorPage({ initial, users, drivers, subjectsByEntity, onSave, onCancel }: {
    initial: NotificationRole | null;
    users: AppUser[];
    drivers: { id: string; name: string; email?: string }[];
    subjectsByEntity: Record<'Driver' | 'Asset', Subject[]>;
    onSave: (r: NotificationRole) => void;
    onCancel: () => void;
}) {
    const [draft, setDraft] = useState<NotificationRole>(initial ?? emptyRole());
    const [tab, setTab] = useState<EditorTabKey>('details');
    const set = <K extends keyof NotificationRole>(k: K, v: NotificationRole[K]) => setDraft(d => ({ ...d, [k]: v }));
    const addRecipient = (r: RoutingRecipient) => setDraft(d => (d.recipients.some(x => x.id === r.id) ? d : { ...d, recipients: [...d.recipients, r] }));
    const removeRecipient = (id: string) => setDraft(d => ({ ...d, recipients: d.recipients.filter(x => x.id !== id) }));

    const coverageCount = (draft.carrier ? 1 : 0) + (draft.allDrivers ? 1 : 0) + (draft.allAssets ? 1 : 0) + draft.driverIds.length + draft.assetIds.length;
    const hasScope = coverageCount > 0;
    const showDrivers = !draft.allDrivers && subjectsByEntity.Driver.length > 0;
    const showAssets = !draft.allAssets && subjectsByEntity.Asset.length > 0;
    const canSave = draft.name.trim().length > 0 && draft.recipients.length > 0 && hasScope;
    const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5';

    const saveDraft = () => onSave({ ...draft, name: draft.name.trim(), description: draft.description?.trim() || undefined });

    return (
        <>
            {/* Header bar — same chrome as the Monitoring settings page, with tabs on its bottom edge */}
            <div className="bg-white border-b border-slate-200">
                <div className="px-4 sm:px-8 py-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-3 min-w-0">
                            <button type="button" onClick={onCancel} title="Back to roles"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 shrink-0"><ChevronLeft size={18} /></button>
                            <div className="h-10 w-10 shrink-0 rounded-lg bg-blue-600 text-white flex items-center justify-center"><UserCheck size={20} /></div>
                            <div className="min-w-0">
                                <h1 className="text-2xl font-bold text-slate-900">{initial ? 'Edit role' : 'New role'}</h1>
                                <p className="text-sm text-slate-500 mt-0.5">Name it, pick the records it covers, then assign who gets notified.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button type="button" onClick={onCancel}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button type="button" disabled={!canSave} onClick={saveDraft}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
                                <Check size={15} /> {initial ? 'Save role' : 'Create role'}
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-1 mt-4 -mb-5">
                        <EditorTab active={tab === 'details'} onClick={() => setTab('details')} Icon={FileText}
                            label={<>Name<span className="hidden sm:inline"> &amp; description</span></>} />
                        <EditorTab active={tab === 'records'} onClick={() => setTab('records')} Icon={ListChecks} label="Records" count={coverageCount} />
                        <EditorTab active={tab === 'users'} onClick={() => setTab('users')} Icon={UserCheck} label="Users" count={draft.recipients.length} />
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="px-4 sm:px-8 py-6">
                <div className="max-w-4xl space-y-3">
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6">
                    {tab === 'details' && (
                        <div className="space-y-5">
                            <div>
                                <label className={labelCls}>Role name</label>
                                <input value={draft.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Safety &amp; Compliance"
                                    className="h-10 w-full max-w-md rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                            </div>
                            <div>
                                <label className={labelCls}>Description <span className="font-medium normal-case text-slate-400">— optional</span></label>
                                <textarea value={draft.description ?? ''} onChange={e => set('description', e.target.value)} rows={3}
                                    placeholder="What is this role for? e.g. Handles all driver license &amp; medical renewals."
                                    className="w-full max-w-xl rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-y" />
                            </div>
                        </div>
                    )}

                    {tab === 'records' && (
                        <div className="space-y-6">
                            <div>
                                <label className={labelCls}>Records this role covers</label>
                                <p className="-mt-0.5 mb-2 text-[12px] text-slate-400">Pick the record groups this role should be notified about.</p>
                                <div className="grid gap-2 sm:grid-cols-3">
                                    <RoleCheckItem Icon={Building2} label="All carrier compliance" sub="MC/DOT, IFTA, insurance…" checked={draft.carrier} onToggle={() => set('carrier', !draft.carrier)} />
                                    <RoleCheckItem Icon={User} label="All drivers" sub="Every driver's records" checked={draft.allDrivers} onToggle={() => set('allDrivers', !draft.allDrivers)} />
                                    <RoleCheckItem Icon={Truck} label="All assets" sub="Every asset's records" checked={draft.allAssets} onToggle={() => set('allAssets', !draft.allAssets)} />
                                </div>
                            </div>

                            {(showDrivers || showAssets) && (
                                <div className="border-t border-slate-100 pt-5">
                                    <label className={labelCls}>Or target specific ones <span className="font-medium normal-case text-slate-400">— optional</span></label>
                                    <div className={cn('grid gap-4', showDrivers && showAssets && 'lg:grid-cols-2')}>
                                        {showDrivers && (
                                            <div>
                                                <p className="mb-1.5 text-[12px] font-semibold text-slate-600">Specific drivers</p>
                                                <SubjectMultiSelect subjects={subjectsByEntity.Driver} selected={draft.driverIds} onChange={ids => set('driverIds', ids)} noun="drivers" />
                                            </div>
                                        )}
                                        {showAssets && (
                                            <div>
                                                <p className="mb-1.5 text-[12px] font-semibold text-slate-600">Specific assets</p>
                                                <SubjectMultiSelect subjects={subjectsByEntity.Asset} selected={draft.assetIds} onChange={ids => set('assetIds', ids)} noun="assets" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'users' && (
                        <div>
                            <label className={labelCls}>Assign to</label>
                            {draft.recipients.length > 0 && (
                                <div className="mb-2 flex flex-wrap gap-1.5">
                                    {draft.recipients.map(r => <RecipientChip key={r.id} r={r} size="md" onRemove={() => removeRecipient(r.id)} />)}
                                </div>
                            )}
                            <RecipientListSelect selected={draft.recipients} users={users} drivers={drivers} onAdd={addRecipient} onRemove={removeRecipient} />
                            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-slate-400"><Info size={13} /> Email vs in-app is set on each record’s Monitoring &amp; Notifications panel — not here.</p>
                        </div>
                    )}
                </div>
                    <p className="px-1 text-[12px] text-slate-400">{!canSave ? 'Name it, tick at least one record, and assign at least one person.' : `Notifies ${draft.recipients.length} recipient${draft.recipients.length === 1 ? '' : 's'}.`}</p>
                </div>
            </div>
        </>
    );
}


// ── Subject multi-select (pick specific drivers / assets) ─────────────
function SubjectMultiSelect({ subjects, selected, onChange, noun }: {
    subjects: Subject[]; selected: string[]; onChange: (ids: string[]) => void; noun: string;
}) {
    const [q, setQ] = useState('');
    const ql = q.trim().toLowerCase();
    const shown = ql ? subjects.filter(s => s.name.toLowerCase().includes(ql) || (s.sub ?? '').toLowerCase().includes(ql)) : subjects;
    const sel = new Set(selected);
    const toggle = (id: string) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); onChange([...n]); };
    return (
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 p-2">
                <div className="relative flex-1 min-w-0">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${noun}…`}
                        className="w-full h-9 pl-8 pr-2 rounded-md border border-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                {selected.length > 0 ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-bold text-blue-600 tabular-nums">{selected.length} selected</span>
                        <button type="button" onClick={() => onChange([])} title="Clear selection" className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-300 hover:bg-rose-50 hover:text-rose-500"><X size={13} /></button>
                    </div>
                ) : (
                    <span className="text-[11px] font-semibold text-slate-400 tabular-nums shrink-0">{shown.length}/{subjects.length}</span>
                )}
            </div>
            <div className="max-h-64 overflow-y-auto overscroll-contain py-1">
                {shown.length === 0 ? (
                    <div className="px-3 py-6 text-center text-[12px] text-slate-400">No {noun} found.</div>
                ) : shown.map(s => {
                    const on = sel.has(s.id);
                    return (
                        <button key={s.id} type="button" onClick={() => toggle(s.id)}
                            className={cn('flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors', on ? 'bg-blue-50/60' : 'hover:bg-slate-50')}>
                            <span className={cn('inline-flex h-4 w-4 items-center justify-center rounded border shrink-0', on ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white')}>{on && <Check size={11} />}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-[13px] font-medium text-slate-800 truncate">{s.name}</span>
                                {s.sub && <span className="block text-[11px] text-slate-400 truncate">{s.sub}</span>}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}


// ── recipient list-select (inline, same "proper list view" as SubjectMultiSelect) ──
// Search header + scrollable checkbox list (Owner / Roles / Users / Drivers) + a custom-contact
// footer. Clicking a row toggles that recipient in/out — no floating popover.
function RecipientListSelect({ selected, users, drivers, onAdd, onRemove }: {
    selected: RoutingRecipient[];
    users: AppUser[];
    drivers: { id: string; name: string; email?: string }[];
    onAdd: (r: RoutingRecipient) => void;
    onRemove: (id: string) => void;
}) {
    const [q, setQ] = useState('');
    const [customName, setCustomName] = useState('');
    const [customEmail, setCustomEmail] = useState('');

    const ql = q.trim().toLowerCase();
    const match = (s: string) => !ql || s.toLowerCase().includes(ql);
    const selectedIds = new Set(selected.map(r => r.id));
    const toggle = (r: RoutingRecipient) => { selectedIds.has(r.id) ? onRemove(r.id) : onAdd(r); };

    const userOpts = users.filter(u => match(u.name) || match(u.title));
    const driverOpts = drivers.filter(d => match(d.name));
    const roleOpts = ROLE_PRESETS.filter(match);
    const customSelected = selected.filter(r => r.kind === 'contact');
    const noMatches = !!ql && userOpts.length === 0 && driverOpts.length === 0 && roleOpts.length === 0;

    const addCustom = () => {
        const name = customName.trim(); const email = customEmail.trim();
        if (!name && !email) return;
        onAdd({ id: `contact:${(email || name).toLowerCase()}`, name: name || email, kind: 'contact', email: email || undefined });
        setCustomName(''); setCustomEmail('');
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-2">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search people…"
                        className="w-full h-8 pl-8 pr-2 rounded-md border border-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                <span className="text-[11px] font-semibold text-slate-400 tabular-nums shrink-0">{selected.length} selected</span>
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
                {!ql && (
                    <RecipientRow checked={selectedIds.has(OWNER_RECIPIENT.id)} onClick={() => toggle(OWNER_RECIPIENT)}
                        icon={<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-600"><UserCheck size={13} /></span>}
                        title="Assigned owner" sub="Whoever owns each item" />
                )}
                <PickerGroup label="Users" show={userOpts.length > 0}>
                    {userOpts.map(u => {
                        const r: RoutingRecipient = { id: `user:${u.id}`, name: u.name, kind: 'user', email: u.email };
                        return <RecipientRow key={r.id} checked={selectedIds.has(r.id)} onClick={() => toggle(r)}
                            icon={<span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-bold text-white', u.avatarGradient)}>{u.initials}</span>}
                            title={u.name} sub={u.title} />;
                    })}
                </PickerGroup>
                <PickerGroup label="Drivers" show={driverOpts.length > 0}>
                    {driverOpts.map(d => {
                        const r: RoutingRecipient = { id: `driver:${d.id}`, name: d.name, kind: 'driver', email: d.email };
                        return <RecipientRow key={r.id} checked={selectedIds.has(r.id)} onClick={() => toggle(r)}
                            icon={<span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-bold text-white', hashGradient(d.name))}>{initialsOf(d.name)}</span>}
                            title={d.name} sub="Driver" />;
                    })}
                </PickerGroup>
                <PickerGroup label="Roles" show={roleOpts.length > 0}>
                    {roleOpts.map(name => {
                        const r = roleRecipient(name);
                        return <RecipientRow key={r.id} checked={selectedIds.has(r.id)} onClick={() => toggle(r)}
                            icon={<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600"><ShieldCheck size={13} /></span>}
                            title={name} sub="Role" />;
                    })}
                </PickerGroup>
                {customSelected.length > 0 && (
                    <PickerGroup label="Custom contacts" show>
                        {customSelected.map(r => (
                            <RecipientRow key={r.id} checked onClick={() => toggle(r)}
                                icon={<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-teal-600"><Mail size={13} /></span>}
                                title={r.name} sub={r.email ?? 'Custom contact'} />
                        ))}
                    </PickerGroup>
                )}
                {noMatches && <div className="px-3 py-3 text-center text-[12px] text-slate-400">No matches</div>}
            </div>
            {/* Custom contact footer */}
            <div className="border-t border-slate-100 p-2.5 space-y-2 bg-slate-50/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Add a custom contact</p>
                <div className="flex flex-col gap-1.5 sm:flex-row">
                    <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Name"
                        className="h-8 w-full rounded-md border border-slate-200 px-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    <input value={customEmail} onChange={e => setCustomEmail(e.target.value)} placeholder="email@company.com"
                        className="h-8 w-full rounded-md border border-slate-200 px-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    <button type="button" onClick={addCustom} disabled={!customName.trim() && !customEmail.trim()}
                        className="h-8 shrink-0 inline-flex items-center justify-center gap-1.5 rounded-md bg-slate-800 px-3 text-[12px] font-semibold text-white hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed">
                        <Plus size={13} /> Add
                    </button>
                </div>
            </div>
        </div>
    );
}

function PickerGroup({ label, show, children }: { label: string; show: boolean; children: React.ReactNode }) {
    if (!show) return null;
    return (
        <div>
            <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
            {children}
        </div>
    );
}
// Recipient row — left checkbox + avatar/icon + name/sub (matches SubjectMultiSelect rows).
function RecipientRow({ checked, icon, title, sub, onClick }: { checked: boolean; icon: React.ReactNode; title: string; sub?: string; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick}
            className={cn('flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors', checked ? 'bg-blue-50/60' : 'hover:bg-slate-50')}>
            <span className={cn('inline-flex h-4 w-4 items-center justify-center rounded border shrink-0', checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white')}>{checked && <Check size={11} />}</span>
            {icon}
            <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-slate-800 truncate">{title}</span>
                {sub && <span className="block text-[11px] text-slate-400 truncate">{sub}</span>}
            </span>
        </button>
    );
}
