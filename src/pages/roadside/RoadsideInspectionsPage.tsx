// ─────────────────────────────────────────────────────────────────────────────
// Roadside inspections — the list.
//
// The list exists to answer one question, and it is not "what happened": it is
// "what has not been finished". A clean Level III from three weeks ago needs
// nobody's attention. An out-of-service brake violation from Tuesday with no
// remediation report on it is the reason this page is in the sidebar.
//
// So the KPI row is stages, not totals, and every one of them filters. The
// document columns say what is MISSING rather than how many files are attached —
// three marks read faster than "3 documents", and they say which one to chase.
//
// Two layouts, not one responsive compromise: a table on a desk, where ten
// columns across is how you compare rows, and cards on a phone, where the same
// ten columns would be a horizontal scrollbar nobody finds. Both are driven from
// the same filtered list, so neither can quietly show something the other does
// not.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import {
    ClipboardCheck, Plus, Search, ShieldAlert, ShieldCheck, Wrench, FileText, Receipt,
    Check, X as XIcon, CircleAlert, Eye, Pencil, Share2, Trash2, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ListPageHeader, PAGE_PAD } from "@/components/ui/ListPageHeader";
import { useCondensingHeader } from "@/components/ui/use-condensing-header";
import { KpiStatCard } from "@/components/ui/KpiStatCard";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { PaginationBar } from "@/components/ui/DataListToolbar";
import { TableGroupBand } from "@/components/ui/ListChrome";
import { ShareToChat, type ShareItem } from "@/components/share/ShareToChat";
import { setMessagesFocus } from "@/pages/messages/messages-store";
import { currentUserName } from "@/data/users.data";
import {
    INSPECTION_LEVELS, STAGE_LABEL, STAGE_TONE, allViolations, deleteInspection, durationLabel,
    inspectionStage, isMaintenanceRelated, hasVehicleViolation, seedInspections, shortLevel,
    unitsLabel, useInspections,
    type InspectionStage, type RoadsideInspection,
} from "./roadside.data";

type StageFilter = InspectionStage | "all";

/**
 * What the rows can be grouped by.
 *
 * The four a safety manager actually sorts this list into: which stage it is at,
 * whose truck it was, who was driving, and what level of inspection it was. Not
 * every column — a group band per location would be one band per row.
 */
const GROUPS = [
    { id: "none", label: "No grouping" },
    { id: "stage", label: "Stage" },
    { id: "driver", label: "Driver" },
    { id: "truck", label: "Truck" },
    { id: "trailer", label: "Trailer" },
    { id: "level", label: "Inspection level" },
    { id: "result", label: "Result" },
] as const;
type GroupBy = (typeof GROUPS)[number]["id"];

const groupOf = (i: RoadsideInspection, by: GroupBy): string => {
    switch (by) {
        case "stage": return STAGE_LABEL[inspectionStage(i)];
        case "driver": return i.driver.label || "No driver recorded";
        case "truck": return i.truck.label || "No truck recorded";
        case "trailer": return i.trailer.label || "No trailer";
        case "level": return shortLevel(i.level);
        case "result": return i.oos ? "Out of service" : i.result;
        default: return "";
    }
};

/**
 * A rule between columns, not only between rows.
 *
 * Eleven columns of left-aligned text with nothing between them reads as one
 * paragraph per row: the eye has to find where Location stops and Units starts.
 * A hairline does that work, and it lets the rows be short — without it, the
 * only thing keeping the columns apart is whitespace, so the padding has to stay
 * generous and every row is three lines tall.
 */
const TH = "px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap border-r border-slate-200/70 last:border-r-0";
const TD = "px-3 py-1.5 text-[13px] align-middle whitespace-nowrap border-r border-slate-100 last:border-r-0";

/** The three document shelves, as three marks. Says which one to chase. */
function DocMarks({ i, size = 5 }: { i: RoadsideInspection; size?: number }) {
    const wantsRemediation = hasVehicleViolation(i) || i.oos;
    const wantsBill = isMaintenanceRelated(i);
    const marks: { Icon: React.ElementType; title: string; have: boolean; wanted: boolean }[] = [
        { Icon: FileText, title: "Inspection report", have: i.reports.length > 0, wanted: true },
        { Icon: ShieldCheck, title: "Remediation report", have: i.remediation.length > 0, wanted: wantsRemediation },
        { Icon: Receipt, title: "Repair bill", have: i.repairBills.length > 0, wanted: wantsBill },
    ];
    return (
        <div className="flex items-center gap-1.5">
            {marks.map(({ Icon, title, have, wanted }) => (
                <span
                    key={title}
                    title={!wanted ? `${title} — not needed` : have ? `${title} — on file` : `${title} — missing`}
                    className={cn("inline-flex items-center justify-center rounded border",
                        size === 5 ? "h-5 w-5" : "h-7 w-7",
                        !wanted ? "border-slate-100 bg-slate-50 text-slate-300"
                            : have ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                                : "border-rose-200 bg-rose-50 text-rose-500")}
                >
                    <Icon size={size === 5 ? 11 : 13} />
                </span>
            ))}
        </div>
    );
}

function ResultBadge({ i }: { i: RoadsideInspection }) {
    return (
        <span className="inline-flex items-center gap-1">
            <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-px text-[11px] font-bold",
                i.result === "Pass" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700")}>
                {i.result === "Pass" ? <Check size={10} /> : <XIcon size={10} />} {i.result}
            </span>
            {i.oos && (
                <span className="inline-flex items-center rounded border border-rose-300 bg-rose-100 px-1 py-px text-[10px] font-bold text-rose-700">OOS</span>
            )}
        </span>
    );
}

export function RoadsideInspectionsPage({ accountId, accountName, onNavigate }: {
    accountId?: string;
    accountName?: string;
    onNavigate: (path: string) => void;
}) {
    // A carrier with no inspections gets three, once, so the page can be read
    // before anybody has typed anything into it.
    useEffect(() => { if (accountId) seedInspections(accountId); }, [accountId]);

    const all = useInspections(accountId);

    const [search, setSearch] = useState("");
    const [stage, setStage] = useState<StageFilter>("all");
    const [level, setLevel] = useState<string>("all");
    const [result, setResult] = useState<"all" | "Pass" | "Fail">("all");
    const [oosOnly, setOosOnly] = useState(false);
    const [groupBy, setGroupBy] = useState<GroupBy>("none");
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [sharing, setSharing] = useState<RoadsideInspection | null>(null);
    const [pendingDelete, setPendingDelete] = useState<RoadsideInspection | null>(null);

    const counts = useMemo(() => {
        const c: Record<InspectionStage, number> = { clean: 0, "awaiting-report": 0, "awaiting-repair": 0, closed: 0 };
        for (const i of all) c[inspectionStage(i)]++;
        return c;
    }, [all]);
    const oosCount = useMemo(() => all.filter((i) => i.oos).length, [all]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return all.filter((i) => {
            if (stage !== "all" && inspectionStage(i) !== stage) return false;
            if (level !== "all" && i.level !== level) return false;
            if (result !== "all" && i.result !== result) return false;
            if (oosOnly && !i.oos) return false;
            if (!q) return true;
            const haystack = [
                i.id, i.location, i.level, i.citationNumber, i.notes,
                i.truck.label, i.trailer.label, i.driver.label,
                ...allViolations(i).map((v) => `${v.code ?? ""} ${v.label}`),
            ].filter(Boolean).join(" ").toLowerCase();
            return haystack.includes(q);
        });
    }, [all, search, stage, level, result, oosOnly]);

    /**
     * Grouped, then paged.
     *
     * In that order on purpose: paging first would scatter one driver's rows
     * across three pages under three copies of the same band.
     */
    const sorted = useMemo(() => {
        if (groupBy === "none") return filtered;
        return [...filtered].sort((a, b) => {
            const ga = groupOf(a, groupBy), gb = groupOf(b, groupBy);
            return ga === gb ? (a.date < b.date ? 1 : -1) : ga.localeCompare(gb);
        });
    }, [filtered, groupBy]);

    const groupCounts = useMemo(() => {
        const m = new Map<string, number>();
        if (groupBy === "none") return m;
        for (const i of sorted) m.set(groupOf(i, groupBy), (m.get(groupOf(i, groupBy)) ?? 0) + 1);
        return m;
    }, [sorted, groupBy]);

    // Any filter change puts you back at the top; page 4 of a two-page list is a
    // blank screen that looks like no results.
    useEffect(() => { setPage(1); }, [search, stage, level, result, oosOnly, groupBy]);

    const paged = useMemo(
        () => sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage),
        [sorted, page, rowsPerPage],
    );

    const { scrollRef, condensed, onScroll } = useCondensingHeader();
    const anyFilter = stage !== "all" || level !== "all" || result !== "all" || oosOnly || !!search.trim();
    const clear = () => { setStage("all"); setLevel("all"); setResult("all"); setOosOnly(false); setSearch(""); };

    const kpis: { id: StageFilter; label: string; value: number; Icon: React.ElementType; accent: string }[] = [
        { id: "all", label: "Inspections", value: all.length, Icon: ClipboardCheck, accent: "slate" },
        { id: "awaiting-report", label: "Awaiting remediation", value: counts["awaiting-report"], Icon: ShieldAlert, accent: "rose" },
        { id: "awaiting-repair", label: "Awaiting repair bill", value: counts["awaiting-repair"], Icon: Wrench, accent: "amber" },
        { id: "clean", label: "Clean", value: counts.clean, Icon: ShieldCheck, accent: "emerald" },
    ];

    /** One row's menu — the same four actions wherever the row is drawn. */
    const rowActions = (i: RoadsideInspection) => [
        { label: "View inspection", icon: Eye, onClick: () => onNavigate(`/roadside-inspections/${i.id}`) },
        { label: "Edit", icon: Pencil, onClick: () => onNavigate(`/roadside-inspections/${i.id}/edit`) },
        { label: "Share to chat", icon: Share2, onClick: () => setSharing(i) },
        { label: "Remove", icon: Trash2, danger: true, onClick: () => setPendingDelete(i) },
    ];

    /** What travels with a shared inspection: every document on it, by shelf. */
    const shareItems = (i: RoadsideInspection): ShareItem[] => [
        ...i.reports.map((d) => ({ name: d.name, group: "Inspection report" })),
        ...i.remediation.map((d) => ({ name: d.name, group: "Remediation report" })),
        ...i.repairBills.map((d) => ({ name: d.name, group: "Repair bill" })),
    ];

    const open = (id: string) => onNavigate(`/roadside-inspections/${id}`);

    return (
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <ListPageHeader
                Icon={ClipboardCheck}
                title="Roadside Inspection"
                description={<>
                    {accountName ? <span className="font-semibold text-slate-700">{accountName}</span> : "This carrier"}
                    {" "}&mdash; what the inspector found, and what still has to be put right.
                </>}
                count={all.length}
                countTitle={`${all.length} inspections`}
                condensed={condensed}
                chips={[
                    { id: "total", label: "total", value: all.length },
                    {
                        id: "awaiting", label: "awaiting remediation", value: counts["awaiting-report"], tone: "text-rose-600",
                        active: stage === "awaiting-report", onClick: () => setStage((x) => (x === "awaiting-report" ? "all" : "awaiting-report")),
                    },
                    {
                        id: "oos", label: "out of service", value: oosCount, tone: "text-amber-600",
                        active: oosOnly, onClick: () => setOosOnly((v) => !v),
                    },
                ]}
                actions={
                    <button
                        onClick={() => onNavigate("/roadside-inspections/new")}
                        className={cn("inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700",
                            condensed ? "h-8" : "h-9")}
                    >
                        <Plus size={15} /> <span className="hidden sm:inline">Record inspection</span><span className="sm:hidden">Record</span>
                    </button>
                }
            />

            <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
                <div className={cn("space-y-4 py-4 sm:space-y-5 sm:py-6", PAGE_PAD)}>

                    {/* Stages, not totals — and each one is the filter for itself. */}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {kpis.map((k) => (
                            <KpiStatCard
                                key={k.id}
                                label={k.label}
                                value={k.value}
                                Icon={k.Icon}
                                accent={k.accent}
                                active={stage === k.id}
                                onClick={() => setStage((s) => (s === k.id ? "all" : k.id))}
                            />
                        ))}
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        {/* Filters. They wrap rather than scroll: on a phone this becomes three
                            rows of controls, all of them reachable. */}
                        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-3 sm:px-4">
                            <div className="relative min-w-[200px] flex-1">
                                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search unit, driver, location, violation code…"
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pr-3 text-[13px] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    style={{ paddingLeft: 32 }}
                                />
                            </div>
                            <select value={level} onChange={(e) => setLevel(e.target.value)}
                                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] font-medium text-slate-600">
                                <option value="all">All levels</option>
                                {INSPECTION_LEVELS.map((l) => <option key={l} value={l}>{shortLevel(l)}</option>)}
                            </select>
                            <select value={result} onChange={(e) => setResult(e.target.value as "all" | "Pass" | "Fail")}
                                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] font-medium text-slate-600">
                                <option value="all">Pass &amp; fail</option>
                                <option value="Pass">Pass</option>
                                <option value="Fail">Fail</option>
                            </select>
                            {/* Group by, beside the filters rather than hidden in a menu: it is
                                the control that changes how this list READS. */}
                            <label className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white pl-2.5 pr-1 text-[13px] font-medium text-slate-600">
                                <Layers size={14} className="text-slate-400" />
                                <span className="hidden text-slate-400 sm:inline">Group by</span>
                                <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                                    className="h-8 rounded-md border-0 bg-transparent pr-1 text-[13px] font-semibold text-slate-700 outline-none">
                                    {GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                                </select>
                            </label>
                            <button type="button" onClick={() => setOosOnly((v) => !v)}
                                className={cn("inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold transition-colors",
                                    oosOnly ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
                                <ShieldAlert size={14} /> <span className="hidden sm:inline">Out of service</span><span className="sm:hidden">OOS</span>
                            </button>
                            {anyFilter && (
                                <button type="button" onClick={clear}
                                    className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-[13px] font-semibold text-slate-500 hover:text-slate-700">
                                    <XIcon size={13} /> Clear
                                </button>
                            )}
                            <span className="ml-auto text-[12px] text-slate-500">{filtered.length} of {all.length}</span>
                        </div>

                        {/* ── Desk: the table ── */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full min-w-[1080px]">
                                <thead className="border-b border-slate-200 bg-slate-50">
                                    <tr>
                                        <th className={TH}>Stage</th>
                                        <th className={TH}>Date</th>
                                        <th className={TH}>Level</th>
                                        <th className={TH}>Location</th>
                                        <th className={TH}>Units</th>
                                        <th className={TH}>Driver</th>
                                        <th className={TH}>Result</th>
                                        <th className={TH}>Violations</th>
                                        <th className={TH}>Citation</th>
                                        <th className={TH}>Documents</th>
                                        <th className={cn(TH, "pr-2 text-right")}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paged.flatMap((i, idx) => {
                                        const st = inspectionStage(i);
                                        const vios = allViolations(i);
                                        const band = groupBy === "none" ? null : groupOf(i, groupBy);
                                        const prev = idx === 0 || groupBy === "none" ? null : groupOf(paged[idx - 1], groupBy);
                                        const rows = [];
                                        if (band && band !== prev) {
                                            rows.push(<TableGroupBand key={`band-${band}`} label={band} count={groupCounts.get(band) ?? 0} colSpan={11} />);
                                        }
                                        rows.push(
                                            <tr key={i.id} onClick={() => open(i.id)}
                                                className="h-9 cursor-pointer transition-colors hover:bg-blue-50/40">
                                                <td className={TD}>
                                                    <span className={cn("inline-flex items-center rounded border px-1.5 py-px text-[11px] font-bold", STAGE_TONE[st])}>
                                                        {STAGE_LABEL[st]}
                                                    </span>
                                                </td>
                                                {/* Date and duration on ONE line: a second line here is what made
                                                    every row in the table two rows tall. */}
                                                <td className={cn(TD, "font-semibold text-slate-800")}>
                                                    {i.date}
                                                    <span className="ml-2 font-normal tabular-nums text-slate-400">{durationLabel(i)}</span>
                                                </td>
                                                <td className={cn(TD, "text-slate-600")}>{shortLevel(i.level)}</td>
                                                <td className={cn(TD, "max-w-[220px] truncate text-slate-600")} title={i.location}>{i.location || "—"}</td>
                                                <td className={cn(TD, "text-slate-700")}>{unitsLabel(i)}</td>
                                                <td className={cn(TD, "text-slate-700")}>{i.driver.label ?? "—"}</td>
                                                <td className={TD}><ResultBadge i={i} /></td>
                                                <td className={cn(TD, "max-w-[220px] truncate text-slate-600")}
                                                    title={vios.map((v) => `${v.code ? `[${v.code}] ` : ""}${v.label}`).join(", ")}>
                                                    {vios.length === 0
                                                        ? <span className="text-slate-300">&mdash;</span>
                                                        : <>
                                                            <span className="font-semibold tabular-nums text-slate-800">{vios.length}</span>
                                                            <span className="ml-1.5 text-[12px] text-slate-500">
                                                                {vios[0].code ? `[${vios[0].code}] ` : ""}{vios[0].label}
                                                            </span>
                                                        </>}
                                                </td>
                                                <td className={cn(TD, "tabular-nums text-slate-600")}>
                                                    {i.citationIssued ? (i.citationNumber || "Issued") : <span className="text-slate-300">&mdash;</span>}
                                                </td>
                                                <td className={TD}><DocMarks i={i} /></td>
                                                {/* The row opens on click; the menu must not. */}
                                                <td className={cn(TD, "pr-2")} onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex justify-end">
                                                        <KebabMenu items={rowActions(i)} title="Inspection actions" />
                                                    </div>
                                                </td>
                                            </tr>,
                                        );
                                        return rows;
                                    })}
                                    {paged.length === 0 && (
                                        <tr>
                                            <td colSpan={11} className="px-4 py-14 text-center">
                                                <EmptyState all={all.length} onAdd={() => onNavigate("/roadside-inspections/new")} />
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Phone: the same rows as cards ── */}
                        <div className="divide-y divide-slate-100 md:hidden">
                            {paged.map((i, idx) => {
                                const st = inspectionStage(i);
                                const vios = allViolations(i);
                                const band = groupBy === "none" ? null : groupOf(i, groupBy);
                                const prev = idx === 0 || groupBy === "none" ? null : groupOf(paged[idx - 1], groupBy);
                                return (
                                    <div key={i.id}>
                                        {band && band !== prev && (
                                            <div className="flex items-center gap-2 border-y border-slate-200 bg-slate-50 px-4 py-1.5">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{band}</span>
                                                <span className="text-[10px] font-semibold tabular-nums text-slate-400">{groupCounts.get(band) ?? 0}</span>
                                            </div>
                                        )}
                                        <div className="p-4" onClick={() => open(i.id)}>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold", STAGE_TONE[st])}>
                                                            {STAGE_LABEL[st]}
                                                        </span>
                                                        <ResultBadge i={i} />
                                                    </div>
                                                    <p className="mt-1.5 text-[14px] font-bold text-slate-800">{i.date} <span className="font-normal text-slate-400">&middot; {shortLevel(i.level)}</span></p>
                                                    <p className="text-[12px] text-slate-500">{i.location || "—"}</p>
                                                </div>
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <KebabMenu items={rowActions(i)} title="Inspection actions" />
                                                </div>
                                            </div>

                                            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Units</p>
                                                    <p className="text-[13px] text-slate-700">{unitsLabel(i)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Driver</p>
                                                    <p className="text-[13px] text-slate-700">{i.driver.label ?? "—"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Violations</p>
                                                    <p className="text-[13px] text-slate-700">
                                                        {vios.length === 0 ? "None" : `${vios.length}${vios[0].code ? ` · [${vios[0].code}]` : ""}`}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Citation</p>
                                                    <p className="text-[13px] text-slate-700">{i.citationIssued ? (i.citationNumber || "Issued") : "—"}</p>
                                                </div>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between">
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Documents</p>
                                                <DocMarks i={i} size={7} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {paged.length === 0 && (
                                <div className="px-4 py-14 text-center">
                                    <EmptyState all={all.length} onAdd={() => onNavigate("/roadside-inspections/new")} />
                                </div>
                            )}
                        </div>

                        <PaginationBar
                            totalItems={sorted.length}
                            currentPage={page}
                            rowsPerPage={rowsPerPage}
                            onPageChange={setPage}
                            onRowsPerPageChange={(r) => { setRowsPerPage(r); setPage(1); }}
                        />
                    </div>
                </div>
            </div>

            {/* Share — the record plus every document on it, in one place. */}
            {sharing && (
                <ShareToChat
                    open
                    onClose={() => setSharing(null)}
                    title={`Share roadside inspection — ${sharing.date}`}
                    subtitle="Send the inspection and its documents in a chat, or to an outsider by email"
                    source={{ type: "manual", id: sharing.id, label: `Roadside inspection ${sharing.date}` }}
                    items={shareItems(sharing)}
                    record={{
                        type: "roadside-inspection",
                        id: sharing.id,
                        label: `Roadside inspection · ${sharing.date}`,
                        sublabel: [unitsLabel(sharing), sharing.driver.label, STAGE_LABEL[inspectionStage(sharing)]].filter(Boolean).join(" · "),
                        path: "/roadside-inspections",
                    }}
                    defaultChannel="in-app"
                    defaultSubject={`Roadside inspection ${sharing.date} — ${unitsLabel(sharing)}`}
                    currentUserName={currentUserName()}
                    onOpenInMessages={(id) => { setMessagesFocus(id); onNavigate("/messages"); }}
                />
            )}

            {pendingDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
                    <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
                        <p className="text-sm font-bold text-slate-900">Remove this inspection?</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            {pendingDelete.date} &middot; {unitsLabel(pendingDelete)}. Its documents go with it, and
                            this cannot be undone.
                        </p>
                        <div className="mt-4 flex justify-end gap-2">
                            <button onClick={() => setPendingDelete(null)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button onClick={() => { deleteInspection(pendingDelete.id); setPendingDelete(null); }}
                                className="rounded-lg bg-rose-600 px-3 py-2 text-[13px] font-bold text-white hover:bg-rose-700">Remove</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function EmptyState({ all, onAdd }: { all: number; onAdd: () => void }) {
    return (
        <>
            <CircleAlert size={26} className="mx-auto text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-600">
                {all === 0 ? "No roadside inspections recorded yet" : "Nothing matches those filters"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
                {all === 0
                    ? "Record one the day it happens — the report, what was found, and what has to be put right."
                    : "Clear the filters to see the rest."}
            </p>
            {all === 0 && (
                <button onClick={onAdd}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                    <Plus size={15} /> Record inspection
                </button>
            )}
        </>
    );
}
