import React, { Fragment, useMemo, useState } from "react";
import { Briefcase, Crown, Download, ExternalLink, Eye, History, Lock, Share2, ShieldCheck, Truck, Users as UsersIcon, CalendarDays, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ListPageHeader } from "@/components/ui/ListPageHeader";
import { ListScrollFrame } from "@/components/ui/ListScrollFrame";
import { KpiStatRow, type KpiStat } from "@/components/ui/KpiStatCard";
import { ListHeaderBridge, chipsFromStats, useHeaderChips } from "@/components/ui/list-header-bridge";
import { usePageChrome } from "@/components/ui/PageChrome";
import {
    ColumnPicker, FilterSelect, FiltersToggle, GroupBySelect, ListToolbar, ResetFilters, SortTh, TableGroupBand, TablePager,
    useTableSort, type PickerColumn,
} from "@/components/ui/ListChrome";
import { PIN_TD_ACTIONS, PIN_TH, PIN_TH_ACTIONS, mobileFold } from "@/components/ui/list-chrome";
import { RowActions } from "@/components/ui/RowActions";
import { ShareToChat } from "@/components/share/ShareToChat";
import { ServiceProfileSwitcher } from "@/components/layout/ServiceProfileSwitcher";
import { activityMeta } from "@/components/ui/activity-kinds";
import { ROLE_LABELS, findUserById, type AppUser } from "@/data/users.data";
import { ACCOUNTS_DB, getAccountById, type AccountRecord } from "@/pages/accounts/accounts.data";
import { RoleBadge, Avatar } from "@/pages/users-roles/pieces";
import { profilesFor, profilesOfUser } from "@/pages/users-roles/scope";
import { gradientFor } from "@/pages/users-roles/scope";
import {
    AUDIT_CATEGORIES, AUDIT_CATEGORY_META, auditCarrierName, useAuditEvents, type AuditCategory, type AuditEvent, type AuditScope,
} from "@/data/audit-log.data";

// ─────────────────────────────────────────────────────────────────────────────
// Audit Log — the same page at three levels of the hierarchy.
//
//   Admin ▸ Audit Log            one carrier: what its team and the Admins above did on it
//   Service Profile ▸ Audit Log  every carrier under the profile, plus the profile's own events
//   Super Admin ▸ Audit Log      the platform: everything, plus what only a Super Admin does
//
// Same list, same tabs (one per category), same filters; the scope decides which events are
// in and whether the Carrier column is shown.
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "all" | AuditCategory;
type Range = "Today" | "Last 7 days" | "Last 30 days" | "All time";
const RANGES: Range[] = ["Today", "Last 7 days", "Last 30 days", "All time"];
const rangeStart = (r: Range): number => {
    const d = new Date();
    if (r === "Today") { d.setHours(0, 0, 0, 0); return d.getTime(); }
    if (r === "Last 7 days") return Date.now() - 7 * 86_400_000;
    if (r === "Last 30 days") return Date.now() - 30 * 86_400_000;
    return 0;
};

const fmtWhen = (iso: string): string => {
    const d = new Date(iso);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const day = new Date(d); day.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    if (diff === 0) return `Today · ${time}`;
    if (diff === 1) return `Yesterday · ${time}`;
    return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${time}`;
};
const dayLabel = (iso: string): string => {
    const d = new Date(iso);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const day = new Date(d); day.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
    return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

export function AuditLogPage({ scope: scopeKind, currentUser, accountId, serviceProfileId, onSelectServiceProfile, onNavigate, onSelectAccount }: {
    scope: "carrier" | "profile" | "platform";
    currentUser: AppUser | null;
    accountId?: string;
    serviceProfileId?: string;
    onSelectServiceProfile?: (id: string) => void;
    onNavigate: (path: string) => void;
    onSelectAccount?: (account: AccountRecord) => void;
}) {
    const [tab, setTab] = useState<Tab>("all");
    const { scrollRef, onScroll, condensed, bridge } = usePageChrome(tab);
    // The profile view can switch profiles, like Users & Roles.
    const profiles = profilesFor(currentUser);
    const [spId, setSpId] = useState<string | undefined>(() => {
        if (serviceProfileId && profiles.some((p) => p.id === serviceProfileId)) return serviceProfileId;
        return (currentUser && profilesOfUser(currentUser)[0]) || profiles[0]?.id;
    });
    const sp = profiles.find((p) => p.id === spId) ?? profiles[0];
    const account = accountId ? getAccountById(accountId) : undefined;

    const scope: AuditScope | null = scopeKind === "carrier" ? (accountId ? { kind: "carrier", accountId } : null)
        : scopeKind === "profile" ? (sp ? { kind: "profile", serviceProfileId: sp.id } : null)
            : { kind: "platform" };
    const events = useAuditEvents(scope ?? { kind: "platform" });

    if (!scope) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
                <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <History size={28} className="mx-auto mb-3 text-slate-400" />
                    <h2 className="mb-1 text-lg font-bold text-slate-900">{scopeKind === "carrier" ? "No carrier selected" : "No service profile"}</h2>
                    <p className="text-sm text-slate-500">{scopeKind === "carrier" ? "Pick a carrier in the top bar to see its log." : "You're not part of a service profile yet."}</p>
                </div>
            </div>
        );
    }

    const where = scopeKind === "carrier" ? (account?.dbaName || account?.legalName || "this carrier")
        : scopeKind === "profile" ? (sp?.dbaName || sp?.legalName || "the service profile") : "TrackSmart";
    const description = scopeKind === "carrier"
        ? <>Everything done on <span className="font-semibold text-slate-700">{where}</span> — by its team, and by the Admins above it.</>
        : scopeKind === "profile"
            ? <>Everything done on every carrier under <span className="font-semibold text-slate-700">{where}</span>, and on the profile itself.</>
            : <>Everything done anywhere on the platform — every service profile, every carrier, and what only a Super Admin does.</>;
    const tabCount = (t: Tab) => (t === "all" ? events.length : events.filter((e) => e.category === t).length);
    const shown = tab === "all" ? events : events.filter((e) => e.category === tab);

    const role = currentUser?.role;
    const tone = role === "super-admin" ? "border-violet-200 bg-violet-50 text-violet-800" : "border-blue-200 bg-blue-50 text-blue-800";
    const Icon = role === "super-admin" ? Crown : role === "admin" ? ShieldCheck : Lock;
    const strip = (
        <div className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-lg border px-3.5 py-2 text-[13px]", tone)}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">
                {scopeKind === "platform" ? <>The <b>platform</b> log — the view above every service profile.</>
                    : scopeKind === "profile" ? <>The <b>service profile</b> log — {sp ? (ACCOUNTS_COUNT(sp.id)) : 0} carriers roll up into it.</>
                        : <>The <b>carrier</b> log for <b>{where}</b>. The service profile's log above it shows every carrier at once.</>}
            </span>
            {scopeKind === "profile" && sp && profiles.length > 1 && (
                <span className="shrink-0">
                    <ServiceProfileSwitcher selectedProfileId={sp.id} profiles={profiles} onSelect={(id) => { setSpId(id); onSelectServiceProfile?.(id); }}
                        scopeLabel={role === "super-admin" ? `Super Admin · All ${profiles.length} profiles` : `${profiles.length} profiles`} />
                </span>
            )}
        </div>
    );

    const exportCsv = () => {
        const rows = [["When", "Who", "Role", "Category", "Action", "Detail", "Record", "Carrier"],
            ...shown.map((e) => [e.at, e.actorName, e.actorRole, e.category, e.title, e.detail ?? "", e.record?.label ?? "", auditCarrierName(e)])];
        const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a"); a.href = url; a.download = `audit-log-${scopeKind}.csv`; a.click(); URL.revokeObjectURL(url);
    };

    return (
        <ListHeaderBridge value={bridge.value}>
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <ListPageHeader
                Icon={History}
                title="Audit Log"
                description={description}
                count={events.length}
                countTitle={`${events.length} events`}
                condensed={condensed}
                chips={bridge.chips ?? undefined}
                tabs={[
                    { id: "all", label: "All activity", icon: Activity, count: tabCount("all") },
                    ...AUDIT_CATEGORIES.map((c) => ({ id: c, label: AUDIT_CATEGORY_META[c].label, count: tabCount(c) })),
                ]}
                activeTab={tab}
                onTabChange={(id) => setTab(id as Tab)}
                tabsLabel="Audit categories"
                showZeroCounts
                actions={
                    <Button variant="outline" className={cn("gap-1.5", condensed ? "h-8" : "h-9")} onClick={exportCsv}>
                        <Download className="h-4 w-4" /> Export CSV
                    </Button>
                }
            />
            <AuditList key={`${scopeKind}:${tab}:${scope.kind === "carrier" ? scope.accountId : scope.kind === "profile" ? scope.serviceProfileId : "p"}`}
                events={shown} total={events.length} scopeKind={scopeKind} tabLabel={tab === "all" ? "All activity" : AUDIT_CATEGORY_META[tab].label}
                above={strip} scrollRef={scrollRef} onScroll={onScroll}
                onOpenRecord={(e) => { const c = e.accountId ? getAccountById(e.accountId) : undefined; if (c) onSelectAccount?.(c); if (e.record?.path) onNavigate(e.record.path); }} />
        </div>
        </ListHeaderBridge>
    );
}

/** How many carriers roll up into a service profile's log. */
const ACCOUNTS_COUNT = (spId: string): number => ACCOUNTS_DB.filter((a) => a.serviceProfileId === spId).length;

// ── The list ───────────────────────────────────────────────────────────────

type Col = "when" | "who" | "what" | "record" | "carrier" | "category";
const COLUMNS: PickerColumn<Col>[] = [
    { id: "when", label: "When", locked: true },
    { id: "who", label: "Who" },
    { id: "what", label: "What", locked: true },
    { id: "record", label: "Record" },
    { id: "carrier", label: "Carrier" },
    { id: "category", label: "Category" },
];
type GroupBy = "none" | "day" | "who" | "category" | "carrier";
const GROUPS: { id: GroupBy; label: string }[] = [
    { id: "none", label: "No grouping" },
    { id: "day", label: "Group: Day" },
    { id: "who", label: "Group: Person" },
    { id: "category", label: "Group: Category" },
    { id: "carrier", label: "Group: Carrier" },
];

const TD = ({ children, className, title }: { children?: React.ReactNode; className?: string; title?: string }) => (
    <td title={title} className={cn("px-4 py-2.5 text-sm align-middle whitespace-nowrap", className)}>{children}</td>
);

function ActorCell({ e }: { e: AuditEvent }) {
    const u = e.actorId ? findUserById(e.actorId) : undefined;
    return (
        <span className="inline-flex items-center gap-2">
            {u ? <Avatar u={u} size="sm" /> : (
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-bold text-white", e.actorRole === "system" ? "from-slate-400 to-slate-600" : gradientFor(e.actorName))}>
                    {e.actorName.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                </span>
            )}
            <span className="font-semibold text-slate-900">{e.actorName}</span>
            {e.actorRole !== "system" && <RoleBadge role={e.actorRole} />}
        </span>
    );
}

function AuditList({ events, total, scopeKind, tabLabel, above, scrollRef, onScroll, onOpenRecord }: {
    events: AuditEvent[];
    total: number;
    scopeKind: "carrier" | "profile" | "platform";
    tabLabel: string;
    above?: React.ReactNode;
    scrollRef?: React.Ref<HTMLDivElement>;
    onScroll?: React.UIEventHandler<HTMLDivElement>;
    onOpenRecord: (e: AuditEvent) => void;
}) {
    const [search, setSearch] = useState("");
    const [range, setRange] = useState<Range>("Last 30 days");
    const [who, setWho] = useState("");
    const [carrier, setCarrier] = useState("");
    const [kind, setKind] = useState("");
    const [groupBy, setGroupBy] = useState<GroupBy>("none");
    const [visible, setVisible] = useState<Set<Col>>(() => new Set(COLUMNS.map((c) => c.id)));
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [viewing, setViewing] = useState<AuditEvent | null>(null);
    const [sharing, setSharing] = useState<AuditEvent | null>(null);

    const inRange = events.filter((e) => new Date(e.at).getTime() >= rangeStart(range));
    const todayStart = rangeStart("Today");
    const actors = useMemo(() => [...new Set(events.map((e) => e.actorName))].sort(), [events]);
    const carriers = useMemo(() => [...new Set(events.map(auditCarrierName))].sort(), [events]);
    const kinds = useMemo(() => [...new Set(events.map((e) => activityMeta(e.kind).label))].sort(), [events]);

    const stats: KpiStat[] = [
        { id: "range", label: range === "All time" ? "Events" : `Events · ${range.toLowerCase()}`, value: inRange.length, Icon: History, accent: "blue" },
        { id: "today", label: "Today", value: events.filter((e) => new Date(e.at).getTime() >= todayStart).length, Icon: CalendarDays, accent: "emerald" },
        { id: "people", label: "People", value: new Set(inRange.map((e) => e.actorName)).size, Icon: UsersIcon, accent: "violet" },
        ...(scopeKind === "carrier"
            ? [{ id: "records", label: "Records touched", value: new Set(inRange.map((e) => e.record?.label).filter(Boolean)).size, Icon: Eye, accent: "amber" } as KpiStat]
            : [{ id: "carriers", label: scopeKind === "profile" ? "Carriers" : "Carriers & profiles", value: new Set(inRange.map(auditCarrierName)).size, Icon: Truck, accent: "amber" } as KpiStat]),
    ];
    const pickKpi = (id: string) => { setPage(1); if (id === "today") setRange((r) => (r === "Today" ? "Last 30 days" : "Today")); };
    useHeaderChips(chipsFromStats(stats, range === "Today" ? "today" : "range", pickKpi));

    const q = search.trim().toLowerCase();
    const rows = inRange.filter((e) => {
        if (who && e.actorName !== who) return false;
        if (carrier && auditCarrierName(e) !== carrier) return false;
        if (kind && activityMeta(e.kind).label !== kind) return false;
        return !q || [e.title, e.detail, e.actorName, e.record?.label, e.record?.type, auditCarrierName(e)].some((x) => x?.toLowerCase().includes(q));
    });
    const readers = useMemo(() => ({
        when: (e: AuditEvent) => e.at,
        who: (e: AuditEvent) => e.actorName,
        what: (e: AuditEvent) => e.title,
        record: (e: AuditEvent) => e.record?.label ?? "",
        carrier: (e: AuditEvent) => auditCarrierName(e),
        category: (e: AuditEvent) => AUDIT_CATEGORIES.indexOf(e.category),
    }), []);
    const { sort, onSort, sorted } = useTableSort<Col, AuditEvent>(rows, readers, { col: "when", dir: "desc" });
    const groupOf = (e: AuditEvent): { rank: string | number; label: string } | null =>
        groupBy === "day" ? { rank: -new Date(e.at).setHours(0, 0, 0, 0), label: dayLabel(e.at) }
            : groupBy === "who" ? { rank: e.actorName, label: e.actorName }
                : groupBy === "category" ? { rank: AUDIT_CATEGORIES.indexOf(e.category), label: AUDIT_CATEGORY_META[e.category].label }
                    : groupBy === "carrier" ? { rank: auditCarrierName(e), label: auditCarrierName(e) }
                        : null;
    const grouped = groupBy === "none" ? sorted : sorted
        .map((e, i) => ({ e, i, g: groupOf(e)! }))
        .sort((x, y) => (typeof x.g.rank === "number" && typeof y.g.rank === "number" ? x.g.rank - y.g.rank : String(x.g.rank).localeCompare(String(y.g.rank))) || x.i - y.i)
        .map((x) => x.e);
    const groupCounts = new Map<string, number>();
    if (groupBy !== "none") grouped.forEach((e) => { const l = groupOf(e)!.label; groupCounts.set(l, (groupCounts.get(l) ?? 0) + 1); });

    const pages = Math.max(1, Math.ceil(grouped.length / pageSize));
    const safePage = Math.min(page, pages);
    const slice = grouped.slice((safePage - 1) * pageSize, safePage * pageSize);
    const show = (c: Col) => visible.has(c) && (c !== "carrier" || scopeKind !== "carrier");
    const colCount = COLUMNS.filter((c) => c.locked || show(c.id)).length + 1;
    const filterCount = [range !== "Last 30 days", !!who, !!carrier, !!kind, groupBy !== "none"].filter(Boolean).length;
    const touched = filterCount > 0 || !!q;
    const reset = () => { setSearch(""); setRange("Last 30 days"); setWho(""); setCarrier(""); setKind(""); setGroupBy("none"); setPage(1); };
    const toPage1 = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };
    const columns = scopeKind === "carrier" ? COLUMNS.filter((c) => c.id !== "carrier") : COLUMNS;

    return (
        <>
        <ListScrollFrame
            above={<>
                {above}
                <KpiStatRow stats={stats} activeId={range === "Today" ? "today" : "range"} onPick={pickKpi} />
            </>}
            title={tabLabel}
            count={grouped.length}
            total={total}
            description="Newest first. Click a row for the full entry; the ⋮ opens the record it was done to."
            actions={<ColumnPicker columns={columns} visible={visible}
                onToggle={(id) => setVisible((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })} />}
            scrollRef={scrollRef}
            onScroll={onScroll}
            contentKey={`${filtersOpen}|${slice.length}`}
            toolbar={
                <ListToolbar search={search} onSearch={toPage1(setSearch)} placeholder="Search what, who, record…"
                    filters={<div className={mobileFold(filtersOpen)}>
                        <FilterSelect value={range} onChange={toPage1((v: string) => setRange((v || "All time") as Range))} title="When" allLabel="All time" options={RANGES.filter((r) => r !== "All time")} />
                        <FilterSelect value={who} onChange={toPage1(setWho)} title="Who" allLabel="Everyone" options={actors} />
                        <FilterSelect value={kind} onChange={toPage1(setKind)} title="Action" allLabel="Any action" options={kinds} />
                        {scopeKind !== "carrier" && <FilterSelect value={carrier} onChange={toPage1(setCarrier)} title="Carrier" allLabel="All carriers" options={carriers} />}
                    </div>}
                    filtersExtra={<>
                        <FiltersToggle open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)} count={filterCount} />
                        <div className={mobileFold(filtersOpen)}>
                            <GroupBySelect value={groupBy} onChange={toPage1(setGroupBy)} options={scopeKind === "carrier" ? GROUPS.filter((g) => g.id !== "carrier") : GROUPS} />
                            <ResetFilters on={touched} onReset={reset} />
                        </div>
                    </>} />
            }
            footer={<TablePager page={safePage} pageSize={pageSize} total={grouped.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />}
        >
            <table className="w-full">
                <thead>
                    <tr>
                        <SortTh col="when" label="When" sortable sort={sort} onSort={onSort} className={PIN_TH} />
                        {show("who") && <SortTh col="who" label="Who" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        <SortTh col="what" label="What" sortable sort={sort} onSort={onSort} className={PIN_TH} />
                        {show("record") && <SortTh col="record" label="Record" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("carrier") && <SortTh col="carrier" label="Carrier" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("category") && <SortTh col="category" label="Category" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        <SortTh label="Actions" sort={sort} className={PIN_TH_ACTIONS} />
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {slice.length === 0 && (
                        <tr>
                            <td colSpan={colCount} className="px-6 py-14 text-center">
                                <History className="mx-auto h-7 w-7 text-slate-300" />
                                <p className="mt-3 text-sm font-semibold text-slate-700">{total ? "Nothing matches" : "Nothing logged yet"}</p>
                                <p className="mt-1 text-xs text-slate-500">{total ? "Try a wider date range, another person or category." : "Actions taken in the app will show up here."}</p>
                                {touched && <button type="button" onClick={reset} className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Clear filters</button>}
                            </td>
                        </tr>
                    )}
                    {slice.map((e, i) => {
                        const g = groupOf(e);
                        const prev = i === 0 || !g ? null : groupOf(slice[i - 1]);
                        const meta = activityMeta(e.kind);
                        const KIcon = meta.icon;
                        return (
                            <Fragment key={e.id}>
                                {g && (!prev || prev.label !== g.label) && <TableGroupBand label={g.label} count={groupCounts.get(g.label) ?? 0} colSpan={colCount} />}
                                <tr className="group cursor-pointer transition-colors hover:bg-slate-50" onClick={() => setViewing(e)}>
                                    <TD className="text-[13px] text-slate-600" title={new Date(e.at).toLocaleString()}>{fmtWhen(e.at)}</TD>
                                    {show("who") && <TD><ActorCell e={e} /></TD>}
                                    <TD className="max-w-[28rem]" title={[e.title, e.detail].filter(Boolean).join(" — ")}>
                                        <span className="inline-flex max-w-full items-center gap-2">
                                            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white", meta.dot)}><KIcon size={12} /></span>
                                            <span className="truncate font-medium text-slate-900">{e.title}</span>
                                            {e.detail && <span className="truncate text-xs text-slate-500">· {e.detail}</span>}
                                        </span>
                                    </TD>
                                    {show("record") && (
                                        <TD>{e.record ? <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-700"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{e.record.type}</span>{e.record.label}</span> : <span className="text-slate-300">—</span>}</TD>
                                    )}
                                    {show("carrier") && <TD className="text-[13px] text-slate-700"><span className="inline-flex items-center gap-1.5">{e.accountId ? <Truck className="h-3.5 w-3.5 text-slate-400" /> : <Briefcase className="h-3.5 w-3.5 text-slate-400" />}{auditCarrierName(e)}</span></TD>}
                                    {show("category") && <TD><span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{AUDIT_CATEGORY_META[e.category].label}</span></TD>}
                                    <td className={cn("px-4 py-2.5", PIN_TD_ACTIONS)} onClick={(ev) => ev.stopPropagation()}>
                                        <RowActions noun="entry" name={e.title} openLabel="View entry" onOpen={() => setViewing(e)} onShare={() => setSharing(e)}
                                            extra={e.record?.path ? [{ label: `Open ${e.record.type.toLowerCase()}`, icon: ExternalLink, onClick: () => onOpenRecord(e) }] : []} />
                                    </td>
                                </tr>
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </ListScrollFrame>

        {viewing && (
            <Dialog open onOpenChange={(o) => { if (!o) setViewing(null); }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2.5">
                            {(() => { const m = activityMeta(viewing.kind); const I = m.icon; return <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-white", m.dot)}><I className="h-4 w-4" /></span>; })()}
                            {activityMeta(viewing.kind).label}
                        </DialogTitle>
                    </DialogHeader>
                    <dl className="divide-y divide-slate-100 text-sm">
                        {[
                            ["What", viewing.title + (viewing.detail ? ` — ${viewing.detail}` : "")],
                            ["When", new Date(viewing.at).toLocaleString()],
                            ["Who", `${viewing.actorName}${viewing.actorRole !== "system" ? ` · ${ROLE_LABELS[viewing.actorRole]}` : ""}`],
                            ["Where", auditCarrierName(viewing)],
                            ["Category", AUDIT_CATEGORY_META[viewing.category].label],
                            ["Record", viewing.record ? `${viewing.record.type} · ${viewing.record.label}` : "—"],
                            ["Source", viewing.seeded ? "Seeded demo history" : "Logged by the app"],
                        ].map(([k, v]) => (
                            <div key={k} className="grid grid-cols-[6rem_1fr] gap-3 py-2">
                                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{k}</dt>
                                <dd className="text-slate-800">{v}</dd>
                            </div>
                        ))}
                    </dl>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setSharing(viewing)}><Share2 className="h-4 w-4" /> Share to chat</Button>
                        {viewing.record?.path && <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => { onOpenRecord(viewing); setViewing(null); }}><ExternalLink className="h-4 w-4" /> Open {viewing.record.type.toLowerCase()}</Button>}
                    </div>
                </DialogContent>
            </Dialog>
        )}
        {sharing && (
            <ShareToChat
                open
                onClose={() => setSharing(null)}
                title="Share audit entry"
                subtitle="One line from the log, in a chat or by email"
                source={{ type: "manual", id: sharing.id, label: sharing.title }}
                items={[
                    { name: sharing.title, group: "Action" },
                    { name: `${sharing.actorName} · ${new Date(sharing.at).toLocaleString()}`, group: "Who / when" },
                    ...(sharing.record ? [{ name: `${sharing.record.type} · ${sharing.record.label}`, group: "Record" }] : []),
                    { name: auditCarrierName(sharing), group: "Where" },
                ]}
                defaultChannel="in-app"
                defaultSubject={`Audit: ${sharing.title}`}
            />
        )}
        </>
    );
}
