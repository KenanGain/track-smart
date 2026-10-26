import React, { Fragment, useMemo, useState } from "react";
import { Crown, ExternalLink, FlaskConical, KeyRound, LogIn, Lock, ShieldCheck, Users as UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { type SubTab } from "@/components/ui/SubTabs";
import { ListPageHeader, PAGE_PAD } from "@/components/ui/ListPageHeader";
import { ListScrollFrame } from "@/components/ui/ListScrollFrame";
import {
    ColumnPicker, FilterSelect, FiltersToggle, GroupBySelect, ListToolbar, ResetFilters, SortTh, TableGroupBand, TablePager,
    useTableSort, type PickerColumn,
} from "@/components/ui/ListChrome";
import { PIN_TD_ACTIONS, PIN_TH, PIN_TH_ACTIONS, mobileFold } from "@/components/ui/list-chrome";
import { useCondensingHeader } from "@/components/ui/use-condensing-header";
import { ListHeaderBridge, useListHeaderBridge } from "@/components/ui/list-header-bridge";
import { KebabMenu, type KebabItem } from "@/components/ui/KebabMenu";
import { APP_USERS, DEMO_PASSWORD, ROLE_LABELS, ROLE_ORDER, findUserById, hasRole, isDriverUser, roleRank, type AppUser, type UserRole } from "@/data/users.data";
import { ROLE_TEST_ACCOUNTS, type RoleTestAccount } from "@/data/role-test-users.data";
import { getAccountById, type AccountRecord } from "@/pages/accounts/accounts.data";
import { useDirectoryVersion } from "./scope";
import { AccessMatrix, Avatar, RoleBadge, RoleCardsGrid, StatusDot } from "./pieces";

// ─────────────────────────────────────────────────────────────────────────────
// Admin ▸ Roles — the roles system at platform level.
//
// The two Users & Roles pages are about one service profile and one carrier. This is the
// view above both: the Sidebar menus by role table for all six roles (a Super Admin edits
// it, everyone else reads it), what each role is for, and the test accounts — one login per
// access shape, from role-test-users.data.ts — so the whole thing can be checked by signing
// in as each of them. A Super Admin can switch straight into one from here.
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "matrix" | "test" | "info";

export function AdminRolesPage({ currentUser, onNavigate, onSwitchUser, onSelectAccount, onSelectServiceProfile }: {
    currentUser: AppUser;
    onNavigate: (path: string) => void;
    /** Prototype: sign in as a test account without going through the login page. Super Admin only. */
    onSwitchUser?: (u: AppUser) => void;
    /** Scope the app to an account's own carrier / profile before opening it in Users & Roles. */
    onSelectAccount?: (a: AccountRecord) => void;
    onSelectServiceProfile?: (id: string) => void;
}) {
    useDirectoryVersion();
    const [tab, setTab] = useState<Tab>("info");
    // The table (or the tab body) is what scrolls; the header band shrinks as it does.
    const { scrollRef, condensed: rowsCondensed, onScroll } = useCondensingHeader(tab);
    // The list says when its KPI cards have scrolled away; the header then condenses and
    // carries their figures, and opens again when the cards come back.
    const bridge = useListHeaderBridge();
    const condensed = rowsCondensed || bridge.away;
    const superAdmin = currentUser.role === "super-admin";
    const rows = ROLE_TEST_ACCOUNTS.map((t) => ({ t, u: findUserById(t.userId) })).filter((r): r is { t: RoleTestAccount; u: AppUser } => !!r.u);
    const countOf = (r: UserRole) => APP_USERS.filter((u) => hasRole(u, r)).length;

    const tabs: SubTab<Tab>[] = [
        { id: "info", label: "Roles", icon: ShieldCheck, count: ROLE_ORDER.length },
        { id: "matrix", label: "Access", icon: Lock },
        { id: "test", label: "Test accounts", icon: FlaskConical, count: rows.length },
    ];

    // Who is looking — scrolls away with the rest of what sits above the table.
    const strip = (
        <div className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-lg border px-3.5 py-2 text-[13px]",
            superAdmin ? "border-violet-200 bg-violet-50 text-violet-800" : "border-slate-200 bg-slate-50 text-slate-600")}>
            {superAdmin ? <Crown className="h-4 w-4 shrink-0" /> : <Lock className="h-4 w-4 shrink-0" />}
            <span className="min-w-0 flex-1">
                {superAdmin
                    ? <>You're a <b>Super Admin</b> — the menu table below is yours to tune, and you can sign in as any test account from here.</>
                    : <>You're an <b>{ROLE_LABELS[currentUser.role]}</b> — the menu table is set by TrackSmart; the test accounts can be signed in as from the login page.</>}
            </span>
        </div>
    );

    return (
        <ListHeaderBridge value={bridge.value}>
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <ListPageHeader
                Icon={ShieldCheck}
                title="Roles & Access"
                description="The six roles on their three levels, which sidebar menus each one gets, and a login for every access shape to check it with."
                condensed={condensed}
                chips={bridge.chips ?? undefined}
                tabs={tabs}
                activeTab={tab}
                onTabChange={(id) => setTab(id as Tab)}
                tabsLabel="Roles sections"
            />

            {tab === "matrix" && (
                <AccessMatrix roles={ROLE_ORDER} editable={superAdmin} frame={{ above: strip, scrollRef, onScroll }} />
            )}
            {tab === "test" && (
                <TestAccountsTab rows={rows} me={currentUser} onNavigate={onNavigate}
                    onSwitchUser={superAdmin ? onSwitchUser : undefined}
                    onSelectAccount={onSelectAccount} onSelectServiceProfile={onSelectServiceProfile}
                    above={strip} scrollRef={scrollRef} onScroll={onScroll} />
            )}
            {tab === "info" && (
                <div ref={scrollRef} onScroll={onScroll} className={cn("min-h-0 flex-1 overflow-y-auto py-4 sm:py-5 [overflow-anchor:none]", PAGE_PAD)}>
                    <div className="space-y-5">
                        {strip}
                        <RoleCardsGrid roles={ROLE_ORDER} countOf={countOf} countSuffix={() => "on the platform"} />
                    </div>
                </div>
            )}
        </div>
        </ListHeaderBridge>
    );
}

// ── Test accounts — the matrix, one line each ────────────────────────────────

type TCol = "account" | "role" | "scenario" | "check" | "status";
const T_COLS: PickerColumn<TCol>[] = [
    { id: "account", label: "Account", locked: true },
    { id: "role", label: "Role" },
    { id: "scenario", label: "Scenario" },
    { id: "check", label: "What to check" },
    { id: "status", label: "Status" },
];
type TGroup = "none" | "role" | "status";
const T_GROUPS: { id: TGroup; label: string }[] = [
    { id: "none", label: "No grouping" },
    { id: "role", label: "Group: Role" },
    { id: "status", label: "Group: Status" },
];
const STATUSES: AppUser["status"][] = ["Active", "Invited", "Inactive"];

const TD = ({ children, className, onClick, title }: { children?: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void; title?: string }) => (
    <td onClick={onClick} title={title} className={cn("px-4 py-2.5 text-sm align-middle whitespace-nowrap", className)}>{children}</td>
);

function TestAccountsTab({ rows, me, onNavigate, onSwitchUser, onSelectAccount, onSelectServiceProfile, above, scrollRef, onScroll }: {
    rows: { t: RoleTestAccount; u: AppUser }[]; me: AppUser; onNavigate: (path: string) => void; onSwitchUser?: (u: AppUser) => void;
    onSelectAccount?: (a: AccountRecord) => void; onSelectServiceProfile?: (id: string) => void;
    above?: React.ReactNode;
    scrollRef?: React.Ref<HTMLDivElement>;
    onScroll?: React.UIEventHandler<HTMLDivElement>;
}) {
    type Row = { t: RoleTestAccount; u: AppUser };
    const [query, setQuery] = useState("");
    const [role, setRole] = useState("");
    const [status, setStatus] = useState("");
    const [groupBy, setGroupBy] = useState<TGroup>("none");
    const [visible, setVisible] = useState<Set<TCol>>(() => new Set(T_COLS.map((c) => c.id)));
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [filtersOpen, setFiltersOpen] = useState(false);

    const q = query.trim().toLowerCase();
    const shown = rows.filter(({ t, u }) => {
        if (q && ![u.name, u.email, t.scenario, t.where, t.menus, t.data, t.alerts].some((s) => s.toLowerCase().includes(q))) return false;
        if (role && ROLE_LABELS[u.role] !== role) return false;
        if (status && u.status !== status) return false;
        return true;
    });

    const readers = useMemo(() => ({
        account: (r: Row) => r.u.name,
        role: (r: Row) => roleRank(r.u.role),
        scenario: (r: Row) => r.t.scenario,
        check: (r: Row) => r.t.menus,
        status: (r: Row) => STATUSES.indexOf(r.u.status),
    }), []);
    const { sort, onSort, sorted } = useTableSort<TCol, Row>(shown, readers, null);

    const groupOf = (r: Row): { rank: number; label: string } | null =>
        groupBy === "role" ? { rank: roleRank(r.u.role), label: ROLE_LABELS[r.u.role] }
            : groupBy === "status" ? { rank: STATUSES.indexOf(r.u.status), label: r.u.status }
                : null;
    const grouped = groupBy === "none" ? sorted : sorted
        .map((r, i) => ({ r, i, g: groupOf(r)! }))
        .sort((x, y) => x.g.rank - y.g.rank || x.i - y.i)
        .map((x) => x.r);
    const groupCounts = new Map<string, number>();
    if (groupBy !== "none") grouped.forEach((r) => { const l = groupOf(r)!.label; groupCounts.set(l, (groupCounts.get(l) ?? 0) + 1); });

    const pages = Math.max(1, Math.ceil(grouped.length / pageSize));
    const safePage = Math.min(page, pages);
    const slice = grouped.slice((safePage - 1) * pageSize, safePage * pageSize);

    const show = (c: TCol) => visible.has(c);
    const colCount = T_COLS.filter((c) => c.locked || visible.has(c.id)).length + 1;
    const filterCount = [!!role, !!status, groupBy !== "none"].filter(Boolean).length;
    const touched = filterCount > 0 || !!q;
    const reset = () => { setQuery(""); setRole(""); setStatus(""); setGroupBy("none"); setPage(1); };
    const toPage1 = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

    // Opening is the row's click; switching seats is a deliberate second choice in the menu.
    const menu = (u: AppUser): KebabItem[] => {
        const items: KebabItem[] = [{
            label: "Open in Users & Roles", icon: ExternalLink,
            onClick: () => {
                // Their own carrier and profile first, so the page that opens is about them.
                const carrier = u.accountId ? getAccountById(u.accountId) : undefined;
                if (carrier) onSelectAccount?.(carrier);
                if (u.serviceProfileId) onSelectServiceProfile?.(u.serviceProfileId);
                onNavigate(isDriverUser(u) || u.role === "super-admin" || u.role === "admin" ? "/service-profile/users-roles" : "/settings/users-roles");
            },
        }];
        if (onSwitchUser && u.id !== me.id && u.status !== "Inactive") items.push({ label: "Sign in as this account", icon: LogIn, onClick: () => onSwitchUser(u) });
        return items;
    };

    return (
        <ListScrollFrame
            title="Test account list" count={grouped.length} total={rows.length}
            description="One login per access shape — click a row to open it in Users & Roles."
            actions={<ColumnPicker columns={T_COLS} visible={visible}
                        onToggle={(id) => setVisible((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })} />}
            above={<>
                {above}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
                    <KeyRound className="h-4 w-4 text-amber-600" />
                    <span>Every account signs in with the demo password <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-[12px] text-amber-900">{DEMO_PASSWORD}</code>. The list is <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-[12px] text-amber-900">src/data/role-test-users.data.ts</code> — what each login should see is written there and shown here.</span>
                </div>
            </>}
            scrollRef={scrollRef}
            onScroll={onScroll}
            contentKey={`${filtersOpen}|${slice.length}`}
            toolbar={
                <ListToolbar search={query} onSearch={toPage1(setQuery)} placeholder="Search name, scenario, what to check…"
                    filters={<div className={mobileFold(filtersOpen)}>
                        <FilterSelect value={role} onChange={toPage1(setRole)} title="Role" allLabel="All roles" options={ROLE_ORDER.map((r) => ROLE_LABELS[r])} />
                        <FilterSelect value={status} onChange={toPage1(setStatus)} title="Status" allLabel="All statuses" options={STATUSES} />
                    </div>}
                    filtersExtra={<>
                        <FiltersToggle open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)} count={filterCount} />
                        <div className={mobileFold(filtersOpen)}>
                            <GroupBySelect value={groupBy} onChange={toPage1(setGroupBy)} options={T_GROUPS} />
                            <ResetFilters on={touched} onReset={reset} />
                        </div>
                    </>} />
            }
            footer={<TablePager page={safePage} pageSize={pageSize} total={grouped.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />}
        >
            <table className="w-full">
                <thead>
                    <tr>
                        <SortTh col="account" label="Account" sortable sort={sort} onSort={onSort} className={PIN_TH} />
                        {show("role") && <SortTh col="role" label="Role" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("scenario") && <SortTh col="scenario" label="Scenario" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("check") && <SortTh col="check" label="What to check" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("status") && <SortTh col="status" label="Status" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        <SortTh label="Actions" sort={sort} className={PIN_TH_ACTIONS} />
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {slice.length === 0 && (
                        <tr>
                            <td colSpan={colCount} className="px-6 py-14 text-center">
                                <UsersIcon className="mx-auto h-7 w-7 text-slate-300" />
                                <p className="mt-3 text-sm font-semibold text-slate-700">No test account matches</p>
                                <p className="mt-1 text-xs text-slate-500">Try another role or search.</p>
                                {touched && (
                                    <button type="button" onClick={reset}
                                        className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                                        Clear filters
                                    </button>
                                )}
                            </td>
                        </tr>
                    )}
                    {slice.map((r, i) => {
                        const { t, u } = r;
                        const g = groupOf(r);
                        const prev = i === 0 || !g ? null : groupOf(slice[i - 1]);
                        const items = menu(u);
                        const extra = [...new Set(Object.values(u.carrierRoles ?? {}))].filter((x) => x !== u.role).length;
                        return (
                            <Fragment key={t.userId}>
                                {g && (!prev || prev.label !== g.label) && (
                                    <TableGroupBand label={g.label} count={groupCounts.get(g.label) ?? 0} colSpan={colCount} />
                                )}
                                <tr className="group cursor-pointer transition-colors hover:bg-slate-50" onClick={() => items[0]?.onClick()}>
                                    <TD>
                                        <div className="flex items-center gap-2.5" title={`${u.name} · ${u.email}`}>
                                            <Avatar u={u} size="sm" />
                                            <span className="font-semibold text-slate-900">{u.name}</span>
                                            {u.id === me.id && <span className="rounded-full bg-blue-50 px-1.5 text-[10px] font-bold text-blue-700">You</span>}
                                            <span className="text-xs text-slate-500">· {u.email}</span>
                                        </div>
                                    </TD>
                                    {show("role") && (
                                        <TD>
                                            <span className="flex items-center gap-1">
                                                <RoleBadge role={u.role} />
                                                {extra > 0 && <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500" title="A different role on another carrier">+{extra}</span>}
                                            </span>
                                        </TD>
                                    )}
                                    {show("scenario") && (
                                        <TD className="max-w-[22rem] truncate" title={`${t.scenario}\n${t.where}`}>
                                            <span className="font-medium text-slate-800">{t.scenario}</span>
                                            <span className="ml-1.5 text-[12px] text-slate-500">· {t.where}</span>
                                        </TD>
                                    )}
                                    {show("check") && (
                                        <TD className="max-w-[22rem] truncate text-[13px] text-slate-600" title={`Menus: ${t.menus}\n\nData: ${t.data}\n\nAlerts: ${t.alerts}`}>{t.menus}</TD>
                                    )}
                                    {show("status") && <TD><StatusDot status={u.status} /></TD>}
                                    <TD className={PIN_TD_ACTIONS} onClick={(e) => e.stopPropagation()}>
                                        <KebabMenu title={`Actions for ${u.name}`} items={items} />
                                    </TD>
                                </tr>
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </ListScrollFrame>
    );
}
