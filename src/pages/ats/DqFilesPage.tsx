import { useEffect, useMemo, useRef, useState } from "react";
import {
    ListChecks, Users, Check, AlertTriangle, ChevronRight, Search, FileText, Eye,
    ChevronsUpDown, ChevronUp, ChevronDown, ChevronLeft as ChevronLeftIcon,
    CircleAlert, Clock, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, TabStrip, SelectFilter, type TabDef } from "./ats-ui";
import { getAccountById } from "@/pages/accounts/accounts.data";
import { getDriversForAccount } from "@/pages/accounts/carrier-drivers.data";
import type { Driver } from "@/pages/profile/carrier-profile.data";
import { SAFETY_RECORDS, isDateMonitored, type SafetyRecord } from "@/pages/compliance/safety-software-catalog.data";
import { useCustomSafetyRecords } from "@/pages/compliance/safety-custom-records.data";
import { useComplianceData, entryStatus, currentVersion, type RecordDataEntry } from "@/pages/compliance/compliance-data-store";
import { useDriverDqFiles, checklistForType } from "@/pages/dq-files/dq-driver-files.data";
import { DqFilePreview, formToRecord } from "@/pages/settings/SettingsDqChecklistBuilder";
import { assignedChecklistId } from "@/pages/settings/SettingsDqAssignDrivers";
import {
    DQ_DRIVER_TYPES, driverTypeLabel, getDqChecklist,
    type DqDriverTypeId, type DqChecklist, type DqItem,
} from "@/pages/settings/settings-dq-checklists.data";

/**
 * DQ Files — carrier-scoped per-driver Driver Qualification Files.
 * Each driver carries a DQ type (Cross Border / US Only / Canada Only); their DQ
 * file is the matching Settings checklist. Opening a driver shows the SAME UI as
 * the Settings ▸ DQ Files preview (compliances / forms record pages + fill), and
 * completion reflects the compliance store (records on file per driver).
 */

const TYPE_BADGE: Record<string, string> = {
    cross_border: "bg-violet-50 text-violet-700 border-violet-200",
    us_only: "bg-blue-50 text-blue-700 border-blue-200",
    canada_only: "bg-rose-50 text-rose-700 border-rose-200",
};
const PAGE_TABS: TabDef[] = [
    { id: "overview", label: "Overview", Icon: ListChecks },
    { id: "drivers", label: "Drivers", Icon: Users },
];
const PAGE_SIZES = [10, 25, 50, 100];

// Per-driver DQ compliance health — the document + form items on file for a driver,
// categorised against the Default Compliance store the SAME way the compliance list does:
// missing (not on file), expired (past its monitored date), expiring (≤30 days), status
// (status-monitored record with a non-good status). Custom "points" aren't store-tracked.
export type Health = {
    total: number; complete: number; missing: number;
    expired: number; expiring: number; statusAlert: number; valid: number;
    issues: number; pct: number; allGood: boolean;
};
type EntryGetter = (subjectId: string, recordId: string) => RecordDataEntry;

const EXPIRING_DAYS = 30;
const GOOD_STATUS = new Set(["active", "complete", "on file", "valid", "current"]);

function driverHealth(checklist: DqChecklist | undefined, driverId: string, getEntry: EntryGetter, recordById: Map<string, SafetyRecord>): Health {
    const items: DqItem[] = checklist ? checklist.sections.flatMap(s => s.items) : [];
    const trackable = items.filter(i => (i.source === "document" || i.source === "form") && i.requirement !== "optional");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let complete = 0, missing = 0, expired = 0, expiring = 0, statusAlert = 0, valid = 0;
    for (const it of trackable) {
        const rec = it.source === "document" ? recordById.get(it.refId ?? "") : formToRecord(it);
        if (!rec) { missing++; continue; }
        const entry = getEntry(driverId, rec.id);
        if (entryStatus(rec, entry) !== "complete") { missing++; continue; }
        complete++;
        const cur = currentVersion(entry);
        if (isDateMonitored(rec) && cur?.expiryDate) {
            const exp = new Date(cur.expiryDate + "T00:00:00");
            const days = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
            if (days < 0) expired++;
            else if (days <= EXPIRING_DAYS) expiring++;
            else valid++;
        } else {
            const s = (cur?.status ?? "").trim().toLowerCase();
            if (s && !GOOD_STATUS.has(s)) statusAlert++;
            else valid++;
        }
    }
    const total = trackable.length;
    const issues = missing + expired + expiring + statusAlert;
    const pct = total ? Math.round((complete / total) * 100) : 0;
    return { total, complete, missing, expired, expiring, statusAlert, valid, issues, pct, allGood: total > 0 && issues === 0 };
}

/**
 * Reusable per-driver DQ health resolver — wires the compliance store + custom records +
 * each driver's DQ type once, and returns a `healthFor(driver)` callable. Used by the DQ
 * Files page AND the Account ▸ Drivers roster (CarrierProfilePage) so both read the same
 * DQ progress + checklist status. Re-renders the caller when the compliance store changes.
 */
export function useDriverDqHealth(accountId?: string): (driver: Driver) => Health {
    const acct = accountId ?? "acct-001";
    const { getRecord } = useDriverDqFiles(acct);
    const { getEntry } = useComplianceData(acct); // subscribes → caller re-renders on store change
    const { records: customRecords } = useCustomSafetyRecords(acct);
    const recordById = useMemo(() => new Map<string, SafetyRecord>([...customRecords, ...SAFETY_RECORDS].map(r => [r.id, r])), [customRecords]);
    return (driver: Driver) => driverHealth(checklistForType(getRecord(driver).driverType), driver.id, getEntry, recordById);
}

export function DqFilesPage({ onNavigate, accountId }: { onNavigate?: (path: string) => void; accountId?: string } = {}) {
    const acct = accountId ?? "acct-001";
    const carrierName = getAccountById(acct)?.dbaName ?? getAccountById(acct)?.legalName ?? "—";
    const { getRecord, setType } = useDriverDqFiles(acct);
    const { getEntry, all } = useComplianceData(acct);
    const { records: customRecords } = useCustomSafetyRecords(acct);
    const recordById = useMemo(() => new Map<string, SafetyRecord>([...customRecords, ...SAFETY_RECORDS].map(r => [r.id, r])), [customRecords]);

    const [tab, setTab] = useState<"overview" | "drivers">("overview");
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

    const drivers = useMemo(() => getDriversForAccount(acct).filter(d => d.status !== "Terminated"), [acct]);

    // Rows recompute whenever the compliance store (all) or driver types change.
    const rows = useMemo(() => drivers.map(driver => {
        const driverType = getRecord(driver).driverType;
        const checklist = checklistForType(driverType);
        const comp = driverHealth(checklist, driver.id, getEntry, recordById);
        return { driver, driverType, checklist, comp };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [drivers, all, recordById]);

    const kpis = useMemo(() => {
        const total = rows.length;
        const compliant = rows.filter(r => r.comp.allGood).length;
        const missing = rows.reduce((s, r) => s + r.comp.missing, 0);
        const attention = rows.reduce((s, r) => s + r.comp.expired + r.comp.expiring + r.comp.statusAlert, 0);
        const avg = total ? Math.round(rows.reduce((s, r) => s + r.comp.pct, 0) / total) : 0;
        return { total, compliant, missing, attention, avg };
    }, [rows]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter(r => {
            if (typeFilter !== "all" && r.driverType !== typeFilter) return false;
            if (q && !r.driver.name.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [rows, search, typeFilter]);

    // ── Per-driver detail ── the new DQ UI (Settings preview) for the real driver.
    const selected = selectedDriverId ? drivers.find(d => d.id === selectedDriverId) : null;
    if (selected) {
        return (
            <DriverDqFileDetail
                driver={selected}
                accountId={acct}
                getRecord={getRecord}
                setType={setType}
                onBack={() => setSelectedDriverId(null)}
            />
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                iconGradient="from-violet-500 to-purple-600"
                Icon={ListChecks}
                title="DQ Files"
                subtitle={`Driver Qualification Files — ${carrierName}`}
            >
                <TabStrip tabs={PAGE_TABS} active={tab} onChange={id => setTab(id as "overview" | "drivers")} accent="violet" />
            </PageHeader>

            <div className="space-y-4 p-4 sm:space-y-6 sm:p-8">
                {/* KPI cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <StatTile label="Drivers" value={kpis.total} Icon={Users} accent="violet" />
                    <StatTile label="Fully Compliant" value={kpis.compliant} Icon={Check} accent="emerald" />
                    <StatTile label="Items Missing" value={kpis.missing} Icon={AlertTriangle} accent="rose" />
                    <StatTile label="Needs Attention" value={kpis.attention} Icon={Clock} accent="amber" />
                    <StatTile label="Avg Completion" value={`${kpis.avg}%`} Icon={ListChecks} accent="blue" />
                </div>

                {tab === "overview" ? (
                    <div className="space-y-4">
                        <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
                            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                            <p><span className="font-semibold">A DQ File opens for each hired driver.</span> Each driver's file uses the checklist for their driver type. Open a driver to verify items, upload records, and sign off — records are saved per driver. Manage the checklists in <button type="button" className="font-semibold underline" onClick={() => onNavigate?.("/settings/dq-files")}>Settings ▸ DQ Files</button>.</p>
                        </div>
                        <DriversTable rows={rows} carrierName={carrierName} onOpen={id => setSelectedDriverId(id)} title="Drivers — DQ completion" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Filters */}
                        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                            <div className="relative min-w-[200px] flex-1">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search drivers…"
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
                            </div>
                            <SelectFilter value={typeFilter} onChange={setTypeFilter}
                                options={[{ value: "all", label: "All driver types" }, ...DQ_DRIVER_TYPES.map(t => ({ value: t.id, label: t.label }))]} />
                            <span className="text-sm text-slate-400">{filtered.length} of {rows.length}</span>
                        </div>
                        <DriversTable rows={filtered} carrierName={carrierName} onOpen={id => setSelectedDriverId(id)} noMatch={rows.length > 0} />
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Drivers table (sortable + paginated; desktop table + mobile cards) ────────────
type Row = { driver: Driver; driverType: DqDriverTypeId; checklist: DqChecklist | undefined; comp: Health };
type SortCol = "name" | "type" | "items" | "issues" | "pct";

function DriversTable({ rows, carrierName, onOpen, title, noMatch }: {
    rows: Row[]; carrierName: string; onOpen: (id: string) => void; title?: string; noMatch?: boolean;
}) {
    const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" } | null>(null);
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    useEffect(() => setPage(1), [pageSize, rows.length]);

    const sortValue = (r: Row, col: SortCol): string | number =>
        col === "name" ? r.driver.name.toLowerCase()
            : col === "type" ? driverTypeLabel(r.driverType)
                : col === "items" ? r.comp.total
                    : col === "issues" ? r.comp.issues
                        : r.comp.pct;
    const sorted = useMemo(() => {
        if (!sort) return rows;
        const arr = [...rows];
        arr.sort((a, b) => {
            const av = sortValue(a, sort.col), bv = sortValue(b, sort.col);
            const c = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
            return sort.dir === "asc" ? c : -c;
        });
        return arr;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, sort]);
    const toggleSort = (col: SortCol) => setSort(p => (p && p.col === col ? (p.dir === "asc" ? { col, dir: "desc" } : null) : { col, dir: "asc" }));

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIdx = (safePage - 1) * pageSize;
    const pageRows = sorted.slice(startIdx, startIdx + pageSize);

    if (rows.length === 0) {
        return (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {noMatch ? <p className="px-5 py-12 text-center text-sm text-slate-400">No drivers match your filters.</p> : <EmptyDrivers carrierName={carrierName} />}
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {title && (
                <div className="border-b border-slate-200 px-5 py-3">
                    <p className="text-sm font-semibold text-slate-700">{title} <span className="ml-1 font-normal text-slate-400">{rows.length}</span></p>
                </div>
            )}
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[880px]">
                    <thead className="border-b border-slate-200 bg-slate-50/50">
                        <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <SortTh col="name" label="Driver" sort={sort} onSort={toggleSort} className="pl-5" />
                            <SortTh col="type" label="Type" sort={sort} onSort={toggleSort} className="w-28" />
                            <SortTh col="items" label="Items" sort={sort} onSort={toggleSort} className="w-16 justify-center text-center" />
                            <SortTh col="issues" label="Compliance Checklist" sort={sort} onSort={toggleSort} className="min-w-[240px]" />
                            <SortTh col="pct" label="DQ Progress" sort={sort} onSort={toggleSort} className="w-48" />
                            <th className="w-20 px-4 py-2.5 pr-5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.map(r => (
                            <tr key={r.driver.id} onClick={() => onOpen(r.driver.id)}
                                className="cursor-pointer border-b border-slate-100 align-middle transition-colors hover:bg-violet-50/50">
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[12px] font-bold text-slate-600">{r.driver.avatarInitials}</div>
                                        <div className="min-w-0">
                                            <p className="truncate text-[14px] font-semibold text-slate-900">{r.driver.name}</p>
                                            <p className="truncate text-[11px] text-slate-500">{r.driver.licenseState} · {r.driver.status}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-3 py-3"><TypeBadge type={r.driverType} /></td>
                                <td className="px-3 py-3 text-center text-[13px] font-semibold tabular-nums text-slate-700">{r.comp.total}</td>
                                <td className="px-3 py-3"><ComplianceChecklist h={r.comp} hasChecklist={!!r.checklist} /></td>
                                <td className="px-3 py-3">
                                    <div className="flex items-center gap-2.5">
                                        <CompletionBar h={r.comp} />
                                        <span className="w-9 text-right text-[13px] font-bold tabular-nums text-slate-700">{r.comp.pct}%</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 pr-5 text-right">
                                    <button type="button" title="Open DQ file" onClick={e => { e.stopPropagation(); onOpen(r.driver.id); }}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600"><Eye size={14} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-slate-100 lg:hidden">
                {pageRows.map(r => (
                    <li key={r.driver.id}>
                        <button type="button" onClick={() => onOpen(r.driver.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-violet-50/50">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-bold text-slate-600">{r.driver.avatarInitials}</div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="truncate font-semibold text-slate-900">{r.driver.name}</span>
                                    <TypeBadge type={r.driverType} />
                                </div>
                                <div className="mt-1.5 flex items-center gap-2">
                                    <CompletionBar h={r.comp} />
                                    <span className="text-[12px] font-bold tabular-nums text-slate-700">{r.comp.pct}%</span>
                                </div>
                                <div className="mt-1.5"><ComplianceChecklist h={r.comp} hasChecklist={!!r.checklist} /></div>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 self-center text-slate-300" />
                        </button>
                    </li>
                ))}
            </ul>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
                <div className="flex items-center gap-3 text-[12px] text-slate-500">
                    <label className="flex items-center gap-1.5">Rows per page
                        <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none">
                            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </label>
                    <span className="tabular-nums">{total === 0 ? "0" : `${startIdx + 1}–${Math.min(startIdx + pageSize, total)}`} of {total}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeftIcon size={14} /> Prev</button>
                    <span className="px-2 text-[12px] text-slate-600 tabular-nums">Page {safePage} of {totalPages}</span>
                    <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight size={14} /></button>
                </div>
            </div>
        </div>
    );
}

function SortTh({ col, label, sort, onSort, className }: {
    col: SortCol; label: string; sort: { col: SortCol; dir: "asc" | "desc" } | null;
    onSort: (col: SortCol) => void; className?: string;
}) {
    const active = sort?.col === col;
    const Icon = !active ? ChevronsUpDown : sort!.dir === "asc" ? ChevronUp : ChevronDown;
    return (
        <th className={cn("px-3 py-2.5", className)}>
            <button type="button" onClick={() => onSort(col)} className="inline-flex items-center gap-1 font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700">
                {label}<Icon size={12} className={active ? "text-slate-600" : "text-slate-300"} />
            </button>
        </th>
    );
}

// KPI tile — the "New Compliance & Documents" / Monitoring-settings pattern:
// left colour accent + icon square + label, big number on the right.
const STAT_ACCENT = {
    slate: { border: "border-l-slate-400", iconBg: "bg-slate-100", iconColor: "text-slate-600" },
    blue: { border: "border-l-blue-500", iconBg: "bg-blue-50", iconColor: "text-blue-600" },
    violet: { border: "border-l-violet-500", iconBg: "bg-violet-50", iconColor: "text-violet-600" },
    emerald: { border: "border-l-emerald-500", iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    amber: { border: "border-l-amber-500", iconBg: "bg-amber-50", iconColor: "text-amber-600" },
    rose: { border: "border-l-rose-500", iconBg: "bg-rose-50", iconColor: "text-rose-600" },
} as const;
function StatTile({ label, value, Icon, accent }: { label: string; value: React.ReactNode; Icon: React.ElementType; accent: keyof typeof STAT_ACCENT }) {
    const cls = STAT_ACCENT[accent];
    return (
        <div className={cn("flex items-center justify-between gap-3 rounded-xl border border-l-4 border-slate-200 bg-white p-3 shadow-sm", cls.border)}>
            <div className="min-w-0">
                <div className={cn("mb-2 flex h-8 w-8 items-center justify-center rounded-lg", cls.iconBg)}><Icon size={14} className={cls.iconColor} /></div>
                <div className="text-[10px] font-bold uppercase leading-tight tracking-wider text-slate-500">{label}</div>
            </div>
            <div className="text-2xl font-black leading-none tabular-nums text-slate-900">{value}</div>
        </div>
    );
}

// DQ progress bar — % of required items on file. Colour reflects HEALTH, not just fill:
// emerald = fully compliant, amber = on file but items expired/expiring/status, violet = still missing.
// A tiny non-zero % keeps a visible sliver (min 6%).
export function CompletionBar({ h }: { h: Health }) {
    const tone = h.allGood ? "bg-emerald-500" : h.missing > 0 ? "bg-violet-500" : "bg-amber-500";
    const w = h.pct <= 0 ? 0 : Math.max(h.pct, 6);
    return (
        <div className="h-2 w-full max-w-[130px] overflow-hidden rounded-full bg-slate-100">
            <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${w}%` }} />
        </div>
    );
}

// Compliance Checklist — the DQ file's items rolled up against the Default Compliance store:
// what's missing, expired, about to expire, or has a status change. All-clear shows a single chip.
const CHIP_TONE: Record<string, string> = {
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    red: "border-red-200 bg-red-50 text-red-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
};
function StatusChip({ tone, Icon, n, label }: { tone: keyof typeof CHIP_TONE; Icon: React.ElementType; n: number; label: string }) {
    return (
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums", CHIP_TONE[tone])}>
            <Icon className="h-3 w-3" /> {n} {label}
        </span>
    );
}
export function ComplianceChecklist({ h, hasChecklist }: { h: Health; hasChecklist: boolean }) {
    if (!hasChecklist || h.total === 0) return <span className="text-[11px] font-medium text-slate-400">No checklist</span>;
    if (h.allGood) return <StatusChip tone="emerald" Icon={Check} n={h.total} label="valid" />;
    return (
        <div className="flex flex-wrap gap-1">
            {h.missing > 0 && <StatusChip tone="rose" Icon={AlertTriangle} n={h.missing} label="missing" />}
            {h.expired > 0 && <StatusChip tone="red" Icon={CircleAlert} n={h.expired} label="expired" />}
            {h.expiring > 0 && <StatusChip tone="amber" Icon={Clock} n={h.expiring} label="expiring" />}
            {h.statusAlert > 0 && <StatusChip tone="blue" Icon={Activity} n={h.statusAlert} label="status" />}
        </div>
    );
}

function TypeBadge({ type }: { type: DqDriverTypeId }) {
    return <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold", TYPE_BADGE[type] ?? "bg-slate-50 text-slate-600 border-slate-200")}>{driverTypeLabel(type)}</span>;
}

function EmptyDrivers({ carrierName }: { carrierName: string }) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-500"><Users className="h-7 w-7" /></div>
            <h3 className="mt-5 text-base font-semibold text-slate-700">No drivers for {carrierName}</h3>
            <p className="mt-1.5 max-w-md text-sm text-slate-500">A DQ file opens for each hired driver. Once this carrier has drivers, they'll appear here.</p>
        </div>
    );
}

// ── Per-driver DQ file detail = the Settings preview UI, scoped to the driver ──────
function DriverDqFileDetail({ driver, accountId, getRecord, setType, onBack }: {
    driver: Driver;
    accountId: string;
    getRecord: (d: Driver) => { driverType: DqDriverTypeId };
    setType: (d: Driver, t: DqDriverTypeId) => void;
    onBack: () => void;
}) {
    const driverType = getRecord(driver).driverType;
    const { records: customRecords } = useCustomSafetyRecords(accountId);
    const allRecords = useMemo(() => [...customRecords, ...SAFETY_RECORDS], [customRecords]);

    // Local, editable copy of the checklist so the requirement dropdowns work per-session
    // without mutating the shared template. Reset when the driver's type changes.
    const [cl, setCl] = useState<DqChecklist | undefined>(() => checklistForType(driverType));
    const lastType = useRef(driverType);
    useEffect(() => {
        if (lastType.current !== driverType) { lastType.current = driverType; setCl(checklistForType(driverType)); }
    }, [driverType]);
    const patchItem = (itemId: string, patch: Partial<DqItem>) =>
        setCl(c => c ? { ...c, sections: c.sections.map(s => ({ ...s, items: s.items.map(i => i.id === itemId ? { ...i, ...patch } : i) })) } : c);

    const typeSelector = (
        <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-500">
            Driver type
            <select value={driverType} onChange={e => setType(driver, e.target.value as DqDriverTypeId)}
                className="rounded-md bg-white text-[12px] font-semibold text-slate-700 focus:outline-none">
                {DQ_DRIVER_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
        </label>
    );

    if (!cl) {
        return (
            <div className="min-h-screen bg-slate-50 p-8">
                <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeftIcon className="h-4 w-4" /> DQ Files</button>
                <div className="flex max-w-md flex-col items-center rounded-2xl border border-amber-200 bg-amber-50 px-6 py-12 text-center text-amber-900">
                    <AlertTriangle className="h-7 w-7" />
                    <p className="mt-3 text-sm">No checklist is defined for <span className="font-semibold">{driverTypeLabel(driverType)}</span>. Create one in Settings ▸ DQ Files.</p>
                </div>
            </div>
        );
    }

    return (
        <DqFilePreview
            cl={cl}
            records={allRecords}
            accountId={accountId}
            subjectId={driver.id}
            subjectLabel={driver.name}
            initialDriverName={driver.name}
            title={`${driver.name} — DQ File`}
            subtitle={`${driverTypeLabel(driverType)} · Verify items, open / upload records and sign off — saved for this driver.`}
            headerRight={typeSelector}
            backLabel="DQ Files"
            onPatchItem={patchItem}
            onBack={onBack}
        />
    );
}

// ── Embeddable per-driver DQ file (driver profile ▸ DQ Files tab) ──────────────────
// Every driver has a DQ file: an EXPLICIT Settings assignment (Settings ▸ DQ Files ▸
// Drivers) wins; otherwise it falls back to the DQ file for the driver's type — the
// same resolution the main DQ Files page uses, so a driver is never left without one.
// Records persist per driver in the compliance store (same subject the main page uses).
export function DriverDqFile({ driverId, driverName, accountId, onNavigate, formsOnly }: {
    driverId: string; driverName: string; accountId?: string; onNavigate?: (path: string) => void;
    // Forms-only view (driver profile ▸ Forms tab) — reuses the same fill/upload module + data.
    formsOnly?: boolean;
}) {
    const { getRecord } = useDriverDqFiles(accountId);
    const { records: customRecords } = useCustomSafetyRecords(accountId);
    const allRecords = useMemo(() => [...customRecords, ...SAFETY_RECORDS], [customRecords]);

    const driver = useMemo(() => (accountId ? getDriversForAccount(accountId).find(d => d.id === driverId) : undefined), [accountId, driverId]);
    const assignedCid = assignedChecklistId(driverId);
    const explicit = assignedCid ? getDqChecklist(assignedCid) : undefined;
    const driverType: DqDriverTypeId = driver ? getRecord(driver).driverType : "us_only";
    const resolved = explicit ?? checklistForType(driverType);
    const isDefault = !explicit && !!resolved; // fell back to the driver-type default

    const [cl, setCl] = useState<DqChecklist | undefined>(resolved);
    const lastId = useRef(resolved?.id);
    useEffect(() => { if (lastId.current !== resolved?.id) { lastId.current = resolved?.id; setCl(resolved); } }, [resolved?.id]);
    const patchItem = (itemId: string, patch: Partial<DqItem>) =>
        setCl(c => c ? { ...c, sections: c.sections.map(s => ({ ...s, items: s.items.map(i => i.id === itemId ? { ...i, ...patch } : i) })) } : c);

    // Only when NO DQ file resolves at all (no assignment and no checklist for the type,
    // e.g. every seed checklist was deleted). Offer a direct jump to Settings ▸ DQ Files.
    if (!resolved || !cl) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-500"><ListChecks className="h-6 w-6" /></div>
                <h3 className="mt-4 text-base font-semibold text-slate-700">{formsOnly ? "No forms available" : "No DQ file available"}</h3>
                <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">There's no {formsOnly ? "form set" : "DQ file"} for {driverName || "this driver"}'s type yet. Create or assign one in <span className="font-semibold">Settings ▸ DQ Files</span> — each driver belongs to one DQ file.</p>
                {onNavigate && (
                    <button type="button" onClick={() => onNavigate("/settings/dq-files")}
                        className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700">
                        <ListChecks className="h-4 w-4" /> Go to DQ Files settings
                    </button>
                )}
            </div>
        );
    }

    const headerRight = (
        <div className="flex flex-wrap items-center gap-2">
            {isDefault && (
                <span className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-[12px] font-semibold text-slate-500">
                    Default · {driverTypeLabel(driverType)}
                </span>
            )}
            {onNavigate && (
                <button type="button" onClick={() => onNavigate("/settings/dq-files")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700">
                    <ListChecks className="h-4 w-4" /> {isDefault ? "Assign in Settings" : "Manage in Settings"}
                </button>
            )}
        </div>
    );

    return (
        <DqFilePreview
            embedded
            formsOnly={formsOnly}
            cl={cl}
            records={allRecords}
            accountId={accountId}
            subjectId={driverId}
            subjectLabel={driverName || "Driver"}
            initialDriverName={driverName}
            title={formsOnly ? "Forms" : cl.name}
            subtitle={formsOnly ? "Consent & onboarding forms for this driver — fill in-system or upload a signed copy. Same records as the DQ file." : undefined}
            headerRight={headerRight}
            onPatchItem={patchItem}
            onBack={() => { /* embedded — no back */ }}
        />
    );
}
