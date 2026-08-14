import { useEffect, useMemo, useRef, useState } from "react";
import {
    ListChecks, Users, Check, AlertTriangle, ChevronRight, Search, FileText, Eye,
    ChevronsUpDown, ChevronUp, ChevronDown, ChevronLeft as ChevronLeftIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, TabStrip, SelectFilter, type TabDef } from "./ats-ui";
import { getAccountById } from "@/pages/accounts/accounts.data";
import { getDriversForAccount } from "@/pages/accounts/carrier-drivers.data";
import type { Driver } from "@/pages/profile/carrier-profile.data";
import { SAFETY_RECORDS, type SafetyRecord } from "@/pages/compliance/safety-software-catalog.data";
import { useCustomSafetyRecords } from "@/pages/compliance/safety-custom-records.data";
import { useComplianceData, entryStatus, type RecordDataEntry } from "@/pages/compliance/compliance-data-store";
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

type Completion = { total: number; present: number; missing: number; pct: number; complete: boolean };
type EntryGetter = (subjectId: string, recordId: string) => RecordDataEntry;

// Completion from the compliance store — the document + form items on file for a driver.
// (Custom "points" are manual reminders shown in the detail; they aren't store-tracked.)
function driverCompletion(checklist: DqChecklist | undefined, driverId: string, getEntry: EntryGetter, recordById: Map<string, SafetyRecord>): Completion {
    const items: DqItem[] = checklist ? checklist.sections.flatMap(s => s.items) : [];
    const trackable = items.filter(i => (i.source === "document" || i.source === "form") && i.requirement !== "optional");
    let present = 0;
    for (const it of trackable) {
        const rec = it.source === "document" ? recordById.get(it.refId ?? "") : formToRecord(it);
        if (rec && entryStatus(rec, getEntry(driverId, rec.id)) === "complete") present++;
    }
    const total = trackable.length;
    const pct = total ? Math.round((present / total) * 100) : 0;
    return { total, present, missing: total - present, pct, complete: total > 0 && present === total };
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
        const comp = driverCompletion(checklist, driver.id, getEntry, recordById);
        return { driver, driverType, checklist, comp };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [drivers, all, recordById]);

    const kpis = useMemo(() => {
        const total = rows.length;
        const complete = rows.filter(r => r.comp.complete).length;
        const missing = rows.reduce((s, r) => s + r.comp.missing, 0);
        const avg = total ? Math.round(rows.reduce((s, r) => s + r.comp.pct, 0) / total) : 0;
        return { total, complete, missing, avg };
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatTile label="Drivers" value={kpis.total} Icon={Users} accent="violet" />
                    <StatTile label="DQ Complete" value={kpis.complete} Icon={Check} accent="emerald" />
                    <StatTile label="Items Missing" value={kpis.missing} Icon={AlertTriangle} accent="amber" />
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
type Row = { driver: Driver; driverType: DqDriverTypeId; checklist: DqChecklist | undefined; comp: Completion };
type SortCol = "name" | "type" | "items" | "missing" | "pct";

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
                    : col === "missing" ? r.comp.missing
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
                <table className="w-full min-w-[760px]">
                    <thead className="border-b border-slate-200 bg-slate-50/50">
                        <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <SortTh col="name" label="Driver" sort={sort} onSort={toggleSort} className="pl-5" />
                            <SortTh col="type" label="Type" sort={sort} onSort={toggleSort} className="w-28" />
                            <SortTh col="items" label="Items" sort={sort} onSort={toggleSort} className="w-16 justify-center text-center" />
                            <SortTh col="missing" label="Missing" sort={sort} onSort={toggleSort} className="w-20 justify-center text-center" />
                            <SortTh col="pct" label="Completion" sort={sort} onSort={toggleSort} className="w-52" />
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
                                <td className="px-3 py-3 text-center">
                                    {!r.checklist ? <span className="text-[11px] font-semibold text-slate-400">—</span>
                                        : r.comp.complete ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">0</span>
                                            : <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 tabular-nums">{r.comp.missing}</span>}
                                </td>
                                <td className="px-3 py-3">
                                    <div className="flex items-center gap-2.5">
                                        <CompletionBar pct={r.comp.pct} complete={r.comp.complete} />
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
                                <div className="mt-1 flex items-center gap-2">
                                    <CompletionBar pct={r.comp.pct} complete={r.comp.complete} />
                                    <span className="text-[12px] font-bold tabular-nums text-slate-700">{r.comp.pct}%</span>
                                    {!r.comp.complete && r.checklist && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">{r.comp.missing} missing</span>}
                                </div>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
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

function CompletionBar({ pct, complete }: { pct: number; complete: boolean }) {
    return (
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
            <div className={cn("h-full rounded-full", complete ? "bg-emerald-500" : "bg-violet-500")} style={{ width: `${pct}%` }} />
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
