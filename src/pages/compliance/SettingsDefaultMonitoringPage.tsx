import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    BellRing, Building2, Truck, User, UserCheck, ShieldCheck, Mail, Crown, Lock, Settings2,
    Plus, X, ArrowRight, Info, Check, Search, ChevronLeft, FileText, ListChecks, Pause, Users as UsersIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ListPageHeader, PAGE_PAD } from '@/components/ui/ListPageHeader';
import { KpiStatRow, type KpiStat } from '@/components/ui/KpiStatCard';
import { ListHeaderBridge, chipsFromStats, useHeaderChips, useListHeaderBridge } from '@/components/ui/list-header-bridge';
import { useCondensingHeader } from '@/components/ui/use-condensing-header';
import { getAccountById } from '@/pages/accounts/accounts.data';
import { getServiceProfileById } from '@/pages/accounts/service-profiles.data';
import { getDriversForAccount } from '@/pages/accounts/carrier-drivers.data';
import { getAssetsForAccount } from '@/pages/accounts/carrier-assets.data';
import { APP_USERS, ROLE_LABELS, isDriverUser, roleOn, type AppUser } from '@/data/users.data';
import { ROLE_META } from '@/pages/users-roles/roles.data';
import { canManageProfile, carriersOf, useDirectoryVersion } from '@/pages/users-roles/scope';
import {
    useMonitoringRouting, consumeOpenNotificationRole, roleRecipient, roleOfRecipient, userHoldsRoleOn, usersWithRoleOn,
    OWNER_RECIPIENT, RECIPIENT_ROLES, type RoutingRecipient, type NotificationRole,
} from '@/pages/compliance/monitoring-routing.data';
import { NotificationRolesList, RecipientChip, peopleReached } from '@/pages/compliance/notification-roles-ui';

// A driver/asset a role can target individually.
type Subject = { id: string; name: string; sub?: string };

/**
 * Settings ▸ Monitoring & Notifications — one carrier's NOTIFICATION ROLES.
 *
 * A role is a checklist (all carrier compliance / all drivers / all assets, or specific ones)
 * plus who is told: a ROLE from Users & Roles — everyone who is Fleet Admin or Safety Manager
 * on this carrier, or the Admins of its service profile — and/or specific people. It drives the
 * "Notified" column on the Compliance Monitoring page and the bell. Email / in-app is chosen per
 * record, not here. The carrier's Fleet Admin and the service profile's Admins may change it;
 * everybody else with the menu reads it.
 */

// Entity filter tabs for the roles list.
type CoverTab = 'all' | 'carrier' | 'drivers' | 'assets';
const COVER_TABS: { id: CoverTab; label: string; icon: typeof Building2 }[] = [
    { id: 'all', label: 'All roles', icon: ListChecks },
    { id: 'carrier', label: 'Carrier', icon: Building2 },
    { id: 'drivers', label: 'Drivers', icon: User },
    { id: 'assets', label: 'Assets', icon: Truck },
];
function roleCoversTab(r: NotificationRole, tab: CoverTab): boolean {
    if (tab === 'all') return true;
    if (tab === 'carrier') return r.carrier;
    if (tab === 'drivers') return r.allDrivers || r.driverIds.length > 0;
    return r.allAssets || r.assetIds.length > 0;
}

/** May this person change who is notified on the carrier? */
export function canEditNotifications(me: AppUser | null | undefined, accountId: string | undefined): boolean {
    if (!me || !accountId) return false;
    if (me.role === 'super-admin') return true;
    const sp = getAccountById(accountId)?.serviceProfileId;
    if (sp && canManageProfile(me, sp)) return true;
    return userHoldsRoleOn(me, 'fleet-admin', accountId);
}

// ══════════════════════════════════════════════════════════════════════
export function SettingsDefaultMonitoringPage({ accountId, currentUser, onNavigate }: {
    accountId?: string; currentUser?: AppUser | null; onNavigate?: (path: string) => void;
}) {
    const dir = useDirectoryVersion();
    const account = accountId ? getAccountById(accountId) : undefined;
    const carrierName = account ? (account.dbaName || account.legalName) : 'the selected carrier';
    const sp = getServiceProfileById(account?.serviceProfileId);
    const canEdit = canEditNotifications(currentUser, accountId);

    const drivers = useMemo(() => (accountId ? getDriversForAccount(accountId) : []), [accountId]);
    const assets = useMemo(() => (accountId ? getAssetsForAccount(accountId) : []), [accountId]);
    // Who can be named on a role: everyone with a carrier role here, and the Admins above it.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dir is the directory snapshot
    const people = useMemo<AppUser[]>(() => APP_USERS.filter(u => u.status !== 'Inactive' && !isDriverUser(u) && u.role !== 'super-admin'
        && !!accountId && (carriersOf(u).includes(accountId) || userHoldsRoleOn(u, 'admin', accountId))), [accountId, dir]);
    const seedUsers = useMemo<AppUser[]>(() => APP_USERS.filter(u => u.status === 'Active'), []);
    // Subjects the checklist can target individually — by entity.
    const subjectsByEntity = useMemo<Record<'Driver' | 'Asset', Subject[]>>(() => ({
        Driver: drivers.map(d => ({ id: d.id, name: d.name, sub: 'Driver' })),
        Asset: assets.map(a => ({ id: a.id, name: a.unitNumber, sub: `${a.make} ${a.model}`.trim() })),
    }), [drivers, assets]);
    const { roles, addRole, updateRole, removeRole } = useMonitoringRouting(accountId, seedUsers);

    const [editingRole, setEditingRole] = useState<NotificationRole | 'new' | null>(null);
    const [coverTab, setCoverTab] = useState<CoverTab>('all');
    const { scrollRef, condensed: rowsCondensed, onScroll } = useCondensingHeader(coverTab);
    const bridge = useListHeaderBridge();
    const condensed = rowsCondensed || bridge.away;

    // Sent here from a carrier's Users & Roles page to edit one role (or start a new one).
    useEffect(() => {
        const want = consumeOpenNotificationRole();
        if (!want) return;
        if (want === 'new') { setEditingRole('new'); return; }
        const r = roles.find(x => x.id === want);
        if (r) setEditingRole(r);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
    const stats: KpiStat[] = useMemo(() => [
        { id: 'all', label: 'Notification roles', value: roles.length, Icon: ListChecks, accent: 'blue' },
        { id: 'enabled', label: 'On', value: roles.filter(r => r.enabled).length, Icon: Check, accent: 'emerald' },
        { id: 'paused', label: 'Paused', value: roles.filter(r => !r.enabled).length, Icon: Pause, accent: 'slate' },
        { id: 'people', label: 'People notified', value: new Set(roles.filter(r => r.enabled).flatMap(r => peopleReached(r, accountId).map(x => x.id))).size, Icon: UsersIcon, accent: 'violet' },
        // eslint-disable-next-line react-hooks/exhaustive-deps -- dir is the directory snapshot
    ], [roles, accountId, dir]);
    const shownRoles = useMemo(() => roles.filter(r => roleCoversTab(r, coverTab)), [roles, coverTab]);
    const activeTabLabel = COVER_TABS.find(t => t.id === coverTab)?.label ?? 'All roles';
    useHeaderChips(chipsFromStats(stats));

    // ── Editing: a dedicated page with the same chrome ─────────────────
    if (editingRole) {
        return (
            <RoleEditorPage initial={editingRole === 'new' ? null : editingRole}
                accountId={accountId} carrierName={carrierName} spName={sp ? sp.dbaName || sp.legalName : undefined}
                people={people} drivers={drivers} subjectsByEntity={subjectsByEntity}
                onSave={saveRole} onCancel={() => setEditingRole(null)} />
        );
    }

    const strip = <AuthorityStrip me={currentUser ?? null} carrierName={carrierName} spName={sp ? sp.dbaName || sp.legalName : undefined} canEdit={canEdit} />;

    return (
        <ListHeaderBridge value={bridge.value}>
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <ListPageHeader
                Icon={BellRing}
                title="Monitoring & Notifications"
                description={<>Who gets compliance notifications for <span className="font-semibold text-slate-700">{carrierName}</span> — by role from Users &amp; Roles, or by name.</>}
                count={roles.length}
                countTitle={`${roles.length} notification roles`}
                condensed={condensed}
                chips={bridge.chips ?? undefined}
                tabs={COVER_TABS.map(t => ({ id: t.id, label: t.label, icon: t.icon, count: tabCounts[t.id] }))}
                activeTab={coverTab}
                onTabChange={(id) => setCoverTab(id as CoverTab)}
                tabsLabel="Records covered"
                showZeroCounts
                actions={<>
                    {onNavigate && (
                        <button type="button" onClick={() => onNavigate('/default-compliance-monitoring')}
                            className={cn('inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50', condensed ? 'h-8' : 'h-9')}>
                            View monitoring <ArrowRight size={14} />
                        </button>
                    )}
                    {canEdit && (
                        <button type="button" onClick={() => setEditingRole('new')}
                            className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700', condensed ? 'h-8' : 'h-9')}>
                            <Plus size={15} /> Create role
                        </button>
                    )}
                </>}
            />

            <NotificationRolesList
                accountId={accountId}
                roles={shownRoles}
                total={roles.length}
                carrierName={carrierName}
                canEdit={canEdit}
                title={coverTab === 'all' ? 'Notification roles' : `Roles covering ${activeTabLabel.toLowerCase()}`}
                onEdit={r => setEditingRole(r)}
                onToggle={r => updateRole(r.id, { enabled: !r.enabled })}
                onDelete={r => removeRole(r.id)}
                onCreate={() => setEditingRole('new')}
                above={<>
                    {strip}
                    <KpiStatRow stats={stats} />
                </>}
                scrollRef={scrollRef}
                onScroll={onScroll}
            />
        </div>
        </ListHeaderBridge>
    );
}

// ── Who is looking, and whether they may change it ───────────────────────────
function AuthorityStrip({ me, carrierName, spName, canEdit }: { me: AppUser | null; carrierName: string; spName?: string; canEdit: boolean }) {
    const role = me?.role;
    const tone = role === 'super-admin' ? 'border-violet-200 bg-violet-50 text-violet-800'
        : canEdit ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 bg-slate-50 text-slate-600';
    const Icon = role === 'super-admin' ? Crown : canEdit ? (role === 'admin' ? ShieldCheck : Settings2) : Lock;
    const text = role === 'super-admin'
        ? <>You're a <b>Super Admin</b> — all access. Showing who is notified for <b>{carrierName}</b>.</>
        : canEdit && role === 'admin'
            ? <>You're an <b>Admin of {spName ?? 'the service profile'}</b> — you decide who gets {carrierName}'s monitoring alerts.</>
            : canEdit
                ? <>You're the <b>Fleet Admin of {carrierName}</b> — you decide who gets its monitoring alerts.</>
                : <>You're a <b>{role ? ROLE_LABELS[role] : 'guest'}</b> — you can see who is notified. The Fleet Admin{spName ? <> or an Admin of {spName}</> : null} changes it.</>;
    return (
        <div className={cn('flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-lg border px-3.5 py-2 text-[13px]', tone)}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{text}</span>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] opacity-80"><Info className="h-3.5 w-3.5" /> Each record decides when reminders fire and whether they're email or in-app.</span>
        </div>
    );
}

// ══ ROLE EDITOR — a dedicated page with the app's list-page chrome ══════════════
function emptyRole(): NotificationRole {
    return { id: 'new', name: '', description: '', enabled: true, carrier: false, allDrivers: false, allAssets: false, driverIds: [], assetIds: [], recipients: [] };
}
type EditorTabKey = 'details' | 'records' | 'users';

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

function RoleEditorPage({ initial, accountId, carrierName, spName, people, drivers, subjectsByEntity, onSave, onCancel }: {
    initial: NotificationRole | null;
    accountId?: string;
    carrierName: string;
    spName?: string;
    people: AppUser[];
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
    const reach = peopleReached(draft, accountId).length;
    const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5';

    const saveDraft = () => onSave({ ...draft, name: draft.name.trim(), description: draft.description?.trim() || undefined });

    return (
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <ListPageHeader
                Icon={UserCheck}
                title={initial ? `Edit role · ${initial.name}` : 'New notification role'}
                description={<>Name it, pick the records it covers, then say who is told — for <span className="font-semibold text-slate-700">{carrierName}</span>.</>}
                condensed={false}
                tabs={[
                    { id: 'details', label: 'Name & description', icon: FileText },
                    { id: 'records', label: 'Records', icon: ListChecks, count: coverageCount },
                    { id: 'users', label: 'Who is told', icon: UserCheck, count: draft.recipients.length },
                ]}
                activeTab={tab}
                onTabChange={(id) => setTab(id as EditorTabKey)}
                tabsLabel="Role editor sections"
                showZeroCounts
                actions={<>
                    <button type="button" onClick={onCancel}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                        <ChevronLeft size={15} /> Back to roles
                    </button>
                    <button type="button" disabled={!canSave} onClick={saveDraft}
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
                        <Check size={15} /> {initial ? 'Save role' : 'Create role'}
                    </button>
                </>}
            />

            <div className="min-h-0 flex-1 overflow-y-auto [overflow-anchor:none]">
                <div className={cn('py-4 sm:py-5', PAGE_PAD)}>
                    <div className="max-w-4xl space-y-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                            {tab === 'details' && (
                                <div className="space-y-5">
                                    <div>
                                        <label className={labelCls}>Role name</label>
                                        <input value={draft.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Safety Managers"
                                            className="h-10 w-full max-w-md rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Description <span className="font-medium normal-case text-slate-400">— optional</span></label>
                                        <textarea value={draft.description ?? ''} onChange={e => set('description', e.target.value)} rows={3}
                                            placeholder="What is this role for? e.g. Handles all driver license & medical renewals."
                                            className="w-full max-w-xl resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                                    </div>
                                    <label className="flex w-fit cursor-pointer items-center gap-2 text-[13px] text-slate-700">
                                        <input type="checkbox" checked={draft.enabled} onChange={e => set('enabled', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                        Role is on — alerts go out
                                    </label>
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
                                    <label className={labelCls}>Who is told</label>
                                    <p className="-mt-0.5 mb-2 text-[12px] text-slate-400">
                                        A <span className="font-semibold text-indigo-700">role</span> is everyone who holds it on {carrierName} — it follows Users &amp; Roles on its own. Add specific people beside it, or instead.
                                    </p>
                                    {draft.recipients.length > 0 && (
                                        <div className="mb-2 flex flex-wrap gap-1.5">
                                            {draft.recipients.map(r => <RecipientChip key={r.id} r={r} accountId={accountId} size="md" onRemove={() => removeRecipient(r.id)} />)}
                                        </div>
                                    )}
                                    <RecipientListSelect selected={draft.recipients} accountId={accountId} carrierName={carrierName} spName={spName}
                                        people={people} drivers={drivers} onAdd={addRecipient} onRemove={removeRecipient} />
                                    <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-slate-400"><Info size={13} /> Email vs in-app is set on each record's Monitoring &amp; Notifications panel — not here.</p>
                                </div>
                            )}
                        </div>
                        <p className="px-1 text-[12px] text-slate-400">
                            {!canSave ? 'Name it, tick at least one record, and say who is told.'
                                : `Reaches ${reach} ${reach === 1 ? 'person' : 'people'} on ${carrierName} right now${draft.recipients.some(r => roleOfRecipient(r)) ? ' — and anyone given those roles later.' : '.'}`}
                        </p>
                    </div>
                </div>
            </div>
        </div>
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
    const toggle = (id: string) => { const n = new Set(sel); if (n.has(id)) n.delete(id); else n.add(id); onChange([...n]); };
    return (
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 border-b border-slate-100 p-2">
                <div className="relative min-w-0 flex-1">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${noun}…`}
                        className="h-9 w-full rounded-md border border-slate-200 pl-8 pr-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                {selected.length > 0 ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                        <span className="text-[11px] font-bold tabular-nums text-blue-600">{selected.length} selected</span>
                        <button type="button" onClick={() => onChange([])} title="Clear selection" className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-300 hover:bg-rose-50 hover:text-rose-500"><X size={13} /></button>
                    </div>
                ) : (
                    <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-400">{shown.length}/{subjects.length}</span>
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
                            <span className={cn('inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border', on ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white')}>{on && <Check size={11} />}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-medium text-slate-800">{s.name}</span>
                                {s.sub && <span className="block truncate text-[11px] text-slate-400">{s.sub}</span>}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ── Recipient list-select — roles first, then people ──────────────────
// Search header + scrollable checkbox list: the carrier's roles (with who holds each right now),
// the assigned owner, the people on the carrier, its drivers, and a custom-contact footer.
function RecipientListSelect({ selected, accountId, carrierName, spName, people, drivers, onAdd, onRemove }: {
    selected: RoutingRecipient[];
    accountId?: string;
    carrierName: string;
    spName?: string;
    people: AppUser[];
    drivers: { id: string; name: string; email?: string }[];
    onAdd: (r: RoutingRecipient) => void;
    onRemove: (id: string) => void;
}) {
    const [q, setQ] = useState('');
    const [customName, setCustomName] = useState('');
    const [customEmail, setCustomEmail] = useState('');

    const ql = q.trim().toLowerCase();
    const match = (s?: string) => !ql || !!s && s.toLowerCase().includes(ql);
    const selectedIds = new Set(selected.map(r => r.id));
    const toggle = (r: RoutingRecipient) => { if (selectedIds.has(r.id)) onRemove(r.id); else onAdd(r); };

    const roleOpts = RECIPIENT_ROLES.filter(role => match(ROLE_LABELS[role]) || match(`${ROLE_LABELS[role]}s`));
    const peopleOpts = people.filter(u => match(u.name) || match(u.title) || match(u.email));
    const driverOpts = drivers.filter(d => match(d.name));
    const customSelected = selected.filter(r => r.kind === 'contact');
    const noMatches = !!ql && roleOpts.length === 0 && peopleOpts.length === 0 && driverOpts.length === 0;

    const addCustom = () => {
        const name = customName.trim(); const email = customEmail.trim();
        if (!name && !email) return;
        onAdd({ id: `contact:${(email || name).toLowerCase()}`, name: name || email, kind: 'contact', email: email || undefined });
        setCustomName(''); setCustomEmail('');
    };
    const roleSub = (role: typeof RECIPIENT_ROLES[number]) => {
        const n = accountId ? usersWithRoleOn(accountId, role).length : 0;
        const who = role === 'admin' ? `Admins of ${spName ?? 'the service profile'}` : `${ROLE_LABELS[role]} on ${carrierName}`;
        return `${who} · ${n} right now`;
    };

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-2">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search roles and people…"
                        className="h-8 w-full rounded-md border border-slate-200 pl-8 pr-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-400">{selected.length} selected</span>
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
                <PickerGroup label={`By role on ${carrierName}`} show={roleOpts.length > 0}>
                    {roleOpts.map(role => {
                        const r = roleRecipient(role);
                        const I = ROLE_META[role].Icon;
                        return <RecipientRow key={r.id} checked={selectedIds.has(r.id)} onClick={() => toggle(r)}
                            icon={<span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full', ROLE_META[role].chip)}><I size={13} /></span>}
                            title={`${ROLE_LABELS[role]}s`} sub={roleSub(role)} />;
                    })}
                </PickerGroup>
                {!ql && (
                    <RecipientRow checked={selectedIds.has(OWNER_RECIPIENT.id)} onClick={() => toggle(OWNER_RECIPIENT)}
                        icon={<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-600"><UserCheck size={13} /></span>}
                        title="Assigned owner" sub="Whoever owns each record" />
                )}
                <PickerGroup label="People" show={peopleOpts.length > 0}>
                    {peopleOpts.map(u => {
                        const r: RoutingRecipient = { id: `user:${u.id}`, name: u.name, kind: 'user', email: u.email };
                        const here = accountId ? (u.role === 'admin' ? `Admin · ${spName ?? 'service profile'}` : ROLE_LABELS[roleOn(u, accountId)]) : ROLE_LABELS[u.role];
                        return <RecipientRow key={r.id} checked={selectedIds.has(r.id)} onClick={() => toggle(r)}
                            icon={<span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-bold text-white', u.avatarGradient)}>{u.initials}</span>}
                            title={u.name} sub={[here, u.title].filter(Boolean).join(' · ')} />;
                    })}
                </PickerGroup>
                <PickerGroup label="Drivers" show={driverOpts.length > 0}>
                    {driverOpts.map(d => {
                        const r: RoutingRecipient = { id: `driver:${d.id}`, name: d.name, kind: 'driver', email: d.email };
                        return <RecipientRow key={r.id} checked={selectedIds.has(r.id)} onClick={() => toggle(r)}
                            icon={<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><User size={13} /></span>}
                            title={d.name} sub="Driver · alerts in the driver app" />;
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
            <div className="space-y-2 border-t border-slate-100 bg-slate-50/50 p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Add an outside contact</p>
                <div className="flex flex-col gap-1.5 sm:flex-row">
                    <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Name"
                        className="h-8 w-full rounded-md border border-slate-200 px-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    <input value={customEmail} onChange={e => setCustomEmail(e.target.value)} placeholder="email@company.com"
                        className="h-8 w-full rounded-md border border-slate-200 px-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    <button type="button" onClick={addCustom} disabled={!customName.trim() && !customEmail.trim()}
                        className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-slate-800 px-3 text-[12px] font-semibold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40">
                        <Plus size={13} /> Add
                    </button>
                </div>
            </div>
        </div>
    );
}

function PickerGroup({ label, show, children }: { label: string; show: boolean; children: ReactNode }) {
    if (!show) return null;
    return (
        <div>
            <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
            {children}
        </div>
    );
}
function RecipientRow({ checked, icon, title, sub, onClick }: { checked: boolean; icon: ReactNode; title: string; sub?: string; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick}
            className={cn('flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors', checked ? 'bg-blue-50/60' : 'hover:bg-slate-50')}>
            <span className={cn('inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border', checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white')}>{checked && <Check size={11} />}</span>
            {icon}
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-slate-800">{title}</span>
                {sub && <span className="block truncate text-[11px] text-slate-400">{sub}</span>}
            </span>
        </button>
    );
}
