import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle, Search, Plus, Clock, BadgeCheck,
    MapPin, Truck, Smartphone, Building2, ListChecks, Sparkles, Eye, Pencil, Trash2, MessageSquare,
    ChevronDown, ChevronUp, ChevronsUpDown, Filter, Check, Columns,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/pages/ats/ats-ui";
import { KpiStatCard } from "@/components/ui/KpiStatCard";
import {
    ACCIDENT_TYPES, RISK_TYPE_TONE,
    type AccidentRiskType,
} from "@/data/accident-types.data";
import {
    useAccidentRecords, ACCIDENT_STATUS_META, SOURCE_META, CASE_STATUS_META, addedInfo, newAccidentId, carrierOwnerInfo,
    type AccidentRecord, type AccidentStatus, type AccidentSource, type AccidentOwnerInfo,
} from "@/data/accident-records.data";
import { AccidentRecordPage } from "./AccidentRecordPage";
import { AccidentDetailPage, RowActionsMenu } from "./AccidentDetailPage";

/**
 * Default Accidents — the carrier's actual reported accident RECORDS. Drivers report
 * from the mobile app (they land here as "Reported"); a manager reviews, adds
 * verification data and marks them "Verified". Click a row to open the record page.
 */

const PAGE_SIZES = [10, 25, 50, 100];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function typeLabel(id: string): string {
    return ACCIDENT_TYPES.find(t => t.id === id)?.displayName ?? "";
}
function typeIdsOf(r: AccidentRecord): string[] {
    return r.accidentTypeIds?.length ? r.accidentTypeIds : (r.accidentTypeId ? [r.accidentTypeId] : []);
}
function typesOf(r: AccidentRecord): string {
    return typeIdsOf(r).map(typeLabel).filter(Boolean).join(", ");
}
function fmtWhen(dt: string): { date: string; time: string } {
    const [d, t] = (dt || "").split("T");
    if (!d) return { date: dt || "—", time: "" };
    const [y, m, day] = d.split("-");
    return { date: `${MONTHS[Number(m) - 1] ?? m} ${Number(day)}, ${y}`, time: t ?? "" };
}
/** "Aug 20, 2026, 03:38 PM" (12-hour). Date-only strings render without the time part. */
function fmt12h(dt: string): string {
    const [d, t] = (dt || "").split("T");
    if (!d) return dt || "";
    const [y, m, day] = d.split("-");
    const datePart = `${MONTHS[Number(m) - 1] ?? m} ${Number(day)}, ${y}`;
    if (!t) return datePart;
    const [hRaw, mm] = t.split(":");
    let hh = Number(hRaw);
    const ap = hh >= 12 ? "PM" : "AM";
    hh = hh % 12 || 12;
    return `${datePart}, ${String(hh).padStart(2, "0")}:${mm ?? "00"} ${ap}`;
}
function initials(name: string): string {
    const p = name.trim().split(/\s+/).filter(Boolean);
    if (!p.length) return "—";
    return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
const AVATAR_COLORS = ["bg-rose-500", "bg-pink-500", "bg-fuchsia-500", "bg-violet-500", "bg-indigo-500", "bg-blue-500", "bg-sky-500", "bg-cyan-500", "bg-teal-500", "bg-emerald-500", "bg-amber-500", "bg-orange-500"];
function avatarColor(name: string): string {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
/** Avatar + name + timestamp cell (image-1 "Uploaded by" style). */
function PersonCell({ name, at }: { name?: string; at?: string }) {
    if (!name) return <span className="text-[12px] text-slate-300">—</span>;
    return (
        <div className="flex items-center gap-2">
            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white", avatarColor(name))}>{initials(name)}</span>
            <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-slate-800" title={name}>{name}</div>
                {at && <div className="whitespace-nowrap text-[11px] text-slate-400">{fmt12h(at)}</div>}
            </div>
        </div>
    );
}

/** Case-communication status for the list — shows the adjuster case state and flags a reply. */
function CaseCell({ record: r }: { record: AccidentRecord }) {
    if (!r.case || r.case.messages.length === 0) return <span className="text-[11px] text-slate-300">—</span>;
    const cs = CASE_STATUS_META[r.case.status];
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold", cs.tone)}>
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", cs.dot)} />{cs.label}
            </span>
            {caseHasReply(r) && <span title="The adjuster replied" className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white"><MessageSquare size={9} /> Reply</span>}
        </span>
    );
}

// ── Sortable columns + column-visibility config ──────────────────────────
type ColId = "when" | "driver" | "type" | "location" | "severity" | "source" | "addedBy" | "case" | "reviewedBy" | "claimedBy" | "status";
const COLUMN_DEFS: { id: ColId; label: string; locked?: boolean; defaultOn: boolean }[] = [
    { id: "when", label: "When", locked: true, defaultOn: true },
    { id: "driver", label: "Driver", locked: true, defaultOn: true },
    { id: "type", label: "Type", defaultOn: true },
    { id: "location", label: "Location", defaultOn: true },
    { id: "severity", label: "Severity", defaultOn: true },
    { id: "source", label: "Source", defaultOn: true },
    { id: "addedBy", label: "Added by", defaultOn: true },
    { id: "case", label: "Case", defaultOn: true },
    { id: "reviewedBy", label: "Reviewed by", defaultOn: true },
    { id: "claimedBy", label: "Claimed by", defaultOn: false },
    { id: "status", label: "Status", defaultOn: true },
];
const SEV_RANK: Record<string, number> = { Critical: 5, High: 4, Medium: 3, Low: 2, Info: 1 };
/** Does this accident's case have an adjuster reply we should flag in the list? */
const caseHasReply = (r: AccidentRecord) => (r.case?.messages ?? []).some(m => m.from === "adjuster");
const STATUS_RANK: Record<AccidentStatus, number> = { reported: 1, review: 2, verified: 3 };
type SortState = { col: ColId; dir: "asc" | "desc" };
function sortVal(r: AccidentRecord, col: ColId): string | number {
    switch (col) {
        case "when": return r.dateTime || "";
        case "driver": return (r.driverName || "").toLowerCase();
        case "type": return typesOf(r).toLowerCase();
        case "location": return (r.location || "").toLowerCase();
        case "severity": return r.severity ? (SEV_RANK[r.severity] ?? 0) : 0;
        case "source": return r.source;
        case "addedBy": return addedInfo(r).at || "";
        case "case": return (r.case?.messages.length ?? 0) + (caseHasReply(r) ? 100 : 0);
        case "reviewedBy": return (r.verifiedBy || "").toLowerCase();
        case "claimedBy": return (r.claimedBy || "").toLowerCase();
        case "status": return STATUS_RANK[r.status];
    }
}

/** Sortable header cell — label + a sort chevron (↕ neutral, ↑/↓ active). */
function SortTh({ id, label, minW, align, sort, onSort }: {
    id: ColId; label: string; minW: string; align?: "right"; sort: SortState | null; onSort: (id: ColId) => void;
}) {
    const active = sort?.col === id;
    return (
        <th className={cn("px-3 py-2.5 whitespace-nowrap", minW, align === "right" && "text-right")}>
            <button type="button" onClick={() => onSort(id)}
                className={cn("inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider hover:text-slate-700", active ? "text-slate-700" : "text-slate-500")}>
                {label}
                {active ? (sort!.dir === "asc" ? <ChevronUp size={12} className="text-blue-500" /> : <ChevronDown size={12} className="text-blue-500" />)
                    : <ChevronsUpDown size={12} className="text-slate-300" />}
            </button>
        </th>
    );
}

/** Column-visibility dropdown (checkbox toggles) — matches the Default Compliance "Columns" control. */
function ColumnsDropdown({ visible, onToggle }: { visible: Set<ColId>; onToggle: (id: ColId) => void }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen(o => !o)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
                <Columns size={14} /> Columns <ChevronDown size={13} className={cn("text-slate-400 transition-transform", open && "rotate-180")} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Toggle columns</div>
                        {COLUMN_DEFS.map(c => (
                            <label key={c.id} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-slate-700", c.locked ? "opacity-60" : "cursor-pointer hover:bg-slate-50")}>
                                <input type="checkbox" disabled={c.locked} checked={visible.has(c.id)} onChange={() => onToggle(c.id)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                                {c.label}
                                {c.locked && <span className="ml-auto text-[10px] font-medium text-slate-400">Always</span>}
                            </label>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
function nowLocal(): { dt: string; today: string } {
    const n = new Date();
    const p = (x: number) => String(x).padStart(2, "0");
    const dt = `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}T${p(n.getHours())}:${p(n.getMinutes())}`;
    return { dt, today: dt.slice(0, 10) };
}
function blankOfficeAccident(owner: AccidentOwnerInfo): AccidentRecord {
    const { dt, today } = nowLocal();
    return {
        id: newAccidentId(), driverId: "", driverName: "", dateTime: dt, location: "", accidentTypeId: "",
        unitId: "", description: "", injuries: false, injuryNotes: "", photoCount: 0,
        status: "review", source: "office", reportedBy: "Office", reportedAt: today,
        severity: "", points: "", preventable: "", claimNumber: "", policeReport: "", insurer: "", thirdParty: "", managerNotes: "",
        driverPhone: "", driverAddress: "", licenceNumber: "", licenceExpiry: "", licenceProvince: "",
        ...owner, // owner info auto-populated from the carrier
    };
}

/** Multi-select accident-type filter — a checkbox dropdown matching the Default Compliance
 *  toolbar's "Columns" control. Includes an internal search since the type list is long, and
 *  a backdrop that closes it on outside click / small screens. */
function TypeFilterDropdown({ selected, onToggle, onClear }: {
    selected: Set<string>; onToggle: (id: string) => void; onClear: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const count = selected.size;
    const query = q.trim().toLowerCase();
    const options = ACCIDENT_TYPES.filter(t => !query || `${t.displayName} ${t.group}`.toLowerCase().includes(query));
    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen(o => !o)} title="Filter by accident type"
                className={cn("inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold transition-colors",
                    count ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
                <Filter size={14} /> {count ? `${count} type${count > 1 ? "s" : ""}` : "All types"}
                <ChevronDown size={13} className={cn("transition-transform", count ? "text-blue-400" : "text-slate-400", open && "rotate-180")} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute left-0 z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
                        <div className="flex items-center justify-between px-2 pb-1 pt-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Filter by accident type</span>
                            {count > 0 && <button type="button" onClick={onClear} className="text-[11px] font-semibold text-blue-600 hover:text-blue-700">Clear ({count})</button>}
                        </div>
                        <div className="relative px-1 pb-1.5">
                            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search types…"
                                className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-2 text-[13px] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div className="max-h-64 overflow-auto">
                            {options.length === 0 && <div className="px-2 py-3 text-center text-[12px] text-slate-400">No types match “{q}”.</div>}
                            {options.map(t => {
                                const on = selected.has(t.id);
                                return (
                                    <button key={t.id} type="button" onClick={() => onToggle(t.id)}
                                        className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-slate-50", on ? "text-blue-800" : "text-slate-700")}>
                                        <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white")}>
                                            {on && <Check size={11} strokeWidth={3} />}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate">{t.displayName}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export function DefaultAccidentsPage({ accountId, currentUserName = "Manager" }: { accountId?: string; currentUserName?: string } = {}) {
    const { records, add, update, remove, loadSample } = useAccidentRecords(accountId);
    const owner = useMemo(() => carrierOwnerInfo(accountId), [accountId]);

    // ── Records view state ─────────────────────────────────────────
    const [recSearch, setRecSearch] = useState("");
    const [recStatus, setRecStatus] = useState<AccidentStatus | "all">("all");
    const [recSource, setRecSource] = useState<AccidentSource | "all">("all");
    const [recSeverity, setRecSeverity] = useState<AccidentRiskType | "all">("all");
    const [recTypes, setRecTypes] = useState<Set<string>>(new Set());
    const [recLocation, setRecLocation] = useState<string>("all");
    const [showHistorical, setShowHistorical] = useState(true);
    const toggleType = (id: string) => setRecTypes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const clearTypes = () => setRecTypes(new Set());

    // Sort + column visibility (Claimed by is hidden by default).
    const [sort, setSort] = useState<SortState | null>(null);
    const toggleSort = (col: ColId) => setSort(s => (s?.col === col ? (s.dir === "asc" ? { col, dir: "desc" } : null) : { col, dir: "asc" }));
    const [visibleCols, setVisibleCols] = useState<Set<ColId>>(() => new Set(COLUMN_DEFS.filter(c => c.defaultOn).map(c => c.id)));
    const toggleCol = (id: ColId) => setVisibleCols(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const showCol = (id: ColId) => visibleCols.has(id);

    // Distinct locations present in the data — populates the Location filter.
    const locations = useMemo(() => Array.from(new Set(records.map(r => r.location).filter(Boolean))).sort(), [records]);
    const [recPageSize, setRecPageSize] = useState(25);
    const [recPage, setRecPage] = useState(1);
    const [editing, setEditing] = useState<{ rec: AccidentRecord; isNew: boolean } | null>(null);
    const [viewingId, setViewingId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<AccidentRecord | null>(null);
    const viewing = viewingId ? records.find(r => r.id === viewingId) ?? null : null;
    const askDelete = (r: AccidentRecord) => setDeleting(r);
    const confirmDelete = () => { if (deleting) remove(deleting.id); setDeleting(null); };

    const recKpis = useMemo(() => ({
        total: records.length,
        reported: records.filter(r => r.status === "reported").length,
        review: records.filter(r => r.status === "review").length,
        verified: records.filter(r => r.status === "verified").length,
    }), [records]);

    const filteredRecords = useMemo(() => {
        const q = recSearch.trim().toLowerCase();
        return records.filter(r => {
            if (recStatus !== "all" && r.status !== recStatus) return false;
            if (recSource !== "all" && r.source !== recSource) return false;
            if (recSeverity !== "all" && r.severity !== recSeverity) return false;
            if (recTypes.size > 0 && !typeIdsOf(r).some(id => recTypes.has(id))) return false;
            if (recLocation !== "all" && r.location !== recLocation) return false;
            if (!showHistorical && r.status === "verified") return false;
            if (q && !`${r.driverName} ${r.location} ${typesOf(r)} ${r.unitId} ${r.claimNumber ?? ""}`.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [records, recSearch, recStatus, recSource, recSeverity, recTypes, recLocation, showHistorical]);

    const sortedRecords = useMemo(() => {
        if (!sort) return filteredRecords;
        const dir = sort.dir === "asc" ? 1 : -1;
        return [...filteredRecords].sort((a, b) => {
            const av = sortVal(a, sort.col), bv = sortVal(b, sort.col);
            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
            return 0;
        });
    }, [filteredRecords, sort]);

    useEffect(() => { setRecPage(1); }, [recSearch, recStatus, recSource, recSeverity, recTypes, recLocation, showHistorical, recPageSize]);
    const recTotal = sortedRecords.length;
    const recPages = Math.max(1, Math.ceil(recTotal / recPageSize));
    const recSafePage = Math.min(recPage, recPages);
    const recStart = (recSafePage - 1) * recPageSize;
    const recRows = sortedRecords.slice(recStart, recStart + recPageSize);

    // Dedicated full-page editor replaces the list while adding / reviewing an accident.
    if (editing) {
        return (
            <AccidentRecordPage
                initial={editing.rec}
                isNew={editing.isNew}
                accountId={accountId}
                verifierName={currentUserName}
                onBack={() => setEditing(null)}
                onSave={(r) => { if (editing.isNew) add(r); else update(r); }}
                onDelete={(id) => remove(id)}
            />
        );
    }

    // Read-only record page (summary + Overview / Documents / Evidence / Activity tabs).
    if (viewing) {
        return (
            <AccidentDetailPage
                record={viewing}
                accountId={accountId}
                onBack={() => setViewingId(null)}
                onEdit={() => { setEditing({ rec: viewing, isNew: false }); setViewingId(null); }}
                onUpdate={(r) => update(r)}
                onDelete={(id) => remove(id)}
            />
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                iconGradient="from-sky-500 to-blue-600"
                Icon={AlertTriangle}
                title="Default Accidents"
                subtitle="Reported accidents — driver-reported and office-entered, reviewed and verified here"
                actions={
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => loadSample()}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 shadow-sm hover:bg-violet-100">
                            <Sparkles size={15} /> Load sample data
                        </button>
                        <button type="button" onClick={() => setEditing({ rec: blankOfficeAccident(owner), isNew: true })}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                            <Plus size={15} /> Add accident
                        </button>
                    </div>
                }
            />

            <div className="space-y-5 p-4 sm:p-8">
                {/* KPI cards — click to filter by status */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <KpiStatCard label="Total Accidents" value={recKpis.total} Icon={AlertTriangle} accent="slate"
                        active={recStatus === "all"} onClick={() => setRecStatus("all")} />
                    <KpiStatCard label="Reported" value={recKpis.reported} Icon={Clock} accent="amber"
                        active={recStatus === "reported"} onClick={() => setRecStatus("reported")} />
                    <KpiStatCard label="Under Review" value={recKpis.review} Icon={ListChecks} accent="blue"
                        active={recStatus === "review"} onClick={() => setRecStatus("review")} />
                    <KpiStatCard label="Verified" value={recKpis.verified} Icon={BadgeCheck} accent="emerald"
                        active={recStatus === "verified"} onClick={() => setRecStatus("verified")} />
                </div>

                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            {/* Toolbar — search + filters (wraps on small screens) */}
                            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-3 sm:px-4">
                                <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
                                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input value={recSearch} onChange={e => setRecSearch(e.target.value)} placeholder="Search driver, location, type, unit…"
                                        className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                                <span className="hidden shrink-0 items-center text-slate-400 sm:inline-flex"><Filter size={14} /></span>
                                <TypeFilterDropdown selected={recTypes} onToggle={toggleType} onClear={clearTypes} />
                                <select value={recStatus} onChange={e => setRecStatus(e.target.value as AccidentStatus | "all")}
                                    className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none">
                                    <option value="all">All statuses</option>
                                    <option value="reported">Reported</option>
                                    <option value="review">Under review</option>
                                    <option value="verified">Verified</option>
                                </select>
                                <select value={recSource} onChange={e => setRecSource(e.target.value as AccidentSource | "all")}
                                    className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none">
                                    <option value="all">All sources</option>
                                    <option value="driver-app">Driver app</option>
                                    <option value="office">Office</option>
                                </select>
                                <select value={recSeverity} onChange={e => setRecSeverity(e.target.value as AccidentRiskType | "all")}
                                    className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none">
                                    <option value="all">All severities</option>
                                    {(["Critical", "High", "Medium", "Low", "Info"] as AccidentRiskType[]).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <select value={recLocation} onChange={e => setRecLocation(e.target.value)} title="Filter by location"
                                    className="h-9 max-w-[180px] rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none">
                                    <option value="all">All locations</option>
                                    {locations.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                                <ColumnsDropdown visible={visibleCols} onToggle={toggleCol} />
                                <div className="ml-auto flex items-center gap-2">
                                    <button type="button" onClick={() => setShowHistorical(v => !v)}
                                        title={showHistorical ? "Hide historical (verified) records" : "Show historical (verified) records"}
                                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">
                                        <span className={cn("relative h-5 w-9 rounded-full transition-colors", showHistorical ? "bg-blue-600" : "bg-slate-300")}>
                                            <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", showHistorical ? "left-[18px]" : "left-0.5")} />
                                        </span>
                                        Historical
                                    </button>
                                    <span className="shrink-0 text-[12px] font-medium text-slate-400 tabular-nums">{recTotal} of {records.length}</span>
                                </div>
                            </div>

                            {recTotal === 0 ? (
                                <div className="px-5 py-16 text-center">
                                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><AlertTriangle size={22} /></div>
                                    <p className="text-sm font-semibold text-slate-700">No accidents {recStatus !== "all" || recSource !== "all" || recSeverity !== "all" || recTypes.size > 0 || recLocation !== "all" || recSearch ? "match your filters" : "reported yet"}</p>
                                    <p className="mt-1 text-xs text-slate-400">Drivers can report from the mobile app, or add one here.</p>
                                </div>
                            ) : (<>
                                {/* Desktop table — horizontally scrollable (image-2 pattern); sortable headers,
                                    toggleable columns, sticky Action column so row actions stay reachable.
                                    Shown only at xl+ where there's room beside the sidebar; smaller widths get the cards. */}
                                <div className="hidden overflow-x-auto xl:block">
                                    <table className="w-full min-w-max text-left">
                                        <thead className="border-b border-slate-200 bg-slate-50/60">
                                            <tr>
                                                {showCol("when") && <SortTh id="when" label="When" minW="min-w-[120px] pl-5" sort={sort} onSort={toggleSort} />}
                                                {showCol("driver") && <SortTh id="driver" label="Driver" minW="min-w-[150px]" sort={sort} onSort={toggleSort} />}
                                                {showCol("type") && <SortTh id="type" label="Type" minW="min-w-[150px]" sort={sort} onSort={toggleSort} />}
                                                {showCol("location") && <SortTh id="location" label="Location" minW="min-w-[160px]" sort={sort} onSort={toggleSort} />}
                                                {showCol("severity") && <SortTh id="severity" label="Severity" minW="min-w-[100px]" sort={sort} onSort={toggleSort} />}
                                                {showCol("source") && <SortTh id="source" label="Source" minW="min-w-[110px]" sort={sort} onSort={toggleSort} />}
                                                {showCol("addedBy") && <SortTh id="addedBy" label="Added by" minW="min-w-[180px]" sort={sort} onSort={toggleSort} />}
                                                {showCol("case") && <SortTh id="case" label="Case" minW="min-w-[130px]" sort={sort} onSort={toggleSort} />}
                                                {showCol("reviewedBy") && <SortTh id="reviewedBy" label="Reviewed by" minW="min-w-[170px]" sort={sort} onSort={toggleSort} />}
                                                {showCol("claimedBy") && <SortTh id="claimedBy" label="Claimed by" minW="min-w-[170px]" sort={sort} onSort={toggleSort} />}
                                                {showCol("status") && <SortTh id="status" label="Status" minW="min-w-[120px]" sort={sort} onSort={toggleSort} />}
                                                <th className="sticky right-0 z-[2] min-w-[110px] border-l border-slate-200 bg-slate-100 px-3 py-2.5 pr-5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recRows.map(r => {
                                                const when = fmtWhen(r.dateTime);
                                                const st = ACCIDENT_STATUS_META[r.status];
                                                const src = SOURCE_META[r.source];
                                                const typeName = typesOf(r);
                                                const added = addedInfo(r);
                                                return (
                                                    <tr key={r.id} onClick={() => setViewingId(r.id)} className="group cursor-pointer border-b border-slate-100 align-middle hover:bg-slate-50/60">
                                                        {showCol("when") && (
                                                            <td className="px-3 py-3 pl-5">
                                                                <div className="whitespace-nowrap text-[13px] font-semibold text-slate-800">{when.date}</div>
                                                                <div className="text-[11px] tabular-nums text-slate-400">{when.time}</div>
                                                            </td>
                                                        )}
                                                        {showCol("driver") && (
                                                            <td className="px-3 py-3">
                                                                <div className="truncate text-[13px] font-semibold text-slate-800" title={r.driverName}>{r.driverName || "—"}</div>
                                                                <div className="flex items-center gap-1 truncate text-[11px] text-slate-400"><Truck size={10} className="shrink-0" /> {r.unitId || "—"}</div>
                                                            </td>
                                                        )}
                                                        {showCol("type") && (
                                                            <td className="px-3 py-3">
                                                                <div className="line-clamp-2 text-[12px] leading-tight text-slate-700" title={typeName}>{typeName || <span className="text-slate-300">Unclassified</span>}</div>
                                                                {r.injuries && <span className="mt-1 inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">INJURY</span>}
                                                            </td>
                                                        )}
                                                        {showCol("location") && (
                                                            <td className="px-3 py-3">
                                                                <span className="flex items-center gap-1 text-[12px] text-slate-500" title={r.location}>
                                                                    <MapPin size={11} className="shrink-0 text-slate-300" />
                                                                    <span className="max-w-[220px] truncate">{r.location || "—"}</span>
                                                                </span>
                                                            </td>
                                                        )}
                                                        {showCol("severity") && (
                                                            <td className="px-3 py-3">{r.severity ? <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", RISK_TYPE_TONE[r.severity as AccidentRiskType])}>{r.severity}</span> : <span className="text-[11px] text-slate-300">—</span>}</td>
                                                        )}
                                                        {showCol("source") && (
                                                            <td className="px-3 py-3"><span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", src.tone)}>{r.source === "driver-app" ? <Smartphone size={9} className="shrink-0" /> : <Building2 size={9} className="shrink-0" />}<span>{src.label}</span></span></td>
                                                        )}
                                                        {showCol("addedBy") && <td className="px-3 py-3"><PersonCell name={added.by} at={added.at} /></td>}
                                                        {showCol("case") && <td className="px-3 py-3"><CaseCell record={r} /></td>}
                                                        {showCol("reviewedBy") && <td className="px-3 py-3"><PersonCell name={r.verifiedBy} at={r.verifiedAt} /></td>}
                                                        {showCol("claimedBy") && <td className="px-3 py-3"><PersonCell name={r.claimedBy} at={r.claimedAt} /></td>}
                                                        {showCol("status") && (
                                                            <td className="px-3 py-3"><span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold", st.tone)}><span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", st.dot)} /><span>{st.label}</span></span></td>
                                                        )}
                                                        <td className="sticky right-0 z-[1] border-l border-slate-100 bg-white px-3 py-3 pr-5 group-hover:bg-slate-50">
                                                            <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                                                                <button type="button" title="View" onClick={() => setViewingId(r.id)}
                                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
                                                                    <Eye size={14} />
                                                                </button>
                                                                <RowActionsMenu items={[
                                                                    { label: "Edit details", icon: Pencil, onClick: () => setEditing({ rec: r, isNew: false }) },
                                                                    { label: "Delete", icon: Trash2, onClick: () => askDelete(r), danger: true },
                                                                ]} />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Card list — phones, tablets and narrow laptops (below xl) */}
                                <ul className="divide-y divide-slate-100 xl:hidden">
                                    {recRows.map(r => {
                                        const when = fmtWhen(r.dateTime);
                                        const st = ACCIDENT_STATUS_META[r.status];
                                        const src = SOURCE_META[r.source];
                                        const added = addedInfo(r);
                                        return (
                                            <li key={r.id} onClick={() => setViewingId(r.id)} className="cursor-pointer space-y-2 px-4 py-3.5">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-[13px] font-semibold text-slate-800">{r.driverName || "—"}</p>
                                                        <p className="text-[11px] text-slate-400">{when.date} · {when.time} · {r.unitId || "—"}</p>
                                                    </div>
                                                    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold", st.tone)}>{st.label}</span>
                                                </div>
                                                <p className="line-clamp-2 text-[12px] leading-snug text-slate-500">{r.description || "—"}</p>
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {typesOf(r) && <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{typesOf(r)}</span>}
                                                    {r.severity && <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", RISK_TYPE_TONE[r.severity as AccidentRiskType])}>{r.severity}</span>}
                                                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", src.tone)}>{src.label}</span>
                                                    {r.injuries && <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">Injury</span>}
                                                    {r.case && r.case.messages.length > 0 && <CaseCell record={r} />}
                                                </div>
                                                <div className="flex items-center justify-between gap-2 pt-1">
                                                    <PersonCell name={added.by} at={added.at} />
                                                    <div className="flex shrink-0 items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                                        <button type="button" title="View" onClick={() => setViewingId(r.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"><Eye size={14} /></button>
                                                        <RowActionsMenu items={[
                                                            { label: "Edit details", icon: Pencil, onClick: () => setEditing({ rec: r, isNew: false }) },
                                                            { label: "Delete", icon: Trash2, onClick: () => askDelete(r), danger: true },
                                                        ]} />

                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>

                                {/* Pagination */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
                                    <label className="flex items-center gap-1.5 text-[12px] text-slate-500">Rows per page
                                        <select value={recPageSize} onChange={e => setRecPageSize(Number(e.target.value))} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none">
                                            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </label>
                                    <div className="flex items-center gap-1">
                                        <span className="mr-2 text-[12px] text-slate-500 tabular-nums">{recStart + 1}–{Math.min(recStart + recPageSize, recTotal)} of {recTotal}</span>
                                        <button type="button" disabled={recSafePage <= 1} onClick={() => setRecPage(recSafePage - 1)} className="inline-flex h-8 items-center rounded-md border border-slate-200 px-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Prev</button>
                                        <span className="px-2 text-[12px] text-slate-600 tabular-nums">Page {recSafePage} of {recPages}</span>
                                        <button type="button" disabled={recSafePage >= recPages} onClick={() => setRecPage(recSafePage + 1)} className="inline-flex h-8 items-center rounded-md border border-slate-200 px-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                                    </div>
                                </div>
                            </>)}
                        </div>
            </div>

            {/* Delete confirmation */}
            {deleting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setDeleting(null)}>
                    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Trash2 size={18} /></div>
                            <div className="min-w-0">
                                <h3 className="text-sm font-bold text-slate-800">Delete accident record?</h3>
                                <p className="mt-1 text-[13px] leading-snug text-slate-500">
                                    This permanently removes the accident for <span className="font-semibold text-slate-700">{deleting.driverName || "this driver"}</span>
                                    {deleting.location ? <> at <span className="font-semibold text-slate-700">{deleting.location}</span></> : null}, along with its documents, evidence and activity. This can't be undone.
                                </p>
                            </div>
                        </div>
                        <div className="mt-5 flex items-center justify-end gap-2">
                            <button type="button" onClick={() => setDeleting(null)} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button type="button" onClick={confirmDelete} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-rose-700"><Trash2 size={15} /> Delete record</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
