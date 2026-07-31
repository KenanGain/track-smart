import { useMemo, useState } from "react";
import {
    ListChecks, Users, Check, AlertTriangle, ChevronRight, ChevronLeft,
    Eye, FlaskConical, Printer, Search, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, TabStrip, KpiTile, SelectFilter, type TabDef } from "./ats-ui";
import { getAccountById } from "@/pages/accounts/accounts.data";
import { getDriversForAccount } from "@/pages/accounts/carrier-drivers.data";
import type { Driver } from "@/pages/profile/carrier-profile.data";
import { DqFileDocument } from "@/pages/dq-files/DqFileDocument";
import {
    useDriverDqFiles, checklistForType, computeCompletion, loadCatalog,
    type DqFileFill,
} from "@/pages/dq-files/dq-driver-files.data";
import {
    DQ_DRIVER_TYPES, driverTypeLabel,
    type DqDriverTypeId,
} from "@/pages/settings/settings-dq-checklists.data";

/**
 * DQ Files — carrier-scoped per-driver Driver Qualification Files.
 * Each driver carries a DQ type (Cross Border / US Only / Canada Only); their DQ
 * file is rendered from the matching Settings checklist, with per-driver progress
 * saved. Scoped to the carrier selected in the top switcher (accountId).
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

function CompletionBar({ pct, complete }: { pct: number; complete: boolean }) {
    return (
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
            <div className={cn("h-full rounded-full", complete ? "bg-emerald-500" : "bg-blue-500")} style={{ width: `${pct}%` }} />
        </div>
    );
}

function TypeBadge({ type }: { type: DqDriverTypeId }) {
    return <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold", TYPE_BADGE[type] ?? "bg-slate-50 text-slate-600 border-slate-200")}>{driverTypeLabel(type)}</span>;
}

export function DqFilesPage({ onNavigate, accountId }: { onNavigate?: (path: string) => void; accountId?: string } = {}) {
    const acct = accountId ?? "acct-001";
    const carrierName = getAccountById(acct)?.dbaName ?? getAccountById(acct)?.legalName ?? "—";
    const catalog = useMemo(() => loadCatalog(), []);
    const { records, getRecord, setType, setFill } = useDriverDqFiles(acct);

    const [tab, setTab] = useState<"overview" | "drivers">("overview");
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

    const drivers = useMemo(() => getDriversForAccount(acct).filter(d => d.status !== "Terminated"), [acct]);

    // Rows recompute whenever the per-driver records change.
    const rows = useMemo(() => drivers.map(driver => {
        const rec = getRecord(driver);
        const checklist = checklistForType(rec.driverType);
        const comp = computeCompletion(rec, checklist);
        return { driver, rec, checklist, comp };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [drivers, records]);

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
            if (typeFilter !== "all" && r.rec.driverType !== typeFilter) return false;
            if (q && !r.driver.name.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [rows, search, typeFilter]);

    // ── Per-driver detail ──
    const selected = selectedDriverId ? drivers.find(d => d.id === selectedDriverId) : null;
    if (selected) {
        return (
            <DriverDqFileDetail
                driver={selected}
                accountId={acct}
                catalog={catalog}
                carrierName={carrierName}
                getRecord={getRecord}
                setType={setType}
                setFill={setFill}
                onBack={() => setSelectedDriverId(null)}
                onNavigate={onNavigate}
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

            {/* KPI strip */}
            <div className="border-b border-slate-200 bg-white px-8 py-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <KpiTile label="Drivers" value={kpis.total} accent="bg-violet-500" Icon={Users} />
                    <KpiTile label="DQ Complete" value={kpis.complete} accent="bg-emerald-500" tone="text-emerald-700" Icon={Check} />
                    <KpiTile label="Items Missing" value={kpis.missing} accent="bg-amber-500" tone="text-amber-700" Icon={AlertTriangle} />
                    <KpiTile label="Avg Completion" value={`${kpis.avg}%`} accent="bg-blue-500" tone="text-blue-700" Icon={ListChecks} />
                </div>
            </div>

            <div className="p-8">
                {tab === "overview" ? (
                    <div className="space-y-4">
                        <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
                            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                            <p><span className="font-semibold">A DQ File opens for each hired driver.</span> Each driver's file uses the checklist for their driver type. Open a driver to verify items, add notes, and sign off — progress is saved per driver. Manage the checklists in <button type="button" className="font-semibold underline" onClick={() => onNavigate?.("/settings/dq-files")}>Settings ▸ DQ Files</button>.</p>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                                <p className="text-sm font-semibold text-slate-700">Drivers — DQ completion <span className="ml-1 font-normal text-slate-400">{rows.length}</span></p>
                                <button type="button" onClick={() => setTab("drivers")} className="text-sm font-semibold text-blue-600 hover:text-blue-700">View all →</button>
                            </div>
                            {rows.length === 0 ? (
                                <EmptyDrivers carrierName={carrierName} />
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {rows.slice(0, 8).map(r => <DriverRow key={r.driver.id} row={r} onOpen={() => setSelectedDriverId(r.driver.id)} />)}
                                </ul>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Filters */}
                        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                            <div className="relative min-w-[220px] flex-1">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search drivers…"
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                            <SelectFilter value={typeFilter} onChange={setTypeFilter}
                                options={[{ value: "all", label: "All driver types" }, ...DQ_DRIVER_TYPES.map(t => ({ value: t.id, label: t.label }))]} />
                            <span className="text-sm text-slate-400">{filtered.length} of {rows.length}</span>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            {filtered.length === 0 ? (
                                rows.length === 0 ? <EmptyDrivers carrierName={carrierName} /> : <p className="px-5 py-12 text-center text-sm text-slate-400">No drivers match your filters.</p>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {filtered.map(r => <DriverRow key={r.driver.id} row={r} onOpen={() => setSelectedDriverId(r.driver.id)} />)}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
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

type Row = { driver: Driver; rec: { driverType: DqDriverTypeId }; checklist: ReturnType<typeof checklistForType>; comp: ReturnType<typeof computeCompletion> };

function DriverRow({ row, onOpen }: { row: Row; onOpen: () => void }) {
    const { driver, rec, checklist, comp } = row;
    return (
        <li>
            <button type="button" onClick={onOpen} className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-slate-50/70">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-bold text-white shadow-sm">
                    {driver.avatarInitials}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{driver.name}</span>
                        <TypeBadge type={rec.driverType} />
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-slate-500">{driver.licenseState} · {driver.status}</p>
                </div>
                <div className="hidden items-center gap-3 sm:flex">
                    {!checklist ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-400">No checklist</span>
                    ) : comp.complete ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Complete</span>
                    ) : (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">{comp.missing} missing</span>
                    )}
                    <CompletionBar pct={comp.pct} complete={comp.complete} />
                    <span className="w-9 text-right text-sm font-bold tabular-nums text-slate-700">{comp.pct}%</span>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </button>
        </li>
    );
}

// ── Per-driver DQ file detail ──────────────────────────────────────────────────
function DriverDqFileDetail({ driver, catalog, carrierName, getRecord, setType, setFill, onBack, onNavigate }: {
    driver: Driver;
    accountId: string;
    catalog: ReturnType<typeof loadCatalog>;
    carrierName: string;
    getRecord: (d: Driver) => { driverType: DqDriverTypeId; fill: DqFileFill };
    setType: (d: Driver, t: DqDriverTypeId) => void;
    setFill: (d: Driver, f: DqFileFill) => void;
    onBack: () => void;
    onNavigate?: (path: string) => void;
}) {
    const [mode, setMode] = useState<"test" | "pdf">("test");
    const rec = getRecord(driver);
    const checklist = checklistForType(rec.driverType);
    const comp = computeCompletion(rec, checklist);
    const isPdf = mode === "pdf";

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top bar */}
            <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 print:hidden">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
                        <ChevronLeft className="h-4 w-4" /> DQ Files
                    </button>
                    <span className="text-slate-300">/</span>
                    <span className="text-sm font-semibold text-slate-900">{driver.name}</span>
                    <span className="hidden text-xs text-slate-400 sm:inline">{carrierName}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500">
                        Driver type
                        <select value={rec.driverType} onChange={e => setType(driver, e.target.value as DqDriverTypeId)}
                            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-[12px] font-semibold text-slate-700 focus:border-blue-400 focus:outline-none">
                            {DQ_DRIVER_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                    </label>
                    {isPdf ? (
                        <>
                            <button type="button" onClick={() => setMode("test")} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"><FlaskConical className="h-4 w-4" /> Test</button>
                            <button type="button" onClick={() => window.print()} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[12px] font-semibold text-white hover:bg-blue-700"><Printer className="h-4 w-4" /> Download PDF</button>
                        </>
                    ) : (
                        <button type="button" onClick={() => setMode("pdf")} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"><Eye className="h-4 w-4" /> PDF view</button>
                    )}
                </div>
            </div>

            <div className={cn("mx-auto max-w-4xl px-4 py-8 sm:px-6", isPdf && "print:px-0 print:py-0")}>
                {/* Completion summary (hidden in print) */}
                {checklist && (
                    <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
                        <span className="text-sm font-semibold text-slate-700">{comp.present}/{comp.required} verified</span>
                        <CompletionBar pct={comp.pct} complete={comp.complete} />
                        <span className="text-sm font-bold tabular-nums text-slate-700">{comp.pct}%</span>
                        {comp.complete
                            ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">DQ Complete</span>
                            : <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">{comp.missing} missing</span>}
                    </div>
                )}
                {!checklist && (
                    <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 print:hidden">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <p>No checklist is defined for <span className="font-semibold">{driverTypeLabel(rec.driverType)}</span>. Create one in <button type="button" className="font-semibold underline" onClick={() => onNavigate?.("/settings/dq-files")}>Settings ▸ DQ Files</button>.</p>
                    </div>
                )}
                <DqFileDocument
                    checklist={checklist}
                    catalog={catalog}
                    mode={mode}
                    fill={rec.fill}
                    onFillChange={f => setFill(driver, f)}
                    subjectName={driver.name}
                    typeLabelOverride={rec.driverType}
                />
            </div>
        </div>
    );
}
