import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle, ShieldCheck, Search, Plus, Clock, BadgeCheck,
    MapPin, Truck, Smartphone, Building2, ListChecks, Sparkles, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, KpiTile } from "@/pages/ats/ats-ui";
import {
    ACCIDENT_TYPES, RISK_TYPE_TONE,
    type AccidentRiskType,
} from "@/data/accident-types.data";
import {
    useAccidentRecords, ACCIDENT_STATUS_META, SOURCE_META, newAccidentId, carrierOwnerInfo,
    type AccidentRecord, type AccidentStatus, type AccidentSource, type AccidentOwnerInfo,
} from "@/data/accident-records.data";
import { AccidentRecordPage } from "./AccidentRecordPage";
import { AccidentDetailPage } from "./AccidentDetailPage";

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
function fmtWhen(dt: string): { date: string; time: string } {
    const [d, t] = (dt || "").split("T");
    if (!d) return { date: dt || "—", time: "" };
    const [y, m, day] = d.split("-");
    return { date: `${MONTHS[Number(m) - 1] ?? m} ${Number(day)}, ${y}`, time: t ?? "" };
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

export function DefaultAccidentsPage({ accountId, currentUserName = "Manager" }: { accountId?: string; currentUserName?: string } = {}) {
    const { records, add, update, remove, loadSample } = useAccidentRecords(accountId);
    const owner = useMemo(() => carrierOwnerInfo(accountId), [accountId]);

    // ── Records view state ─────────────────────────────────────────
    const [recSearch, setRecSearch] = useState("");
    const [recStatus, setRecStatus] = useState<AccidentStatus | "all">("all");
    const [recSource, setRecSource] = useState<AccidentSource | "all">("all");
    const [recSeverity, setRecSeverity] = useState<AccidentRiskType | "all">("all");
    const [showHistorical, setShowHistorical] = useState(true);
    const [recPageSize, setRecPageSize] = useState(25);
    const [recPage, setRecPage] = useState(1);
    const [editing, setEditing] = useState<{ rec: AccidentRecord; isNew: boolean } | null>(null);
    const [viewingId, setViewingId] = useState<string | null>(null);
    const viewing = viewingId ? records.find(r => r.id === viewingId) ?? null : null;

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
            if (!showHistorical && r.status === "verified") return false;
            if (q && !`${r.driverName} ${r.location} ${typeLabel(r.accidentTypeId)} ${r.unitId} ${r.claimNumber ?? ""}`.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [records, recSearch, recStatus, recSource, recSeverity, showHistorical]);

    useEffect(() => { setRecPage(1); }, [recSearch, recStatus, recSource, recSeverity, showHistorical, recPageSize]);
    const recTotal = filteredRecords.length;
    const recPages = Math.max(1, Math.ceil(recTotal / recPageSize));
    const recSafePage = Math.min(recPage, recPages);
    const recStart = (recSafePage - 1) * recPageSize;
    const recRows = filteredRecords.slice(recStart, recStart + recPageSize);

    // Dedicated full-page editor replaces the list while adding / reviewing an accident.
    if (editing) {
        return (
            <AccidentRecordPage
                initial={editing.rec}
                isNew={editing.isNew}
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
                onBack={() => setViewingId(null)}
                onEdit={() => { setEditing({ rec: viewing, isNew: false }); setViewingId(null); }}
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
                {/* KPI cards */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <KpiTile label="Total Accidents" value={recKpis.total} accent="bg-slate-500" Icon={AlertTriangle} />
                    <KpiTile label="Reported" value={recKpis.reported} accent="bg-amber-500" Icon={Clock} />
                    <KpiTile label="Under Review" value={recKpis.review} accent="bg-blue-500" Icon={ListChecks} />
                    <KpiTile label="Verified" value={recKpis.verified} accent="bg-emerald-500" Icon={BadgeCheck} />
                </div>

                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            {/* Toolbar */}
                            <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="relative w-full sm:w-80">
                                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input value={recSearch} onChange={e => setRecSearch(e.target.value)} placeholder="Search driver, location, type, unit…"
                                        className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <select value={recStatus} onChange={e => setRecStatus(e.target.value as AccidentStatus | "all")}
                                        className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:outline-none">
                                        <option value="all">All statuses</option>
                                        <option value="reported">Reported</option>
                                        <option value="review">Under review</option>
                                        <option value="verified">Verified</option>
                                    </select>
                                    <select value={recSource} onChange={e => setRecSource(e.target.value as AccidentSource | "all")}
                                        className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:outline-none">
                                        <option value="all">All sources</option>
                                        <option value="driver-app">Driver app</option>
                                        <option value="office">Office</option>
                                    </select>
                                    <select value={recSeverity} onChange={e => setRecSeverity(e.target.value as AccidentRiskType | "all")}
                                        className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:outline-none">
                                        <option value="all">All severities</option>
                                        {(["Critical", "High", "Medium", "Low", "Info"] as AccidentRiskType[]).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
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
                                    <p className="text-sm font-semibold text-slate-700">No accidents {recStatus !== "all" || recSource !== "all" || recSearch ? "match your filters" : "reported yet"}</p>
                                    <p className="mt-1 text-xs text-slate-400">Drivers can report from the mobile app, or add one here.</p>
                                </div>
                            ) : (<>
                                {/* Desktop table — fixed layout so it always fits without a horizontal scrollbar */}
                                <div className="hidden lg:block">
                                    <table className="w-full table-fixed">
                                        <colgroup>
                                            <col className="w-[10%]" />
                                            <col className="w-[16%]" />
                                            <col className="w-[16%]" />
                                            <col className="w-[18%]" />
                                            <col className="w-[8%]" />
                                            <col className="w-[10%]" />
                                            <col className="w-[11%]" />
                                            <col className="w-[11%]" />
                                        </colgroup>
                                        <thead className="border-b border-slate-200 bg-slate-50/50">
                                            <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                <th className="px-3 py-2.5 pl-5">When</th>
                                                <th className="px-3 py-2.5">Driver</th>
                                                <th className="px-3 py-2.5">Type</th>
                                                <th className="px-3 py-2.5">Location</th>
                                                <th className="px-3 py-2.5">Severity</th>
                                                <th className="px-3 py-2.5">Source</th>
                                                <th className="px-3 py-2.5">Status</th>
                                                <th className="px-3 py-2.5 pr-5 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recRows.map(r => {
                                                const when = fmtWhen(r.dateTime);
                                                const st = ACCIDENT_STATUS_META[r.status];
                                                const src = SOURCE_META[r.source];
                                                const typeName = typeLabel(r.accidentTypeId);
                                                return (
                                                    <tr key={r.id} onClick={() => setViewingId(r.id)} className="cursor-pointer border-b border-slate-100 align-middle hover:bg-slate-50/60">
                                                        <td className="px-3 py-3 pl-5">
                                                            <div className="whitespace-nowrap text-[13px] font-semibold text-slate-800">{when.date}</div>
                                                            <div className="text-[11px] tabular-nums text-slate-400">{when.time}</div>
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <div className="truncate text-[13px] font-semibold text-slate-800" title={r.driverName}>{r.driverName || "—"}</div>
                                                            <div className="flex items-center gap-1 truncate text-[11px] text-slate-400"><Truck size={10} className="shrink-0" /> {r.unitId || "—"}</div>
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <div className="line-clamp-2 text-[12px] leading-tight text-slate-700" title={typeName}>{typeName || <span className="text-slate-300">Unclassified</span>}</div>
                                                            {r.injuries && <span className="mt-1 inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">INJURY</span>}
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <span className="flex items-center gap-1 text-[12px] text-slate-500" title={r.location}>
                                                                <MapPin size={11} className="shrink-0 text-slate-300" />
                                                                <span className="truncate">{r.location || "—"}</span>
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-3">{r.severity ? <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", RISK_TYPE_TONE[r.severity as AccidentRiskType])}>{r.severity}</span> : <span className="text-[11px] text-slate-300">—</span>}</td>
                                                        <td className="px-3 py-3"><span className={cn("inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", src.tone)}>{r.source === "driver-app" ? <Smartphone size={9} className="shrink-0" /> : <Building2 size={9} className="shrink-0" />}<span className="truncate">{src.label}</span></span></td>
                                                        <td className="px-3 py-3"><span className={cn("inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold", st.tone)}><span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", st.dot)} /><span className="truncate">{st.label}</span></span></td>
                                                        <td className="px-3 py-3 pr-5 text-right">
                                                            <button type="button" title={r.status === "verified" ? "View" : "Review & verify"} onClick={e => { e.stopPropagation(); setViewingId(r.id); }}
                                                                className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-semibold",
                                                                    r.status === "verified" ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" : "bg-emerald-600 text-white hover:bg-emerald-700")}>
                                                                {r.status === "verified" ? <><Eye size={12} /> View</> : <><ShieldCheck size={12} /> Review</>}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile cards */}
                                <ul className="divide-y divide-slate-100 lg:hidden">
                                    {recRows.map(r => {
                                        const when = fmtWhen(r.dateTime);
                                        const st = ACCIDENT_STATUS_META[r.status];
                                        const src = SOURCE_META[r.source];
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
                                                    {typeLabel(r.accidentTypeId) && <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{typeLabel(r.accidentTypeId)}</span>}
                                                    {r.severity && <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", RISK_TYPE_TONE[r.severity as AccidentRiskType])}>{r.severity}</span>}
                                                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", src.tone)}>{src.label}</span>
                                                    {r.injuries && <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">Injury</span>}
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
        </div>
    );
}
