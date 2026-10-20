import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UserPlus, Search, Mail, MessageSquare, X, Eye, Send, ChevronRight, ChevronDown, Check, Building2, Layers, Share2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { KpiStatRow } from "@/components/ui/KpiStatCard";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { PaginationBar } from "@/components/ui/DataListToolbar";
import { HEADER_TRANSITION, useScrolledPast } from "@/components/ui/use-condensing-header";
import { ColumnPicker, SortTh, TableGroupBand, useTableSort, type PickerColumn } from "@/components/ui/ListChrome";
import { ShareToChat, type ShareItem } from "@/components/share/ShareToChat";
import { setMessagesFocus } from "@/pages/messages/messages-store";
import { currentUserName } from "@/data/users.data";
import { useHiringTemplates, totalForms, stepGroup, type HiringTemplate } from "./hiring-templates.data";
import { DriverTypePicker } from "./DriverTypePicker";
import { driverTypeLabel, driverTypeMatches } from "./driver-types";
import { useApplicants, ACTOR, DRIVER_TYPES, STATUS_META, STATUS_ORDER, STATUS_REASONS, STATUS_VERB, needsReason, relativeTime, formName, formShort, statusPatch, type AppStatus, type Applicant } from "./applicants.data";

/**
 * Hiring Process -> Applications
 *
 * The application monitoring board: issue a hiring file (invite an applicant
 * against an application form), track each applicant through the pipeline, and
 * change status inline. "View" opens the applicant's filled application.
 */

const HP_PATH = "/hiring-process/applications";

const CARRIERS = ["Acme Logistics", "Northwind Transport", "Blue Ridge Freight"];

// Count consents (policy/signature forms) vs data forms inside a template.
const consentCount = (t: HiringTemplate) => t.steps.reduce((n, s) => n + s.formIds.filter((f) => stepGroup(f) === "Policy").length, 0);
const formCount = (t: HiringTemplate) => totalForms(t) - consentCount(t);

const initials = (a: Applicant) => `${a.firstName[0] ?? ""}${a.lastName[0] ?? ""}`.toUpperCase();

/**
 * The columns, and which of them a reader may turn off.
 *
 * The applicant identifies the row and the menu acts on it, so those two stay. Everything
 * between them is a column somebody's screen has no room for.
 */
type AppCol = "applicant" | "form" | "carrier" | "progress" | "status" | "invited" | "updated" | "actions";
const APP_COLUMNS: PickerColumn<AppCol>[] = [
    { id: "applicant", label: "Applicant", locked: true },
    { id: "form", label: "Driver type" },
    { id: "carrier", label: "Carrier" },
    { id: "progress", label: "Progress" },
    { id: "status", label: "Status" },
    { id: "invited", label: "Invited" },
    { id: "updated", label: "Updated" },
    { id: "actions", label: "Actions", locked: true },
];

/**
 * What the board can be grouped into.
 *
 * The three a hiring manager actually sorts this list by — where each file is up to, which
 * form it was issued against, and (when the switcher is off a single carrier) whose it is.
 * Not a band per applicant: grouping by email would be one row per band.
 */
const APP_GROUPS = [
    { id: "none", label: "No grouping" },
    { id: "status", label: "Status" },
    { id: "form", label: "Driver type" },
    { id: "carrier", label: "Carrier" },
] as const;
type AppGroupBy = (typeof APP_GROUPS)[number]["id"];

const groupOf = (a: Applicant, by: AppGroupBy): string => {
    switch (by) {
        case "status": return STATUS_META[a.status].label;
        case "form": return formShort(a.formId);
        case "carrier": return a.carrier || "No carrier";
        default: return "";
    }
};

/** Which tone each status carries on its KPI card — the badge colour it already has. */
const STATUS_ACCENT: Record<AppStatus, string> = {
    waiting: "amber",
    "in-progress": "blue",
    submitted: "sky",
    "under-review": "violet",
    approved: "emerald",
    rejected: "rose",
};

/** The same rule between columns, and the same row height, as every other list. */
const TH = "px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap border-r border-slate-200/70 last:border-r-0";
const TD = "px-3 py-1.5 text-[13px] align-middle whitespace-nowrap border-r border-slate-100 last:border-r-0";

const pctOf = (a: Applicant) => (a.stepsTotal ? Math.round((a.stepsDone / a.stepsTotal) * 100) : 0);

/** Progress as one line: the bar and the count beside it, never under it. */
function ProgressCell({ a }: { a: Applicant }) {
    return (
        <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100">
                <div className={cn("h-full rounded-full", a.status === "rejected" ? "bg-rose-400" : "bg-blue-600")} style={{ width: `${pctOf(a)}%` }} />
            </div>
            <span className="text-[12px] font-semibold tabular-nums text-slate-500">{a.stepsDone}/{a.stepsTotal}</span>
        </div>
    );
}

export function ApplicationsHiringPage({ onNavigate, carrierId, carrierName }: { onNavigate: (path: string) => void; carrierId?: string; carrierName?: string }) {
    const { applicants, addMany, updateOne } = useApplicants();
    const [filter, setFilter] = useState<AppStatus | "all">("all");
    const [formFilter, setFormFilter] = useState<string>("all");
    const [query, setQuery] = useState("");
    const [groupBy, setGroupBy] = useState<AppGroupBy>("none");
    const [inviteOpen, setInviteOpen] = useState(false);
    /** The applicant whose Share dialog is open. */
    const [sharing, setSharing] = useState<Applicant | null>(null);

    /** The figures fold away on the way down the list — see `useScrolledPast`. */
    const { ref: kpiMark, past: kpiPast } = useScrolledPast();

    const [visibleCols, setVisibleCols] = useState<Set<AppCol>>(() => new Set(APP_COLUMNS.map((c) => c.id)));
    const toggleCol = (id: AppCol) => setVisibleCols((prev) => {
        const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n;
    });
    const showCol = (id: AppCol) => visibleCols.has(id);
    const colCount = APP_COLUMNS.filter((c) => c.locked || visibleCols.has(c.id)).length;

    // Everything on this page is scoped to the carrier selected in the top bar.
    const scoped = useMemo(
        () => (carrierId ? applicants.filter((a) => a.carrierId === carrierId) : applicants),
        [applicants, carrierId],
    );

    const counts = useMemo(() => {
        const c: Record<string, number> = { all: scoped.length };
        for (const s of STATUS_ORDER) c[s] = scoped.filter((a) => a.status === s).length;
        return c;
    }, [scoped]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return scoped.filter((a) => {
            if (filter !== "all" && a.status !== filter) return false;
            if (formFilter !== "all" && formShort(a.formId) !== formFilter) return false;
            if (!q) return true;
            return `${a.firstName} ${a.lastName} ${a.email} ${formShort(a.formId)} ${formName(a.formId)} ${a.carrier}`.toLowerCase().includes(q);
        });
    }, [scoped, filter, formFilter, query]);

    /*
     * What each column sorts by.
     *
     * Status sorts along the pipeline rather than alphabetically: waiting, started,
     * submitted, in review, approved, rejected. Sorted by name instead, "Approved" would
     * lead and "Waiting" trail, which is the opposite of how the board is read.
     */
    const byCol = useTableSort<AppCol, Applicant>(filtered, {
        applicant: (a) => `${a.lastName} ${a.firstName}`.trim() || a.email,
        form: (a) => formShort(a.formId),
        carrier: (a) => a.carrier ?? "",
        progress: (a) => pctOf(a),
        status: (a) => STATUS_ORDER.indexOf(a.status),
        invited: (a) => Date.parse(a.invitedAt) || 0,
        updated: (a) => a.updatedAt,
    }, { col: "updated", dir: "desc" });
    const { sort, onSort } = byCol;

    /** Grouped, then paged — paging first would scatter one band across three pages. */
    const sorted = useMemo(() => {
        if (groupBy === "none") return byCol.sorted;
        return [...byCol.sorted].sort((a, b) => {
            const ga = groupOf(a, groupBy), gb = groupOf(b, groupBy);
            return ga === gb ? b.updatedAt - a.updatedAt : ga.localeCompare(gb);
        });
    }, [byCol.sorted, groupBy]);

    const groupCounts = useMemo(() => {
        const m = new Map<string, number>();
        if (groupBy === "none") return m;
        for (const a of sorted) m.set(groupOf(a, groupBy), (m.get(groupOf(a, groupBy)) ?? 0) + 1);
        return m;
    }, [sorted, groupBy]);

    // Pagination
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    // Any filter change puts you back at the top; page 4 of a two-page list is a blank
    // screen that reads as "no results".
    useEffect(() => { setPage(1); }, [filter, formFilter, query, groupBy, rowsPerPage]);
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
    const pageNow = Math.min(page, totalPages);
    const paged = useMemo(
        () => sorted.slice((pageNow - 1) * rowsPerPage, pageNow * rowsPerPage),
        [sorted, pageNow, rowsPerPage],
    );

    const kpis = useMemo(() => ([
        { id: "all", label: "Total", value: counts.all ?? 0, Icon: Users, accent: "slate" },
        ...STATUS_ORDER.map((s) => ({
            id: s as string, label: STATUS_META[s].label, value: counts[s] ?? 0,
            Icon: STATUS_META[s].Icon, accent: STATUS_ACCENT[s],
        })),
    ]), [counts]);

    /** One row's menu — the same actions wherever the row is drawn. */
    const rowActions = (a: Applicant) => [
        { label: "View application", icon: Eye, onClick: () => onNavigate(`${HP_PATH}/${a.id}`) },
        { label: "Share to chat", icon: Share2, onClick: () => setSharing(a) },
    ];

    /** What travels with a shared file: the documents the applicant actually supplied. */
    const shareItems = (a: Applicant): ShareItem[] =>
        (a.uploads ?? []).filter((u) => !u.missing).map((u) => ({ name: u.file, group: u.category }));

    const anyFilter = filter !== "all" || formFilter !== "all" || !!query.trim();
    const clear = () => { setFilter("all"); setFormFilter("all"); setQuery(""); };
    const open = (id: string) => onNavigate(`${HP_PATH}/${id}`);

    return (
        <div className="min-h-screen bg-slate-50">
            {/*
                The mark the fold is measured from, and it has to sit ABOVE the header.

                Below it, the measurement feeds on its own result: the header condenses, the
                72px it gives back lifts the mark by 72, and 72 still clears the 48px it
                takes to STAY folded — so scrolling back to the top left the page pinned in
                its condensed state with nothing scrolled. Measured: band 53px, figures 0px,
                at scrollTop 0.

                Up here nothing between the mark and the top of the content can change
                height, so travel is the scroll position and nothing else.
            */}
            <div ref={kpiMark} aria-hidden className="h-0" />
            {/*
                The header stays put, and gives most of itself back on the way down.
                
                Sticky alone would pin a 112px band over a list whose rows are 41 — a third
                of the screen spent on a title you have already read. So it condenses on the
                same signal the figures fold on: the eyebrow and the strapline go, the title
                drops to the size of a toolbar label, and what is left is the one line that
                still earns a pin — where you are, and the button that adds to it.

                Above the KPI row's z-index and the table's pinned column, because a sticky
                band that rows slide UNDER is a band; one they slide over is a bug.
            */}
            <div className={cn("sticky top-0 z-30 border-b border-slate-200 bg-white", HEADER_TRANSITION)}>
                <div className={cn("flex flex-col gap-4 px-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-8", HEADER_TRANSITION,
                    kpiPast ? "gap-2 py-2.5" : "py-6")}>
                    <div className="min-w-0">
                        <p className={cn("overflow-hidden text-xs font-semibold uppercase tracking-wide text-blue-600", HEADER_TRANSITION,
                            kpiPast ? "max-h-0 opacity-0" : "max-h-5 opacity-100")}>Application Tracking System</p>
                        <h1 className={cn("truncate font-semibold text-slate-900", HEADER_TRANSITION,
                            kpiPast ? "text-lg" : "mt-1 text-2xl")}>Applications</h1>
                        <p className={cn("overflow-hidden text-sm text-slate-500", HEADER_TRANSITION,
                            kpiPast ? "max-h-0 opacity-0" : "mt-1 max-h-6 opacity-100")}>Issue hiring files and monitor every applicant through the pipeline.</p>
                    </div>
                    <Button className={cn(HEADER_TRANSITION, kpiPast && "h-8")} onClick={() => setInviteOpen(true)}>
                        <UserPlus className="h-4 w-4" /> <span className="hidden sm:inline">Invite new applicant</span><span className="sm:hidden">Invite</span>
                    </Button>
                </div>
            </div>

            <div className="px-4 py-6 sm:px-6 lg:px-8">
                {/* Every state a file can be in, and each one is the filter for itself.
                    Through the shared row, so the cards sit in containers and size
                    themselves from this column rather than from the window. */}
                <KpiStatRow
                    condensed={kpiPast}
                    stats={kpis}
                    activeId={filter}
                    onPick={(id) => setFilter((f) => (f === id ? "all" : (id as AppStatus | "all")))}
                />

                {/* Table card */}
                <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    {/* Toolbar. It wraps rather than scrolls: on a phone this becomes two
                        rows of controls, all of them reachable. */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-3 sm:px-4">
                        <div className="relative min-w-[180px] flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, driver type…" className="h-9 pl-9" />
                        </div>
                        <select
                            value={formFilter}
                            onChange={(e) => setFormFilter(e.target.value)}
                            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] font-medium text-slate-600"
                        >
                            <option value="all">All driver types</option>
                            {DRIVER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        {/* Group by sits beside the filters rather than inside a menu: it is
                            the control that changes how the list READS. */}
                        <label className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white pl-2.5 pr-1 text-[13px] font-medium text-slate-600">
                            <Layers size={14} className="text-slate-400" />
                            <span className="hidden text-slate-400 sm:inline">Group by</span>
                            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as AppGroupBy)}
                                className="h-8 rounded-md border-0 bg-transparent pr-1 text-[13px] font-semibold text-slate-700 outline-none">
                                {APP_GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                            </select>
                        </label>
                        <ColumnPicker columns={APP_COLUMNS} visible={visibleCols} onToggle={toggleCol} />
                        {anyFilter && (
                            <button type="button" onClick={clear}
                                className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-[13px] font-semibold text-slate-500 hover:text-slate-700">
                                <X className="h-3.5 w-3.5" /> Clear
                            </button>
                        )}
                        <span className="ml-auto text-[12px] text-slate-500">{total} of {scoped.length}</span>
                    </div>

                    {/* ── Desk: the table ── */}
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[760px]">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <SortTh col="applicant" label="Applicant" sortable sort={sort} onSort={onSort} className={TH} />
                                    {showCol("form") && <SortTh col="form" label="Driver type" sortable sort={sort} onSort={onSort} className={TH} />}
                                    {showCol("carrier") && <SortTh col="carrier" label="Carrier" sortable sort={sort} onSort={onSort} className={TH} />}
                                    {showCol("progress") && <SortTh col="progress" label="Progress" sortable sort={sort} onSort={onSort} className={TH} />}
                                    {showCol("status") && <SortTh col="status" label="Status" sortable sort={sort} onSort={onSort} className={TH} />}
                                    {showCol("invited") && <SortTh col="invited" label="Invited" sortable sort={sort} onSort={onSort} className={TH} />}
                                    {showCol("updated") && <SortTh col="updated" label="Updated" sortable sort={sort} onSort={onSort} className={TH} />}
                                    <th className={cn(TH, "sticky right-0 z-20 w-[72px] border-l border-slate-200 bg-slate-50 pl-4 pr-4 text-right")}>Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paged.flatMap((a, idx) => {
                                    const band = groupBy === "none" ? null : groupOf(a, groupBy);
                                    const prev = idx === 0 || groupBy === "none" ? null : groupOf(paged[idx - 1], groupBy);
                                    const rows = [];
                                    if (band && band !== prev) {
                                        rows.push(<TableGroupBand key={`band-${band}`} label={band} count={groupCounts.get(band) ?? 0} colSpan={colCount} />);
                                    }
                                    rows.push(
                                        <tr key={a.id} onClick={() => open(a.id)}
                                            className="h-9 cursor-pointer transition-colors hover:bg-blue-50/40">
                                            {/* Name and email on ONE line: a second line here is what made
                                                every row on this board two rows tall. */}
                                            <td className={cn(TD, "max-w-[260px]")} title={a.email}>
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-[10px] font-bold text-white">{initials(a)}</span>
                                                    <span className="truncate font-semibold text-slate-800">{a.firstName} {a.lastName}</span>
                                                </div>
                                            </td>
                                            {showCol("form") && (
                                                <td className={cn(TD, "text-slate-700")}>{formShort(a.formId)}</td>
                                            )}
                                            {showCol("carrier") && (
                                                <td className={cn(TD, "text-slate-600")}>{a.carrier}</td>
                                            )}
                                            {showCol("progress") && (
                                                <td className={TD}><ProgressCell a={a} /></td>
                                            )}
                                            {/* The row opens on click; the status menu must not. */}
                                            {showCol("status") && (
                                                <td className={TD} onClick={(e) => e.stopPropagation()}>
                                                    <StatusSelect
                                                        value={a.status}
                                                        subject={`${a.firstName} ${a.lastName}`}
                                                        onChange={(s, reason) => updateOne(a.id, (prev) => statusPatch(prev, s, reason))}
                                                    />
                                                </td>
                                            )}
                                            {showCol("invited") && (
                                                <td className={cn(TD, "text-slate-600")}>{a.invitedAt}</td>
                                            )}
                                            {showCol("updated") && (
                                                <td className={cn(TD, "text-slate-600")}>
                                                    <span className="font-semibold text-slate-700">{STATUS_VERB[a.status]}</span>
                                                    <span className="ml-2 text-[12px] text-slate-400">{relativeTime(a.updatedAt)}</span>
                                                </td>
                                            )}
                                            <td className={cn(TD, "sticky right-0 z-10 w-[72px] border-l border-slate-200 bg-white pl-4 pr-4")} onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end">
                                                    <KebabMenu items={rowActions(a)} title={`Actions for ${a.firstName} ${a.lastName}`} />
                                                </div>
                                            </td>
                                        </tr>,
                                    );
                                    return rows;
                                })}
                                {paged.length === 0 && (
                                    <tr>
                                        <td colSpan={colCount} className="px-4 py-14 text-center text-sm text-slate-500">
                                            No applicants match this view.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Phone: the same rows as cards ── */}
                    <div className="divide-y divide-slate-100 md:hidden">
                        {paged.map((a, idx) => {
                            const band = groupBy === "none" ? null : groupOf(a, groupBy);
                            const prev = idx === 0 || groupBy === "none" ? null : groupOf(paged[idx - 1], groupBy);
                            return (
                                <div key={a.id}>
                                    {band && band !== prev && (
                                        <div className="flex items-center gap-2 border-y border-slate-200 bg-slate-50 px-4 py-1.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{band}</span>
                                            <span className="text-[10px] font-semibold tabular-nums text-slate-400">{groupCounts.get(band) ?? 0}</span>
                                        </div>
                                    )}
                                    <div className="p-4" onClick={() => open(a.id)}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex min-w-0 items-center gap-2.5">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-xs font-bold text-white">{initials(a)}</span>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-slate-900">{a.firstName} {a.lastName}</p>
                                                    <p className="truncate text-xs text-slate-500">{a.email}</p>
                                                </div>
                                            </div>
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <KebabMenu items={rowActions(a)} title={`Actions for ${a.firstName} ${a.lastName}`} />
                                            </div>
                                        </div>

                                        <div className="mt-3 flex items-center justify-between gap-3">
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <StatusSelect
                                                    value={a.status}
                                                    subject={`${a.firstName} ${a.lastName}`}
                                                    onChange={(s, reason) => updateOne(a.id, (prev) => statusPatch(prev, s, reason))}
                                                />
                                            </div>
                                            <ProgressCell a={a} />
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Driver type</p>
                                                <p className="truncate text-[13px] text-slate-700">{formShort(a.formId)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Carrier</p>
                                                <p className="truncate text-[13px] text-slate-700">{a.carrier}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Invited</p>
                                                <p className="text-[13px] text-slate-700">{a.invitedAt}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Updated</p>
                                                <p className="text-[13px] text-slate-700">{STATUS_VERB[a.status]} · {relativeTime(a.updatedAt)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {paged.length === 0 && (
                            <div className="px-4 py-14 text-center text-sm text-slate-500">No applicants match this view.</div>
                        )}
                    </div>

                    <PaginationBar
                        totalItems={total}
                        currentPage={pageNow}
                        rowsPerPage={rowsPerPage}
                        onPageChange={setPage}
                        onRowsPerPageChange={(r) => { setRowsPerPage(r); setPage(1); }}
                    />
                </div>
            </div>

            {inviteOpen && (
                <InviteModal
                    carrierId={carrierId}
                    carrierName={carrierName}
                    onClose={() => setInviteOpen(false)}
                    onCreate={(created) => { addMany(created); setInviteOpen(false); setFilter("all"); }}
                />
            )}

            {/* Share — the applicant's file plus the documents they supplied. */}
            {sharing && (
                <ShareToChat
                    open
                    onClose={() => setSharing(null)}
                    title={`Share application — ${sharing.firstName} ${sharing.lastName}`}
                    subtitle="Send the hiring file and its documents in a chat, or to an outsider by email"
                    source={{ type: "manual", id: sharing.id, label: `Application ${sharing.firstName} ${sharing.lastName}` }}
                    items={shareItems(sharing)}
                    record={{
                        type: "applicant",
                        id: sharing.id,
                        label: `${sharing.firstName} ${sharing.lastName}`,
                        sublabel: [formName(sharing.formId), sharing.carrier, STATUS_META[sharing.status].label].filter(Boolean).join(" · "),
                        path: HP_PATH,
                    }}
                    defaultChannel="in-app"
                    defaultSubject={`Application — ${sharing.firstName} ${sharing.lastName}`}
                    currentUserName={currentUserName()}
                    onOpenInMessages={(id) => { setMessagesFocus(id); onNavigate("/messages"); }}
                />
            )}
        </div>
    );
}

/**
 * The status chip, and the question two of the statuses have to answer first.
 *
 * Approving and rejecting are decisions somebody else reads back later; the rest of the
 * pipeline is just where the file has got to. So those two open the reason box and nothing
 * is written until it is answered, while the others commit on the click as before.
 *
 * It lives on the chip rather than in each page because the same chip is the control in
 * three places — the table row, the phone card, and the applicant's own header — and a
 * decision that is interrogated in one of them and waved through in the other two is not a
 * rule, it is a habit of whichever screen you happened to use.
 */
export function StatusSelect({ value, onChange, subject }: {
    value: AppStatus;
    onChange: (s: AppStatus, reason?: string) => void;
    /** Whose application this is — named in the reason dialog. */
    subject?: string;
}) {
    const [open, setOpen] = useState(false);
    const [asking, setAsking] = useState<AppStatus | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const meta = STATUS_META[value];

    const toggle = () => {
        if (!open && btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            setCoords({ top: r.bottom + 4, left: r.left });
        }
        setOpen((o) => !o);
    };

    const pick = (s: AppStatus) => {
        setOpen(false);
        if (s !== value && needsReason(s)) { setAsking(s); return; }
        onChange(s);
    };

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={toggle}
                className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition hover:opacity-90", meta.badge)}
            >
                {meta.label}
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>
            {open && createPortal(
                <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
                    <div className="fixed z-[61] w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg" style={{ top: coords.top, left: coords.left }}>
                        {STATUS_ORDER.map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => pick(s)}
                                className={cn("flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-slate-50", s === value && "bg-slate-50")}
                            >
                                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_META[s].badge)}>{STATUS_META[s].label}</span>
                                {s === value && <Check className="h-3.5 w-3.5 text-blue-600" />}
                            </button>
                        ))}
                    </div>
                </>,
                document.body,
            )}
            {asking && (
                <StatusReasonDialog
                    status={asking}
                    subject={subject}
                    onClose={() => setAsking(null)}
                    onConfirm={(reason) => { onChange(asking, reason); setAsking(null); }}
                />
            )}
        </>
    );
}

/**
 * The reason box.
 *
 * Header and footer stay in view and only the middle scrolls, so the button you came here
 * to press is never below the fold on a laptop.
 */
function StatusReasonDialog({ status, subject, onClose, onConfirm }: {
    status: AppStatus;
    subject?: string;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}) {
    const [reason, setReason] = useState("");
    const presets = STATUS_REASONS[status] ?? [];
    const approving = status === "approved";
    const meta = STATUS_META[status];
    const who = subject ? `${subject}'s` : "this";

    /*
     * Out to the body, like the row menus.
     *
     * The chip that opens this sits in a table cell, and the app dialog renders where it is
     * written rather than through a portal of its own — so the modal was a descendant of
     * that <td>, inheriting its position: sticky, the table horizontal scrollport, and any
     * stacking context either of them grows later. It goes to the body instead, which is
     * where a modal belongs and where the kebab menus already go.
     */
    return createPortal(
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="flex max-h-[88vh] max-w-lg flex-col p-0">
                <DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-4 text-left">
                    <DialogTitle className="flex items-center gap-2">
                        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", approving ? "bg-emerald-600 text-white" : "bg-rose-600 text-white")}>
                            <meta.Icon className="h-4 w-4" />
                        </span>
                        {approving ? "Approve application" : "Reject application"}
                    </DialogTitle>
                    <p className="text-sm font-normal text-slate-500">
                        {approving
                            ? `Say what cleared ${who} file. It goes on the activity log, where the next reviewer and any audit will read it.`
                            : `Say why ${who} file was turned down. It goes on the activity log, and it is the answer the office gives when the driver asks.`}
                    </p>
                </DialogHeader>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                    {presets.length > 0 && (
                        <div>
                            <Label className="text-slate-600">Common reasons</Label>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {presets.map((p) => {
                                    const on = reason.trim() === p;
                                    return (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setReason(on ? "" : p)}
                                            className={cn("rounded-full border px-3 py-1.5 text-[13px] font-medium transition",
                                                on
                                                    ? (approving ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-rose-400 bg-rose-50 text-rose-700")
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50")}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <div>
                        <Label className="text-slate-600">
                            Reason <span className="font-normal text-slate-400">— pick one above, or write your own</span>
                        </Label>
                        <Textarea
                            className="mt-1.5"
                            rows={4}
                            autoFocus
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={approving ? "What was checked, and what cleared…" : "What did not meet the requirement…"}
                        />
                    </div>
                </div>

                <DialogFooter className="mt-0 shrink-0 items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 sm:justify-between">
                    <p className="hidden text-xs text-slate-500 sm:block">Recorded against {subject ?? "this applicant"} by {ACTOR}.</p>
                    <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button
                            type="button"
                            disabled={!reason.trim()}
                            className={approving ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}
                            onClick={() => onConfirm(reason)}
                        >
                            {approving ? "Approve" : "Reject"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>,
        document.body,
    );
}

// ----------------------------- invite modal -----------------------------
function StepRow({ n, title, desc, children }: { n: number; title: string; desc: string; children: React.ReactNode }) {
    return (
        <div className="flex gap-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{n}</div>
            <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                <p className="text-xs text-slate-500">{desc}</p>
                <div className="mt-3">{children}</div>
            </div>
        </div>
    );
}

function InviteModal({ carrierId, carrierName, onClose, onCreate }: { carrierId?: string; carrierName?: string; onClose: () => void; onCreate: (created: Applicant[]) => void }) {
    const { templates } = useHiringTemplates(carrierId);
    const [formId, setFormId] = useState("us");
    const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
    // The carrier is inherited from the top-bar selection — you issue files for
    // the carrier you're currently working in.
    const carrier = carrierName ?? CARRIERS[0];
    const [emails, setEmails] = useState<string[]>([]);
    const [emailInput, setEmailInput] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [position, setPosition] = useState("");
    const [sendVia, setSendVia] = useState<"email" | "sms">("email");
    const [dueDate, setDueDate] = useState("");
    const [message, setMessage] = useState("Hi — please complete your driver hiring application using the link below.");

    // Only the workflows written for this driver type can be assigned — a Canada workflow
    // given to a US applicant would ask for an abstract their application never collects.
    const matching = templates.filter((t) => driverTypeMatches(t.driverType, formId));
    const template = matching.find((t) => t.id === templateId) ?? matching[0];
    const templateName = template?.name ?? "";
    const pickType = (id: string) => {
        setFormId(id);
        // Keep the chosen workflow when it still fits; otherwise move to the first that does.
        const still = templates.find((t) => t.id === templateId && driverTypeMatches(t.driverType, id));
        setTemplateId(still?.id ?? templates.find((t) => driverTypeMatches(t.driverType, id))?.id ?? "");
    };

    const addEmail = (raw: string) => {
        const e = raw.trim().replace(/,$/, "");
        if (e && !emails.includes(e)) setEmails((p) => [...p, e]);
        setEmailInput("");
    };
    const onEmailKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addEmail(emailInput); }
        else if (e.key === "Backspace" && !emailInput && emails.length) setEmails((p) => p.slice(0, -1));
    };

    const allEmails = emailInput.trim() ? [...emails, emailInput.trim()] : emails;
    // A file needs a workflow the applicant's driver type can run.
    const canSend = allEmails.length > 0 && !!template;

    const send = () => {
        const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const single = allEmails.length === 1;
        const created: Applicant[] = allEmails.map((email, i) => ({
            id: `new-${Date.now()}-${i}`,
            firstName: single && firstName ? firstName : email.split("@")[0].split(/[._]/)[0].replace(/^\w/, (c) => c.toUpperCase()),
            lastName: single && lastName ? lastName : "",
            email,
            formId, carrier, carrierId, template: templateName,
            status: "waiting", stepsDone: 0, stepsTotal: template ? template.steps.length : 0, invitedAt: today, updatedAt: Date.now(),
            phone: single ? phone : undefined,
            position: single ? position : undefined,
            remarks: [],
            events: [{ id: `e-${Date.now()}-${i}`, type: "invited", text: "Application issued to the driver", at: Date.now(), author: "Kenan Gain" }],
        }));
        onCreate(created);
    };

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="flex max-h-[92vh] max-w-2xl flex-col p-0">
                <DialogHeader className="border-b border-slate-200 px-6 py-4 text-left">
                    <DialogTitle className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><UserPlus className="h-4 w-4" /></span>
                        Invite new applicant
                    </DialogTitle>
                    <p className="text-sm font-normal text-slate-500">Set up the hiring file, then email the driver their application link.</p>
                </DialogHeader>

                <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
                    <StepRow n={1} title="Driver type" desc="Determines the application form and which documents are required.">
                        <DriverTypePicker value={formId} onChange={pickType} />
                    </StepRow>

                    <StepRow n={2} title="Hiring workflow" desc={`Workflows for ${driverTypeLabel(formId) ?? "this driver type"} only — the ones that match the application form.`}>
                        {matching.length ? (
                            <Select value={template?.id ?? ""} onValueChange={setTemplateId}>
                                <SelectTrigger><SelectValue placeholder="Select a workflow" /></SelectTrigger>
                                <SelectContent>{matching.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                            </Select>
                        ) : (
                            <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-700">
                                No hiring workflow is set up for {driverTypeLabel(formId)} yet. Create one in Settings ▸ Workflows.
                            </p>
                        )}
                        {template && (
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                                <span>{template.steps.length} steps</span><span className="text-slate-300">·</span>
                                <span>{formCount(template)} forms</span><span className="text-slate-300">·</span>
                                <span>{consentCount(template)} consents</span>
                            </div>
                        )}
                    </StepRow>

                    <StepRow n={3} title="Carrier" desc="Inherited from the carrier you're working in (top bar).">
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">
                            <Building2 className="h-4 w-4 text-slate-400" /> {carrier}
                        </div>
                    </StepRow>

                    <StepRow n={4} title="Driver emails" desc="Invite one or many — each email gets its own application link.">
                        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white p-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                            {emails.map((e) => (
                                <span key={e} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                                    {e}<button type="button" onClick={() => setEmails((p) => p.filter((x) => x !== e))} className="text-blue-400 hover:text-blue-600"><X className="h-3 w-3" /></button>
                                </span>
                            ))}
                            <input value={emailInput} onChange={(e) => setEmailInput(e.target.value)} onKeyDown={onEmailKey} onBlur={() => emailInput && addEmail(emailInput)} placeholder="jane@example.com" className="min-w-[140px] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-slate-400" />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">Press Enter or comma to add</p>
                    </StepRow>

                    <StepRow n={5} title="Applicant details" desc="Optional — for a single invite. Leave blank when inviting several.">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div><Label className="text-slate-600">First name</Label><Input className="mt-1.5" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" /></div>
                            <div><Label className="text-slate-600">Last name</Label><Input className="mt-1.5" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" /></div>
                            <div><Label className="text-slate-600">Phone</Label><Input className="mt-1.5" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" /></div>
                            <div><Label className="text-slate-600">Position</Label><Input className="mt-1.5" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Driver" /></div>
                        </div>
                    </StepRow>

                    <StepRow n={6} title="Invite options" desc="How and when to reach the driver.">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <Label className="text-slate-600">Send via</Label>
                                <div className="mt-1.5 grid grid-cols-2 gap-2">
                                    <Button type="button" variant={sendVia === "email" ? "default" : "outline"} onClick={() => setSendVia("email")}><Mail className="h-4 w-4" /> Email</Button>
                                    <Button type="button" variant={sendVia === "sms" ? "default" : "outline"} onClick={() => setSendVia("sms")}><MessageSquare className="h-4 w-4" /> SMS</Button>
                                </div>
                            </div>
                            <div><Label className="text-slate-600">Due date</Label><Input className="mt-1.5" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
                        </div>
                        <div className="mt-3">
                            <Label className="text-slate-600">Message / note <span className="font-normal text-slate-400">— included in the invite</span></Label>
                            <Textarea className="mt-1.5" value={message} onChange={(e) => setMessage(e.target.value)} />
                        </div>
                    </StepRow>
                </div>

                <DialogFooter className="mt-0 items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 sm:justify-between">
                    <p className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
                        <ChevronRight className="h-3.5 w-3.5" /> An application link will be {sendVia === "email" ? "emailed" : "texted"} on send.
                    </p>
                    <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="button" disabled={!canSend} onClick={send}><Send className="h-4 w-4" /> Send invite</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
