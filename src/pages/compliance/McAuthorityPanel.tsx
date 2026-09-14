// The two halves of the MC Certificate record that are NOT captured by the office: the
// operating authority as FMCSA holds it, and the insurance filed against it.
//
// Both are looked up from the MC number on the record and both are read-only, which the
// screen has to say out loud — a page that mixes federal register data with typed-in data
// without marking which is which invites someone to try to correct the half they cannot.
//
// The filings table is built from the same furniture as the compliance record table
// (`ListChrome`): same search box, same filter row, same column picker, same pager, same
// history switch. It is the same kind of list, so it reads the same way.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Landmark, RefreshCw, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ColumnPicker, FilterSelect, HistoryToggle, ListToolbar, SortTh, TablePager, type PickerColumn,
} from '@/components/ui/ListChrome';
import { nextSort, type SortState } from '@/components/ui/list-chrome';
import {
    fetchMcAuthority, usd, type McAuthorityRecord, type McInsuranceFiling, type McProcessAgent,
} from '@/pages/compliance/mc-authority.data';

/**
 * Load the authority for one MC number, with the states a network call really has.
 *
 * "Loading" is not stored — it is simply not yet holding an answer for the number (and the
 * refresh) being asked about. Anything else needs a second write the moment the question
 * changes, and the screen can then show one carrier's authority under another's number.
 */
function useMcAuthority(mcNumber: string) {
    const [at, setAt] = useState(0);   // bumped to re-run the lookup
    const asked = `${mcNumber.trim()}#${at}`;
    const [answer, setAnswer] = useState<{ asked: string; data: McAuthorityRecord | null } | null>(null);
    const reload = useCallback(() => setAt(n => n + 1), []);
    useEffect(() => {
        let live = true;
        fetchMcAuthority(mcNumber).then(data => { if (live) setAnswer({ asked, data }); });
        return () => { live = false; };
    }, [asked, mcNumber]);
    const current = answer?.asked === asked;
    return { data: current ? answer.data : null, loading: !current, reload };
}

const fmtDate = (iso: string): string =>
    iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

const fmtWhen = (iso: string): string =>
    iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

const Dash = () => <span className="font-normal text-slate-400">—</span>;

/** Active / Not active, said once and in one colour wherever it appears. */
export function AuthorityPill({ status, className }: { status: string; className?: string }) {
    const good = status === 'Active';
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
            good ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                 : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200', className)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', good ? 'bg-emerald-500' : 'bg-rose-500')} />
            {status}
        </span>
    );
}

function Fact({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('min-w-0', className ?? 'min-w-[9rem]')}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
            <div className="mt-0.5 text-[13px] font-semibold text-slate-800">{children}</div>
        </div>
    );
}

/** Where the numbers came from, and a way to ask again. */
function LookupNote({ syncedAt, loading, onReload }: { syncedAt?: string; loading: boolean; onReload: () => void }) {
    return (
        <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-[11px] text-slate-400 sm:inline">
                {loading ? 'Looking up FMCSA…' : syncedAt ? `From FMCSA · ${fmtWhen(syncedAt)}` : 'From FMCSA'}
            </span>
            <button type="button" onClick={onReload} disabled={loading} title="Look it up again"
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50">
                <RefreshCw size={12} className={loading ? 'animate-spin' : undefined} /> <span className="hidden sm:inline">Refresh</span>
            </button>
        </div>
    );
}

function LoadingRows({ rows = 3 }: { rows?: number }) {
    return (
        <div className="space-y-2 px-4 py-4">
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-slate-100" style={{ width: `${90 - i * 12}%` }} />
            ))}
        </div>
    );
}

/** Nothing to look up with — the number is the key, so say exactly that. */
function NeedsNumber({ what }: { what: string }) {
    return (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/40 px-4 py-5 text-center">
            <p className="text-[13px] font-semibold text-slate-600">No MC number on this record yet</p>
            <p className="mt-0.5 text-[12px] text-slate-400">{what} is looked up from the MC number — add a record with the number on the certificate.</p>
        </div>
    );
}

/**
 * The authority half of the record's header: what the register says about this MC today, and
 * who its process agent is. Rendered INSIDE the record's own facts block rather than as a
 * second card — one authority, one header — and it condenses with it, down to the one line
 * that still matters when the table is what you are reading.
 */
export function McAuthorityFacts({ mcNumber, condensed = false }: { mcNumber: string; condensed?: boolean }) {
    const { data, loading, reload } = useMcAuthority(mcNumber);
    const a = data?.authority;

    if (!mcNumber.trim()) return condensed ? null : <div className="px-4 py-3"><NeedsNumber what="The operating authority" /></div>;

    // Condensed: status, why, and what the authority must carry. Everything else waits.
    if (condensed) {
        return (
            <span className="flex min-w-0 items-center gap-2 text-[12px] text-slate-500">
                {a ? (
                    <>
                        <AuthorityPill status={a.status} />
                        <span className="hidden truncate md:inline">{a.statusReason}</span>
                        <span className="hidden shrink-0 tabular-nums lg:inline">· BIPD {usd(a.bipdRequired)}</span>
                    </>
                ) : <span className="text-slate-400">Looking up FMCSA…</span>}
            </span>
        );
    }

    return (
        <div className="border-t border-slate-100">
            <div className="flex items-center justify-between gap-2 bg-slate-50/50 px-4 py-1.5">
                <span className="flex min-w-0 items-center gap-2">
                    <Landmark size={13} className="shrink-0 text-slate-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Operating authority</span>
                    <span className="truncate rounded-md bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">{mcNumber}</span>
                </span>
                <LookupNote syncedAt={a?.syncedAt} loading={loading} onReload={reload} />
            </div>
            {!a ? <LoadingRows /> : (
                <>
                    <div className="flex flex-wrap gap-x-8 gap-y-3 px-4 py-3">
                        <Fact label="Current status"><AuthorityPill status={a.status} /></Fact>
                        <Fact label="Status reason" className="min-w-[12rem]">{a.statusReason || <Dash />}</Fact>
                        <Fact label="Minimum insurance required" className="min-w-[14rem]">
                            <span className="tabular-nums">BIPD: {usd(a.bipdRequired)}</span>
                            {a.cargoRequired > 0 && (
                                <span className="ml-2 font-normal text-slate-500 tabular-nums">Cargo: {usd(a.cargoRequired)}</span>
                            )}
                        </Fact>
                    </div>
                    {/* The BOC-3 designations are NOT here. A carrier has several — the one
                        in force plus whoever held it before — and four facts about one of
                        them, chosen arbitrarily, is the kind of summary that reads as the
                        whole answer. They have their own tab, as a list. */}
                </>
            )}
        </div>
    );
}

// ── The filings list ────────────────────────────────────────────────────────

type FilingCol = 'company' | 'policy' | 'form' | 'amount' | 'status' | 'received' | 'effective' | 'cancelled';

/** Locked: the insurer and the policy are what tell one filing from another. */
const FILING_COLUMNS: PickerColumn<FilingCol>[] = [
    { id: 'company', label: 'Company name', locked: true },
    { id: 'policy', label: 'Policy number', locked: true },
    { id: 'form', label: 'Form' },
    { id: 'amount', label: 'Insurance filed' },
    { id: 'status', label: 'Status' },
    { id: 'received', label: 'Received date' },
    { id: 'effective', label: 'Effective date' },
    { id: 'cancelled', label: 'Cancellation date' },
];

const FILING_STATUS_CLS: Record<string, string> = {
    Active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    Cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
    Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
};

const filingValue = (f: McInsuranceFiling, col: FilingCol): string => {
    switch (col) {
        case 'company': return f.companyName.toLowerCase();
        case 'policy': return f.policyNumber.toLowerCase();
        case 'form': return f.form.toLowerCase();
        // Padded so 750,000 sorts below 1,000,000 rather than above it as text would.
        case 'amount': return String(f.amountFiled).padStart(12, '0');
        case 'status': return f.status.toLowerCase();
        case 'received': return f.receivedDate;
        case 'effective': return f.effectiveDate;
        case 'cancelled': return f.cancellationDate;
    }
};

/**
 * Every insurance filing against this authority.
 *
 * Read-only and deliberately without an "Add" button: an insurer files with FMCSA, not with
 * this office, and a row typed in here would be a claim about the federal register that
 * nothing backs. Cancelled filings are the history — hidden until asked for, exactly as
 * superseded records are on the documents tab.
 */
export function McInsuranceTab({ mcNumber }: { mcNumber: string }) {
    const { data, loading, reload } = useMcAuthority(mcNumber);
    const [search, setSearch] = useState('');
    const [formFilter, setFormFilter] = useState('');
    const [showCancelled, setShowCancelled] = useState(false);
    const [sort, setSort] = useState<SortState<FilingCol> | null>(null);
    const [hidden, setHidden] = useState<Set<FilingCol>>(new Set());
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    const all = useMemo(() => data?.filings ?? [], [data]);
    const cancelled = all.filter(f => f.status === 'Cancelled');
    const forms = Array.from(new Set(all.map(f => f.form))).sort();
    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = all.filter(f =>
            (showCancelled || f.status !== 'Cancelled')
            && (!formFilter || f.form === formFilter)
            && (!q || `${f.companyName} ${f.policyNumber} ${f.form} ${f.status} ${usd(f.amountFiled)}`.toLowerCase().includes(q)));
        if (!sort) return list;
        return [...list].sort((a, b) =>
            filingValue(a, sort.col).localeCompare(filingValue(b, sort.col), undefined, { numeric: true, sensitivity: 'base' })
            * (sort.dir === 'desc' ? -1 : 1));
    }, [all, search, formFilter, showCancelled, sort]);

    const shown = (id: FilingCol) => !hidden.has(id);
    const toggleCol = (id: FilingCol) => setHidden(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const visible = new Set(FILING_COLUMNS.map(c => c.id).filter(shown));
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    const safePage = Math.min(page, pages);
    const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
    const th = (col: FilingCol, label: string, className?: string) =>
        shown(col) && <SortTh col={col} label={label} sortable sort={sort} onSort={c => { setSort(s => nextSort(s, c)); setPage(1); }} className={className} />;

    if (!mcNumber.trim()) return <div className="p-5"><NeedsNumber what="Insurance on file" /></div>;

    return (
        <>
            {/* Same header shape as the documents tab: what this is, how many, and the switch
                that reveals what is hidden. No Add — nothing here is ours to add. */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
                <h3 className="flex items-center gap-2 text-[13px] font-bold text-slate-700">
                    Insurance on file
                    <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{all.length}</span>
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                    <HistoryToggle on={showCancelled} onChange={setShowCancelled} count={cancelled.length}
                        label="Show cancelled" emptyTitle="No cancelled filings" />
                    <LookupNote syncedAt={data?.authority.syncedAt} loading={loading} onReload={reload} />
                </div>
            </div>

            {loading && !data ? <LoadingRows rows={4} /> : all.length === 0 ? (
                <div className="flex items-center justify-center gap-2 px-5 py-12 text-[13px] text-amber-700">
                    <AlertCircle size={14} /> No insurance is filed against this authority.
                </div>
            ) : (
                <>
                    <ListToolbar
                        search={search} onSearch={v => { setSearch(v); setPage(1); }}
                        placeholder="Search insurers, policy numbers, forms…"
                        filters={forms.length > 1 ? (
                            <FilterSelect value={formFilter} onChange={v => { setFormFilter(v); setPage(1); }}
                                title="Filter by form" allLabel="All forms" options={forms} />
                        ) : undefined}
                        columns={<ColumnPicker columns={FILING_COLUMNS} visible={visible} onToggle={toggleCol} />}
                    />
                    {pageRows.length === 0 ? (
                        <div className="px-5 py-12 text-center text-sm text-slate-500">No filings match your search / filters.</div>
                    ) : (
                        <>
                            {/* Wide table on a desktop; the same rows as cards once there is no
                                room for eight columns, so nothing is lost to a phone. */}
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full min-w-[64rem]">
                                    <thead className="border-b border-slate-200 bg-slate-50/50">
                                        <tr>
                                            <SortTh col="company" label="Company name" sortable sort={sort} onSort={c => setSort(s => nextSort(s, c))} className="pl-5" />
                                            {th('policy', 'Policy number')}
                                            {th('form', 'Form')}
                                            {th('amount', 'Insurance filed')}
                                            {th('status', 'Status')}
                                            {th('received', 'Received date')}
                                            {th('effective', 'Effective date')}
                                            {th('cancelled', 'Cancellation date', 'pr-5')}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageRows.map(f => (
                                            <tr key={f.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                                                <td className="whitespace-nowrap py-2.5 pl-5 pr-4 text-[13px] font-semibold text-slate-800">{f.companyName}</td>
                                                {shown('policy') && <td className="whitespace-nowrap px-4 py-2.5 text-[13px] tabular-nums text-slate-600">{f.policyNumber}</td>}
                                                {shown('form') && <td className="whitespace-nowrap px-4 py-2.5 text-[13px] text-slate-600">{f.form}</td>}
                                                {shown('amount') && <td className="whitespace-nowrap px-4 py-2.5 text-[13px] tabular-nums text-slate-800">{usd(f.amountFiled)}</td>}
                                                {shown('status') && (
                                                    <td className="whitespace-nowrap px-4 py-2.5">
                                                        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset', FILING_STATUS_CLS[f.status] ?? FILING_STATUS_CLS.Pending)}>{f.status}</span>
                                                    </td>
                                                )}
                                                {shown('received') && <td className="whitespace-nowrap px-4 py-2.5 text-[13px] text-slate-600">{fmtDate(f.receivedDate) || <Dash />}</td>}
                                                {shown('effective') && <td className="whitespace-nowrap px-4 py-2.5 text-[13px] text-slate-600">{fmtDate(f.effectiveDate) || <Dash />}</td>}
                                                {shown('cancelled') && <td className="whitespace-nowrap py-2.5 pl-4 pr-5 text-[13px] text-slate-600">{fmtDate(f.cancellationDate) || <Dash />}</td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="divide-y divide-slate-100 md:hidden">
                                {pageRows.map(f => (
                                    <div key={f.id} className="px-5 py-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="truncate text-[13px] font-semibold text-slate-800">{f.companyName}</div>
                                                <div className="text-[12px] tabular-nums text-slate-500">{f.policyNumber} · {f.form}</div>
                                            </div>
                                            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset', FILING_STATUS_CLS[f.status] ?? FILING_STATUS_CLS.Pending)}>{f.status}</span>
                                        </div>
                                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-500">
                                            <span className="font-semibold tabular-nums text-slate-700">{usd(f.amountFiled)}</span>
                                            <span>Effective {fmtDate(f.effectiveDate) || '—'}</span>
                                            {f.cancellationDate && <span>Cancelled {fmtDate(f.cancellationDate)}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    <TablePager page={safePage} pageSize={pageSize} total={rows.length}
                        onPage={setPage} onPageSize={n => { setPageSize(n); setPage(1); }} />
                    <p className="px-5 pb-3 text-[11px] text-slate-400">
                        Filed by the insurer with FMCSA — nothing here is entered or edited from this page.
                    </p>
                </>
            )}
        </>
    );
}


// ── The BOC-3 designations ──────────────────────────────────────────────────

type AgentCol = 'coverage' | 'company' | 'status' | 'received';

/** Locked: the agent is what a row IS; without the company name there is no row. */
const AGENT_COLUMNS: PickerColumn<AgentCol>[] = [
    { id: 'coverage', label: 'Coverage type' },
    { id: 'company', label: 'Company name', locked: true },
    { id: 'status', label: 'Status' },
    { id: 'received', label: 'Received date' },
];

const agentValue = (a: McProcessAgent, col: AgentCol): string => {
    switch (col) {
        case 'coverage': return a.coverageType.toLowerCase();
        case 'company': return a.companyName.toLowerCase();
        case 'status': return a.companyStatus.toLowerCase();
        case 'received': return a.receivedDate;
    }
};

/**
 * Who may be served legal papers for this carrier, and where.
 *
 * Read-only, like the insurance filings beside it: a BOC-3 is filed with FMCSA by the agent,
 * not entered here, so there is no Add. Superseded designations are hidden by default and one
 * switch away — they are history, but an auditor checking for a gap in coverage needs them.
 */
export function McProcessAgentTab({ mcNumber }: { mcNumber: string }) {
    const { data, loading, reload } = useMcAuthority(mcNumber);
    const [search, setSearch] = useState('');
    const [coverageFilter, setCoverageFilter] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [sort, setSort] = useState<SortState<AgentCol> | null>(null);
    const [hidden, setHidden] = useState<Set<AgentCol>>(new Set());
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    const all = useMemo(() => data?.authority.processAgents ?? [], [data]);
    const inactive = all.filter(a => a.companyStatus !== 'Active');
    const coverages = Array.from(new Set(all.map(a => a.coverageType))).sort();
    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = all.filter(a =>
            (showInactive || a.companyStatus === 'Active')
            && (!coverageFilter || a.coverageType === coverageFilter)
            && (!q || `${a.companyName} ${a.coverageType} ${a.companyStatus}`.toLowerCase().includes(q)));
        if (!sort) return list;
        return [...list].sort((x, y) =>
            agentValue(x, sort.col).localeCompare(agentValue(y, sort.col), undefined, { numeric: true, sensitivity: 'base' })
            * (sort.dir === 'desc' ? -1 : 1));
    }, [all, search, coverageFilter, showInactive, sort]);

    const shown = (id: AgentCol) => !hidden.has(id);
    const toggleCol = (id: AgentCol) => setHidden(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const visible = new Set(AGENT_COLUMNS.map(c => c.id).filter(shown));
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    const safePage = Math.min(page, pages);
    const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
    const th = (col: AgentCol, label: string, className?: string) =>
        shown(col) && <SortTh col={col} label={label} sortable sort={sort} onSort={c => { setSort(s => nextSort(s, c)); setPage(1); }} className={className} />;

    if (!mcNumber.trim()) return <div className="p-5"><NeedsNumber what="The process agent" /></div>;

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
                <h3 className="flex items-center gap-2 text-[13px] font-bold text-slate-700">
                    <ShieldCheck size={14} className="text-slate-400" /> Process agent (BOC-3)
                    <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{all.length}</span>
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                    <HistoryToggle on={showInactive} onChange={setShowInactive} count={inactive.length}
                        label="Show superseded" emptyTitle="No superseded designations" />
                    <LookupNote syncedAt={data?.authority.syncedAt} loading={loading} onReload={reload} />
                </div>
            </div>

            {loading && !data ? <LoadingRows rows={3} /> : all.length === 0 ? (
                <div className="flex items-center justify-center gap-2 px-5 py-12 text-[13px] text-amber-700">
                    <AlertCircle size={14} /> No BOC-3 is on file for this authority.
                </div>
            ) : (
                <>
                    <ListToolbar
                        search={search} onSearch={v => { setSearch(v); setPage(1); }}
                        placeholder="Search agents, coverage, status…"
                        filters={coverages.length > 1 ? (
                            <FilterSelect value={coverageFilter} onChange={v => { setCoverageFilter(v); setPage(1); }}
                                title="Filter by coverage type" allLabel="All coverage types" options={coverages} />
                        ) : undefined}
                        columns={<ColumnPicker columns={AGENT_COLUMNS} visible={visible} onToggle={toggleCol} />}
                    />
                    {pageRows.length === 0 ? (
                        <div className="px-5 py-12 text-center text-sm text-slate-500">No designations match your search / filters.</div>
                    ) : (
                        <>
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full min-w-[44rem]">
                                    <thead className="border-b border-slate-200 bg-slate-50/50">
                                        <tr>
                                            {th('coverage', 'Coverage type', 'pl-5')}
                                            <SortTh col="company" label="Company name" sortable sort={sort} onSort={c => setSort(s => nextSort(s, c))} className={shown('coverage') ? undefined : 'pl-5'} />
                                            {th('status', 'Status')}
                                            {th('received', 'Received date', 'pr-5')}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageRows.map(a => (
                                            <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                                                {shown('coverage') && <td className="whitespace-nowrap py-2.5 pl-5 pr-4 text-[13px] text-slate-600">{a.coverageType}</td>}
                                                <td className={cn('whitespace-nowrap py-2.5 pr-4 text-[13px] font-semibold text-slate-800', shown('coverage') ? 'px-4' : 'pl-5')}>{a.companyName}</td>
                                                {shown('status') && <td className="whitespace-nowrap px-4 py-2.5"><AuthorityPill status={a.companyStatus} /></td>}
                                                {shown('received') && <td className="whitespace-nowrap py-2.5 pl-4 pr-5 text-[13px] text-slate-600">{fmtDate(a.receivedDate) || <Dash />}</td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* The same rows as cards once four columns no longer fit. */}
                            <div className="divide-y divide-slate-100 md:hidden">
                                {pageRows.map(a => (
                                    <div key={a.id} className="px-5 py-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="truncate text-[13px] font-semibold text-slate-800">{a.companyName}</div>
                                                <div className="text-[12px] text-slate-500">{a.coverageType}</div>
                                            </div>
                                            <AuthorityPill status={a.companyStatus} />
                                        </div>
                                        <div className="mt-1.5 text-[12px] text-slate-500">Received {fmtDate(a.receivedDate) || '—'}</div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    <TablePager page={safePage} pageSize={pageSize} total={rows.length}
                        onPage={setPage} onPageSize={n => { setPageSize(n); setPage(1); }} />
                    <p className="px-5 pb-3 text-[11px] text-slate-400">
                        Filed with FMCSA by the process agent — nothing here is entered or edited from this page.
                    </p>
                </>
            )}
        </>
    );
}
