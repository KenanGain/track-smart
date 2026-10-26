import { memo, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Briefcase, Check, EyeOff, GripVertical, LayoutDashboard, LayoutTemplate, Plus, RotateCcw, Search, Settings2, SlidersHorizontal, Smartphone, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ListPageHeader } from '@/components/ui/ListPageHeader';
import { ScrollBody, usePageChrome } from '@/components/ui/PageChrome';
import { KebabMenu, type KebabItem } from '@/components/ui/KebabMenu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { KpiChip } from '@/components/ui/KpiChipStrip';
import { CarrierSwitcher } from '@/components/layout/CarrierSwitcher';
import { ServiceProfileSwitcher } from '@/components/layout/ServiceProfileSwitcher';
import { ROLE_LABELS, isDriverUser, roleOn, type AppUser } from '@/data/users.data';
import { ACCOUNTS_DB, getAccountById, type AccountRecord } from '@/pages/accounts/accounts.data';
import { menuAccess, useRoleAccess } from '@/pages/users-roles/roles.data';
import { canOpenCarrier, profilesFor } from '@/pages/users-roles/scope';
import { requestMonitoringFocus } from '@/pages/compliance/monitoring-routing.data';
import type { MonitoringAlert } from '@/pages/compliance/monitoring-alerts';
import { setPendingRecord } from '@/pages/messages/messages-store';
import { STATUS_META } from '@/pages/hiring-process/applicants.data';
import { isUnplaced } from '@/data/signup';
import { useDashData, type DashData, type DashScope } from './dashboard-data';
import {
    CARRIER_PRESET, MAX_H, MAX_W, PERIODS, PROFILE_PRESET, SIZE_META, SIZE_ORDER, presetsFor, readPeriod, shapeLabel, useDashLayout, variantOf, writePeriod,
    type DashLayout, type DashPreset, type LayoutItem, type ScopeKind, type WidgetSize,
} from './dashboard-layout';
import {
    KIND_META, TONE, WIDGETS, WIDGET_BY_ID, WIDGET_CATEGORIES, attentionItems, defFor, menuKeyOf, pageShortcuts, shortcutAllowed, shortcutIcon,
    type BuildCtx, type Shortcut, type ShortcutKind, type WidgetDef,
} from './dashboard-widgets';
import { Avatar, Pill } from './dashboard-charts';

// ─────────────────────────────────────────────────────────────────────────────
// The dashboard — one person's view of everything, arranged by them.
//
// Two views: a carrier (what a Fleet Admin, Safety Manager or User runs day to day) and,
// for an Admin, the service profile (every carrier under it, side by side); the switchers in
// the tab row change which carrier or which profile. Each view is a grid of cards the
// person drags into order and drags out from any edge or corner to any shape — square,
// landscape, portrait, the full width — with each shape drawing its own layout, like a
// phone's home-screen widgets. Cards animate into place. Customize adds widgets and
// shortcuts (a page, or one driver, unit, applicant or carrier). What is offered follows
// the menu table, and what each card says is read from the same stores as the page it
// stands for.
// ─────────────────────────────────────────────────────────────────────────────

const ROW_UNIT = 192; // 12rem
const GAP = 16;
/** Columns: one on a phone, up to two on a tablet, the real width from xl. */
const COL: Record<number, string> = { 1: 'sm:col-span-1', 2: 'sm:col-span-2', 3: 'sm:col-span-2 xl:col-span-3', 4: 'sm:col-span-2 xl:col-span-4' };
const ROW: Record<number, string> = { 1: 'sm:row-span-1', 2: 'sm:row-span-2', 3: 'sm:row-span-3' };
/** On a phone everything stacks, so a card's rows follow its layout rather than its shape. */
const PHONE_ROW: Record<WidgetSize, string> = { sm: 'row-span-1', md: 'row-span-2', lg: 'row-span-3', xl: 'row-span-4' };
const SPRING = { type: 'spring', stiffness: 520, damping: 42, mass: 0.7 } as const;

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

export function DashboardPage({ currentUser, accountId, serviceProfileId, onNavigate, onSelectAccount, onSelectServiceProfile }: {
    currentUser: AppUser;
    /** The carrier in the top bar — the carrier view. */
    accountId?: string;
    /** The person's service profile — the profile view, for an Admin. */
    serviceProfileId?: string;
    onNavigate: (path: string) => void;
    onSelectAccount?: (account: AccountRecord) => void;
    onSelectServiceProfile?: (id: string) => void;
}) {
    const role = roleOn(currentUser, accountId);
    const access = useRoleAccess();
    const can = useCallback((key?: string) => !key || menuAccess(access, key, role) !== 'hidden', [access, role]);
    const hasCarrier = !!accountId;
    const hasProfile = !!serviceProfileId && (currentUser.role === 'super-admin' || currentUser.role === 'admin') && can('service-profile');
    // An Admin's day starts with the profile; everyone else's with the carrier.
    const [tab, setTab] = useState<ScopeKind>(() => ((currentUser.role === 'admin' && hasProfile) || !hasCarrier ? 'profile' : 'carrier'));
    const scopeKind: ScopeKind = tab === 'profile' && hasProfile ? 'profile' : 'carrier';
    const scope = useMemo<DashScope>(
        () => (scopeKind === 'profile' ? { kind: 'profile', serviceProfileId: serviceProfileId ?? '' } : { kind: 'carrier', accountId: accountId ?? '' }),
        [scopeKind, serviceProfileId, accountId],
    );
    const data = useDashData(scope);
    const { scrollRef, onScroll, condensed } = usePageChrome(scopeKind);
    const [customizing, setCustomizing] = useState(false);
    const [months, setMonths] = useState(() => readPeriod(currentUser.id));

    // What this person may have on this view.
    const allowedId = useCallback((id: string) => { const w = WIDGET_BY_ID[id]; return !!w && w.scopes.includes(scopeKind) && can(menuKeyOf(w, scopeKind)); }, [scopeKind, can]);
    const allowedItem = useCallback((item: LayoutItem) => (item.shortcut ? shortcutAllowed(item.shortcut, can) : allowedId(item.id)), [allowedId, can]);
    const preset = scopeKind === 'profile' ? PROFILE_PRESET : (CARRIER_PRESET[role] ?? CARRIER_PRESET.user);
    const fallback = useMemo<DashLayout>(
        () => ({ items: preset.filter(allowedId).map((id) => ({ id, w: SIZE_META[WIDGET_BY_ID[id].defaultSize].w, h: SIZE_META[WIDGET_BY_ID[id].defaultSize].h })) }),
        [preset, allowedId],
    );
    const { layout, customized, resize, setOpt, hide, show, addShortcut, move, reset, applyPreset } = useDashLayout(currentUser.id, scopeKind, fallback, allowedItem);

    // What every card reads — rebuilt only when the data or the period does.
    const base = useMemo<Omit<BuildCtx, 'item' | 'opt'>>(() => ({
        data, user: currentUser, role, can, go: onNavigate, months,
        openRecord: (path, id, type) => { setPendingRecord(path, id, type); onNavigate(path); },
        openAlert: (a: MonitoringAlert, acct?: string) => {
            const id = acct ?? accountId;
            const rec = id ? getAccountById(id) : undefined;
            if (rec) onSelectAccount?.(rec);
            requestMonitoringFocus(a.id);
            onNavigate('/default-compliance-monitoring');
        },
        openCarrier: (id: string, path?: string) => {
            const rec = getAccountById(id);
            if (rec) onSelectAccount?.(rec);
            onNavigate(path ?? '/account/profile');
        },
    }), [data, currentUser, role, can, onNavigate, months, accountId, onSelectAccount]);
    // The header's figures while condensed — the "Needs attention" count, whether or not that tile is on the grid.
    const attention = useMemo(() => attentionItems(base), [base]);
    const total = attention.reduce((s, i) => s + i.count, 0);
    const urgent = attention.filter((i) => i.urgent).reduce((s, i) => s + i.count, 0);
    const chips: KpiChip[] = [
        { id: 'items', label: 'Needs attention', value: total, tone: TONE[urgent ? 'red' : total ? 'amber' : 'emerald'].text },
        { id: 'overdue', label: 'Overdue', value: urgent, tone: TONE.red.text },
        { id: 'soon', label: 'Due soon', value: total - urgent, tone: TONE.amber.text },
    ];

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const ids = useMemo(() => layout.items.map((i) => i.id), [layout.items]);
    const onDragEnd = useCallback((e: DragEndEvent) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        move(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    }, [ids, move]);

    // ── Below every hook ──
    if (isDriverUser(currentUser)) {
        return (
            <div className="flex h-full min-h-0 flex-col bg-slate-50">
                <ListPageHeader Icon={LayoutDashboard} title="Dashboard" condensed={false} />
                <div className="flex flex-1 items-center justify-center p-6">
                    <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                        <Smartphone className="mx-auto h-8 w-8 text-blue-600" />
                        <p className="mt-3 text-sm font-bold text-slate-900">Your seat is the Driver app</p>
                        <p className="mt-1 text-[13px] text-slate-500">Your documents, hours and anything the office sends you are there.</p>
                        <button type="button" onClick={() => onNavigate('/driver-mobile-app')} className="mt-4 inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">Open the Driver app</button>
                    </div>
                </div>
            </div>
        );
    }

    const first = currentUser.name.split(' ')[0];
    const carrierName = data.account?.dbaName || data.account?.legalName || getAccountById(accountId ?? '')?.dbaName || 'Carrier';
    const profileName = data.profile?.dbaName || data.profile?.legalName || 'Service profile';
    const where = scopeKind === 'profile'
        ? `${profileName} · ${data.carriers.length} carrier${data.carriers.length === 1 ? '' : 's'} side by side`
        : data.account ? `${carrierName} as ${ROLE_LABELS[role]}` : 'no carrier selected';
    const tabs = hasCarrier && hasProfile
        ? [{ id: 'carrier', label: carrierName, icon: Truck }, { id: 'profile', label: profileName, icon: Briefcase }]
        : undefined;
    // The switchers: which carrier on the carrier view, which profile on the profile view.
    const carrierOptions = ACCOUNTS_DB.filter((a) => canOpenCarrier(currentUser, a));
    const profileOptions = profilesFor(currentUser);
    const switcher = scopeKind === 'profile'
        ? (onSelectServiceProfile && profileOptions.length > 0 ? (
            <ServiceProfileSwitcher selectedProfileId={serviceProfileId} profiles={profileOptions} onSelect={onSelectServiceProfile}
                scopeLabel={currentUser.role === 'super-admin' ? 'Super Admin · All Service Profiles' : `Admin · ${profileOptions.length} service profile${profileOptions.length === 1 ? '' : 's'}`} />
        ) : null)
        : (onSelectAccount && carrierOptions.length > 0 ? (
            <CarrierSwitcher selectedAccountId={accountId}
                accounts={carrierOptions.map((a) => ({ id: a.id, legalName: a.legalName, dbaName: a.dbaName, dotNumber: a.dotNumber, status: a.status, city: a.city, state: a.state }))}
                onSelect={(id) => { const a = ACCOUNTS_DB.find((x) => x.id === id); if (a) onSelectAccount(a); }}
                scopeLabel={currentUser.role === 'super-admin' ? 'Super Admin · All Carriers' : `${ROLE_LABELS[role]} · ${carrierOptions.length} carrier${carrierOptions.length === 1 ? '' : 's'}`} />
        ) : null);
    const btn = (cls: string) => cn('inline-flex items-center gap-1.5 rounded-lg px-3 text-sm font-semibold shadow-sm transition-colors', condensed ? 'h-8' : 'h-9', cls);
    const pickPeriod = (m: number) => { setMonths(m); writePeriod(currentUser.id, m); };

    return (
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <ListPageHeader
                Icon={LayoutDashboard}
                title="Dashboard"
                description={`${greeting()}, ${first} — ${where}.`}
                condensed={condensed}
                chips={chips}
                tabs={tabs}
                activeTab={tabs ? scopeKind : undefined}
                onTabChange={tabs ? (id) => setTab(id as ScopeKind) : undefined}
                tabsRight={tabs ? switcher ?? undefined : undefined}
                tabsLabel="Dashboard views"
                actions={<>
                    {/* The period the time charts cover. */}
                    <div className={cn('inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm', condensed ? 'h-8' : 'h-9')} role="group" aria-label="Period for the charts" title="How many months the charts cover">
                        {PERIODS.map((m) => (
                            <button key={m} type="button" onClick={() => pickPeriod(m)}
                                className={cn('h-full rounded-md px-2 text-[12px] font-bold tabular-nums transition-colors', months === m ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800')}>
                                {m}m
                            </button>
                        ))}
                    </div>
                    <button type="button" onClick={() => setCustomizing(true)} className={btn('bg-blue-600 text-white hover:bg-blue-700')} title="Add widgets and shortcuts, or reset the layout">
                        <Settings2 size={15} /> <span className="hidden sm:inline">Customize</span>
                    </button>
                </>}
            />

            <ScrollBody scrollRef={scrollRef} onScroll={onScroll}>
                {!hasCarrier && !hasProfile ? (
                    isUnplaced(currentUser) ? (
                        <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
                            <Truck className="mx-auto h-7 w-7 text-slate-300" />
                            <p className="mt-3 text-sm font-semibold text-slate-900">You're not on a carrier yet</p>
                            <p className="mt-1 text-xs text-slate-500">Give your user ID to your Fleet Admin or Admin. They add you from Users &amp; Roles ▸ Add user ▸ Already signed up, and this becomes your carrier's dashboard.</p>
                            <code className="mt-4 inline-block rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-sm text-slate-800">{currentUser.id}</code>
                            <p className="mt-3 text-[11px] text-slate-400">Signed in as {currentUser.email}</p>
                        </div>
                    ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                        <Truck className="mx-auto h-7 w-7 text-slate-300" />
                        <p className="mt-3 text-sm font-semibold text-slate-700">Pick a carrier in the top bar</p>
                        <p className="mt-1 text-xs text-slate-500">The dashboard shows one carrier at a time.</p>
                    </div>
                    )
                ) : layout.items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                        <LayoutDashboard className="mx-auto h-7 w-7 text-slate-300" />
                        <p className="mt-3 text-sm font-semibold text-slate-700">An empty dashboard</p>
                        <p className="mt-1 text-xs text-slate-500">Customize to add widgets and shortcuts, or reset to the layout for your role.</p>
                        <button type="button" onClick={() => setCustomizing(true)} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"><Settings2 size={15} /> Customize</button>
                    </div>
                ) : (
                    <>
                        <p className="text-[11px] text-slate-500">
                            {layout.items.length} card{layout.items.length === 1 ? '' : 's'} · drag the grip to rearrange · drag any edge or corner to reshape (each shape is its own layout) · the filter on a card changes what it shows · ↗ on a row opens that record
                        </p>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                            <SortableContext items={ids} strategy={rectSortingStrategy}>
                                <div className="grid auto-rows-[12rem] grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                    <AnimatePresence initial={false}>
                                        {layout.items.map((item) => {
                                            const def = defFor(item);
                                            if (!def) return null;
                                            return (
                                                <SortableCard key={item.id} item={item} def={def} base={base} scopeKind={scopeKind}
                                                    onNavigate={onNavigate} onResizeItem={resize} onOptItem={setOpt} onHideItem={hide} />
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            </SortableContext>
                        </DndContext>
                    </>
                )}
            </ScrollBody>

            {customizing && (
                <CustomizeDialog data={data} scopeKind={scopeKind} items={layout.items} customized={customized} can={can} allowedId={allowedId}
                    presets={presetsFor(scopeKind)} currentPreset={layout.preset}
                    onApplyPreset={(p) => applyPreset(p, p.items.filter((i) => allowedId(i.id)))}
                    onAddWidget={show} onAddShortcut={addShortcut} onReset={reset} onClose={() => setCustomizing(false)} />
            )}
        </div>
    );
}

// ── One card ──────────────────────────────────────────────────────────────────

const SortableCard = memo(function SortableCard({ item, def, base, scopeKind, onNavigate, onResizeItem, onOptItem, onHideItem }: {
    item: LayoutItem; def: WidgetDef; base: Omit<BuildCtx, 'item' | 'opt'>; scopeKind: ScopeKind;
    onNavigate: (path: string) => void; onResizeItem: (id: string, w: number, h: number) => void; onOptItem: (id: string, key: string, value: string) => void; onHideItem: (id: string) => void;
}) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
    const cardRef = useRef<HTMLElement | null>(null);
    const style = { transform: CSS.Transform.toString(transform), transition };
    const variant = variantOf(item.w, item.h);
    const sc = item.shortcut;
    const path = def.path?.(scopeKind);
    const optValue = def.option ? (item.opts?.[def.option.key] ?? def.option.default) : undefined;
    const ctx = useMemo<BuildCtx>(() => ({ ...base, item, opt: (key) => item.opts?.[key] ?? (def.option && def.option.key === key ? def.option.default : '') }), [base, item, def]);
    const onResize = useCallback((w: number, h: number) => onResizeItem(item.id, w, h), [onResizeItem, item.id]);
    const title = sc?.label ?? def.title;
    const Icon = sc ? shortcutIcon(sc) : def.Icon;
    const tone = sc ? KIND_META[sc.kind].tone : def.tone;
    const menu: KebabItem[] = [
        ...(path ? [{ label: `Open ${title}`, icon: ArrowUpRight, onClick: () => onNavigate(path) }] : []),
        ...SIZE_ORDER.filter((s) => def.sizes.includes(s)).map((s) => ({
            label: `${SIZE_META[s].label} · ${shapeLabel(SIZE_META[s].w, SIZE_META[s].h)}${SIZE_META[s].w === item.w && SIZE_META[s].h === item.h ? ' (current)' : ''}`,
            icon: SIZE_META[s].w === item.w && SIZE_META[s].h === item.h ? Check : undefined,
            onClick: () => onResize(SIZE_META[s].w, SIZE_META[s].h),
        })),
        { label: sc ? 'Remove shortcut' : 'Hide from dashboard', icon: EyeOff, onClick: () => onHideItem(item.id), danger: true },
    ];
    return (
        <div ref={setNodeRef} style={style} className={cn('col-span-1', PHONE_ROW[variant], COL[item.w], ROW[item.h], isDragging && 'z-20')}>
            <motion.section ref={cardRef} layout={!isDragging} transition={SPRING}
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.16 } }}
                className={cn('@container group/card relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm',
                    isDragging ? 'border-blue-300 shadow-lg ring-2 ring-blue-500/20' : 'border-slate-200 hover:shadow-md')}>
                <header className="flex shrink-0 items-center gap-1.5 py-1.5 pl-1.5 pr-1">
                    <button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners} title="Drag to move" aria-label={`Move ${title}`}
                        className="flex h-7 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-slate-300 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing">
                        <GripVertical size={14} />
                    </button>
                    <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', TONE[tone].soft)}><Icon size={13} /></span>
                    <h3 className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-900" title={`${sc ? `${KIND_META[sc.kind].label} shortcut` : def.blurb} · ${shapeLabel(item.w, item.h)}`}>{title}</h3>
                    {def.option && optValue !== undefined && (
                        <label className="relative hidden shrink-0 items-center @md:flex" title={`${def.option.label} — changes what the card shows`}>
                            <SlidersHorizontal size={11} className="pointer-events-none absolute left-1.5 text-slate-400" />
                            <select value={optValue} onChange={(e) => onOptItem(item.id, def.option!.key, e.target.value)} aria-label={`${def.option.label} for ${title}`}
                                className="h-6 max-w-[8.5rem] appearance-none rounded-md border border-slate-200 bg-white pl-5 pr-5 text-[10.5px] font-semibold text-slate-600 outline-none hover:border-slate-300 focus:border-blue-400">
                                {def.option.choices.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </select>
                            <span className="pointer-events-none absolute right-1.5 text-[9px] text-slate-400">▾</span>
                        </label>
                    )}
                    {path && (
                        <button type="button" onClick={() => onNavigate(path)} title={`Open ${title}`} aria-label={`Open ${title}`}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600">
                            <ArrowUpRight size={15} />
                        </button>
                    )}
                    <KebabMenu items={menu} title={`Options for ${title}`} />
                </header>
                <div className="min-h-0 flex-1">{def.render(ctx, variant)}</div>
                <ResizeHandles w={item.w} h={item.h} cardRef={cardRef} onResize={onResize} title={title} />
            </motion.section>
        </div>
    );
});

/** The edges and corners you drag to reshape a card: columns from the horizontal pull, rows from the vertical, snapped to the grid. */
const HANDLES: { id: string; cls: string; sx: -1 | 0 | 1; sy: -1 | 0 | 1; corner?: boolean }[] = [
    { id: 'r', cls: 'top-4 bottom-4 right-0 w-2 cursor-ew-resize', sx: 1, sy: 0 },
    { id: 'l', cls: 'top-4 bottom-4 left-0 w-2 cursor-ew-resize', sx: -1, sy: 0 },
    { id: 'b', cls: 'left-4 right-4 bottom-0 h-2 cursor-ns-resize', sx: 0, sy: 1 },
    { id: 't', cls: 'left-4 right-4 top-0 h-2 cursor-ns-resize', sx: 0, sy: -1 },
    { id: 'br', cls: 'bottom-0 right-0 h-4 w-4 cursor-nwse-resize', sx: 1, sy: 1, corner: true },
    { id: 'bl', cls: 'bottom-0 left-0 h-4 w-4 cursor-nesw-resize', sx: -1, sy: 1, corner: true },
    { id: 'tr', cls: 'top-0 right-0 h-4 w-4 cursor-nesw-resize', sx: 1, sy: -1, corner: true },
    { id: 'tl', cls: 'top-0 left-0 h-4 w-4 cursor-nwse-resize', sx: -1, sy: -1, corner: true },
];
function ResizeHandles({ w, h, cardRef, onResize, title }: { w: number; h: number; cardRef: React.RefObject<HTMLElement | null>; onResize: (w: number, h: number) => void; title: string }) {
    const [live, setLive] = useState<{ w: number; h: number } | null>(null);
    const start = useRef<{ x: number; y: number; colW: number; sx: number; sy: number; w: number; h: number } | null>(null);
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    const down = (sx: number, sy: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
        const el = cardRef.current;
        if (!el) return;
        e.preventDefault(); e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { x: e.clientX, y: e.clientY, colW: (el.getBoundingClientRect().width + GAP) / w, sx, sy, w, h };
        setLive({ w, h });
    };
    const moveTo = (e: React.PointerEvent<HTMLButtonElement>) => {
        const s = start.current;
        if (!s) return;
        const nw = s.sx ? clamp(Math.round(s.w + (s.sx * (e.clientX - s.x)) / s.colW), 1, MAX_W) : s.w;
        const nh = s.sy ? clamp(Math.round(s.h + (s.sy * (e.clientY - s.y)) / (ROW_UNIT + GAP)), 1, MAX_H) : s.h;
        if (!live || live.w !== nw || live.h !== nh) { setLive({ w: nw, h: nh }); onResize(nw, nh); }
    };
    const up = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (start.current) e.currentTarget.releasePointerCapture(e.pointerId);
        start.current = null;
        setLive(null);
    };
    return (
        <>
            {HANDLES.map((hd) => (
                <button key={hd.id} type="button" onPointerDown={down(hd.sx, hd.sy)} onPointerMove={moveTo} onPointerUp={up} onPointerCancel={up}
                    title={`Drag to resize · ${shapeLabel(w, h)}`} aria-label={`Resize ${title} (${hd.id})`}
                    className={cn('absolute z-10 hidden touch-none rounded-sm transition-opacity sm:block', hd.cls,
                        hd.corner ? 'opacity-0 group-hover/card:opacity-100' : 'opacity-0 hover:bg-blue-500/15 group-hover/card:opacity-100',
                        live && 'opacity-100')}>
                    {hd.corner && <span className="pointer-events-none absolute inset-1 rounded-sm border-2 border-slate-300 group-hover/card:border-blue-400" style={{ borderTop: hd.id.startsWith('b') ? 'none' : undefined, borderBottom: hd.id.startsWith('t') ? 'none' : undefined, borderLeft: hd.id.endsWith('r') ? 'none' : undefined, borderRight: hd.id.endsWith('l') ? 'none' : undefined }} />}
                </button>
            ))}
            {live && (
                <span className="pointer-events-none absolute bottom-2 right-2 z-20 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-bold tabular-nums text-white shadow">
                    {live.w} × {live.h} · {SIZE_META[variantOf(live.w, live.h)].label}
                </span>
            )}
        </>
    );
}

// ── Customize ─────────────────────────────────────────────────────────────────

const SHORTCUT_KINDS: ShortcutKind[] = ['page', 'driver', 'asset', 'applicant', 'carrier'];

function CustomizeDialog({ data, scopeKind, items, customized, can, allowedId, presets, currentPreset, onApplyPreset, onAddWidget, onAddShortcut, onReset, onClose }: {
    data: DashData; scopeKind: ScopeKind; items: LayoutItem[]; customized: boolean;
    can: (menuKey?: string) => boolean; allowedId: (id: string) => boolean;
    presets: DashPreset[]; currentPreset?: string; onApplyPreset: (p: DashPreset) => void;
    onAddWidget: (id: string, w: number, h: number) => void; onAddShortcut: (sc: Shortcut, w: number, h: number) => void; onReset: () => void; onClose: () => void;
}) {
    const [tab, setTab] = useState<'layouts' | 'widgets' | 'shortcuts'>('layouts');
    const [kind, setKind] = useState<ShortcutKind>('page');
    const [q, setQ] = useState('');
    const has = (id: string) => items.some((i) => i.id === id);
    const available = WIDGETS.filter((w) => allowedId(w.id) && !has(w.id));
    const needle = q.trim().toLowerCase();
    const hit = (...parts: (string | undefined)[]) => !needle || parts.some((p) => p?.toLowerCase().includes(needle));
    // What a shortcut can point at, for the kind picked.
    const candidates: { sc: Shortcut; sub: string; lead: ReactNode; group?: string }[] = (() => {
        if (kind === 'page') return pageShortcuts().filter((p) => p.key !== 'dashboard' && can(p.menuKey) && hit(p.label, p.group)).map((p) => ({ sc: { kind: 'page', ref: p.key, label: p.label, path: p.path, menuKey: p.menuKey }, sub: p.group, group: p.group, lead: <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-700">{p.Icon ? <p.Icon size={14} /> : null}</span> }));
        if (kind === 'driver') return data.drivers.filter((d) => hit(d.name, d.status)).slice(0, 40).map((d) => ({ sc: { kind: 'driver', ref: d.id, label: d.name, sub: d.status }, sub: `${d.driverType ?? 'Driver'} · ${d.status}`, lead: <Avatar name={d.name} tone="emerald" size={28} /> }));
        if (kind === 'asset') return data.assets.filter((a) => hit(a.unitNumber, a.make, a.model)).slice(0, 40).map((a) => ({ sc: { kind: 'asset', ref: a.id, label: a.unitNumber, sub: a.assetType }, sub: `${a.make} ${a.model} · ${a.assetType} · ${a.operationalStatus}`, lead: <span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-50 text-violet-700"><Truck size={14} /></span> }));
        if (kind === 'applicant') return data.applicants.filter((a) => hit(a.firstName, a.lastName, a.carrier)).slice(0, 40).map((a) => ({ sc: { kind: 'applicant', ref: a.id, label: `${a.firstName} ${a.lastName}`, sub: STATUS_META[a.status].label }, sub: `${STATUS_META[a.status].label} · ${a.carrier}`, lead: <Avatar name={`${a.firstName} ${a.lastName}`} tone="sky" size={28} /> }));
        return data.carriers.filter((c) => hit(c.legalName, c.dbaName, c.dotNumber)).map((c) => ({ sc: { kind: 'carrier', ref: c.id, label: c.dbaName || c.legalName, sub: c.status }, sub: `${c.dotNumber ? `DOT ${c.dotNumber} · ` : ''}${c.status}`, lead: <Avatar name={c.legalName} tone="indigo" size={28} className="rounded-md" /> }));
    })();
    const kinds = SHORTCUT_KINDS.filter((k) => (k === 'carrier' ? scopeKind === 'profile' || data.carriers.length > 1 : true) && (k === 'driver' || k === 'asset' ? can('account') : k === 'applicant' ? can('hiring-process') : true));
    const shapeButtons = (add: (w: number, h: number) => void, sizes: WidgetSize[]) => (
        <span className="flex shrink-0 gap-1">
            {SIZE_ORDER.filter((s) => sizes.includes(s)).map((s) => (
                <button key={s} type="button" onClick={() => add(SIZE_META[s].w, SIZE_META[s].h)} title={`Add as ${SIZE_META[s].label} (${shapeLabel(SIZE_META[s].w, SIZE_META[s].h)}) — ${SIZE_META[s].hint}`}
                    className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-md border border-slate-200 bg-white px-1.5 text-[11px] font-bold text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
                    {SIZE_META[s].short}
                </button>
            ))}
        </span>
    );
    const TABS = [['layouts', 'Layouts'], ['widgets', `Widgets · ${available.length}`], ['shortcuts', 'Shortcuts']] as const;
    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-2xl p-0">
                <DialogHeader className="border-b border-slate-100 px-5 pb-0 pt-4">
                    <DialogTitle>Customize the dashboard</DialogTitle>
                    <p className="text-[12px] text-slate-500">Start from a ready-made layout, add widgets and shortcuts at the shape you want — then drag any card to any shape, or reorder it by its grip.</p>
                    <div className="-mb-px mt-3 flex gap-4">
                        {TABS.map(([id, label]) => (
                            <button key={id} type="button" onClick={() => setTab(id)} className={cn('border-b-2 pb-2 text-[13px] font-semibold', tab === id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>{label}</button>
                        ))}
                    </div>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto px-5 py-3">
                    {tab === 'layouts' ? (
                        <div className="space-y-2 py-1">
                            <p className="text-[11px] text-slate-500">Pick one and use it. It replaces what is on the dashboard (shortcuts included); anything your menu hides is left out. You can still reshape, reorder, add and hide afterwards.</p>
                            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {presets.map((p) => {
                                    const shown = p.items.filter((i) => allowedId(i.id));
                                    const current = currentPreset === p.id;
                                    return (
                                        <li key={p.id} className={cn('flex items-center gap-3 rounded-xl border p-3', current ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200 bg-white')}>
                                            <PresetThumb items={shown} />
                                            <span className="min-w-0 flex-1">
                                                <span className="flex items-center gap-1.5 text-[13px] font-bold text-slate-900">{p.name}{current && <Pill>current</Pill>}</span>
                                                <span className="block text-[11px] text-slate-500">{p.blurb}</span>
                                                <span className="mt-0.5 block text-[10px] text-slate-400">{shown.length} cards</span>
                                            </span>
                                            <button type="button" onClick={() => onApplyPreset(p)} disabled={current}
                                                className={cn('inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2.5 text-[12px] font-semibold', current ? 'cursor-default border border-slate-200 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700')}>
                                                {current ? <><Check size={13} /> In use</> : <><LayoutTemplate size={13} /> Use</>}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ) : tab === 'widgets' ? (
                        available.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Everything your menu offers is already on the dashboard.</p>
                            : WIDGET_CATEGORIES.map((cat) => {
                                const list = available.filter((w) => w.category === cat);
                                if (!list.length) return null;
                                return (
                                    <section key={cat} className="py-2">
                                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{cat}</p>
                                        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                                            {list.map((w) => (
                                                <li key={w.id} className="flex items-center gap-3 px-3 py-2">
                                                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md', TONE[w.tone].soft)}><w.Icon size={15} /></span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block text-[13px] font-semibold text-slate-900">{w.title}</span>
                                                        <span className="block truncate text-[11px] text-slate-500" title={w.blurb}>{w.blurb}</span>
                                                    </span>
                                                    {shapeButtons((cw, ch) => onAddWidget(w.id, cw, ch), w.sizes)}
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                );
                            })
                    ) : (
                        <div className="space-y-3 py-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex flex-wrap gap-1">
                                    {kinds.map((k) => (
                                        <button key={k} type="button" onClick={() => { setKind(k); setQ(''); }}
                                            className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold', kind === k ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
                                            {(() => { const I = KIND_META[k].Icon; return <I size={12} />; })()} {KIND_META[k].plural}
                                        </button>
                                    ))}
                                </div>
                                <label className="relative ml-auto min-w-[12rem] flex-1 sm:flex-none">
                                    <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${KIND_META[kind].plural.toLowerCase()}…`} className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-[12px] outline-none focus:border-blue-400 focus:bg-white" />
                                </label>
                            </div>
                            <p className="text-[11px] text-slate-500">A shortcut is an icon that opens {kind === 'page' ? 'the page' : `that ${KIND_META[kind].label.toLowerCase()}`}; made bigger, it shows what the dashboard knows about it — records to fix, violations, maintenance due — and opens each one.</p>
                            {candidates.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Nothing matches.</p> : (
                                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                                    {candidates.map((c) => {
                                        const id = `sc:${c.sc.kind}:${c.sc.ref}`;
                                        const on = has(id);
                                        return (
                                            <li key={id} className="flex items-center gap-3 px-3 py-2">
                                                {c.lead}
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-[13px] font-semibold text-slate-900">{c.sc.label}</span>
                                                    <span className="block truncate text-[11px] text-slate-500">{c.sub}</span>
                                                </span>
                                                {on ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><Check size={13} /> On the dashboard</span> : shapeButtons((cw, ch) => onAddShortcut(c.sc, cw, ch), ['sm', 'md', 'lg', 'xl'])}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[11px] text-slate-500">
                    <span>{items.length} card{items.length === 1 ? '' : 's'} on the dashboard · S M L XL adds at that shape</span>
                    <span className="flex items-center gap-3">
                        {customized && <button type="button" onClick={onReset} className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900" title="Back to the layout for your role"><RotateCcw size={12} /> Role default</button>}
                        <button type="button" onClick={onClose} className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"><Plus size={12} /> Done</button>
                    </span>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/** A preset drawn small: each card a block of its colour, at its shape, on the four-column grid. */
const THUMB_COL: Record<number, string> = { 1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3', 4: 'col-span-4' };
const THUMB_ROW: Record<number, string> = { 1: 'row-span-1', 2: 'row-span-2', 3: 'row-span-3' };
function PresetThumb({ items }: { items: LayoutItem[] }) {
    return (
        <div className="grid w-[4.5rem] shrink-0 auto-rows-[6px] grid-cols-4 gap-[2px] overflow-hidden rounded-md border border-slate-200 bg-slate-50 p-[3px]" aria-hidden style={{ maxHeight: 60 }}>
            {items.slice(0, 14).map((i) => <span key={i.id} className={cn('rounded-[2px]', THUMB_COL[i.w], THUMB_ROW[i.h], TONE[WIDGET_BY_ID[i.id]?.tone ?? 'slate'].bg, 'opacity-70')} />)}
        </div>
    );
}
