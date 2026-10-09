// ─────────────────────────────────────────────────────────────────────────────
// AssetComplianceMaintenance — what the "Maintenance Document" record opens onto.
//
// Why this record is not a version list
// ─────────────────────────────────────
// Every other record on an asset's Compliances list is one piece of paper with one expiry:
// a pink slip, a plate, a decal. You open it and you get its versions. A unit's maintenance
// paper is not shaped like that — it is a bill, a sheet and a certificate per visit, several
// visits a year, filed against whichever service interval called for the work. Flattened
// into one version list it is forty files with nothing to sort them by, and the one question
// anybody actually asks of it ("where is the brake certificate") has no answer.
//
// So there is one level in between:
//
//     Maintenance Document  →  the intervals on this unit  →  one interval's records
//
// The intervals are a list of NAMES and nothing else. Their clocks, their next due and what
// they cost belong to the Maintenance module, which is where somebody goes to act on them;
// here they are only the way through to the paper, and six columns of figures made that
// harder to see rather than easier.
//
// The records themselves are read exactly the way every other record's versions are read —
// same head, same captured-facts strip, same toolbar, same one-line rows — because it is
// the same kind of reading.
//
// Each level owns its own way back, so there is one Back button on screen at a time.
// ─────────────────────────────────────────────────────────────────────────────

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { scrollAncestorsToTop } from '@/lib/scroll-to-top';
import {
    Wrench, ChevronRight, ChevronLeft, ClipboardCheck, FileText, Eye, Sparkles, Search,
    SlidersHorizontal,
} from 'lucide-react';
import { TH, TD, COL_RULE, RowIcon, EmptyRow } from '@/components/ui/CatalogTable';
import { TablePager } from '@/pages/inventory/TablePager';
import { AddServiceRecordPage, type ServiceRecordDraft } from './AddServiceRecordPage';
import {
    buildSeedIntervalMeta, deriveServiceIntervals, projectClocks, soonestClock, tierOf,
    type MeterReading, type ServiceIntervalMeta,
} from './service-intervals';
import {
    seedHistory, applyHistoryToMeta, historyForPair, sampleHistoryFor, newEventId,
    type ServiceEvent,
} from './service-history';
import type { MaintenanceTask } from './maintenance.data';
import { cn } from '@/lib/utils';

const shortDate = (iso?: string) => (iso
    ? new Date(iso.length === 10 ? `${iso}T08:00:00` : iso)
        .toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '—');

export interface ComplianceAsset {
    id: string;
    label: string;
    kind: 'truck' | 'trailer';
    description?: string;
    driver?: string;
    odometer?: number;
    odometerUnit?: 'mi' | 'km';
    engineHours?: number;
    assetType?: string;
}

export function AssetComplianceMaintenance({
    asset, tasks, serviceName, vendors = [], drivers = [], record, onBack,
}: {
    asset: ComplianceAsset;
    /** This unit's maintenance tasks — the same rows the module derives its rules from. */
    tasks: MaintenanceTask[];
    serviceName: (id: string) => string;
    vendors?: { id: string; name: string }[];
    drivers?: { id: string; name: string }[];
    /** The catalog record this is the detail of, for the head it wears. */
    record: { name: string; description: string };
    /** Out of the record, back to the compliance list. */
    onBack: () => void;
}) {
    const [openIntervalId, setOpenIntervalId] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(25);
    /** The interval list's own page. Separate: the two lists are never on screen together,
     *  and sharing one page number silently put you on page 2 of a six-row list. */
    const [intervalPage, setIntervalPage] = useState(0);
    /** Whichever level is on screen, for the scroll reset below. */
    const levelRef = useRef<HTMLDivElement | null>(null);
    const keepLevel = (el: HTMLDivElement | null) => { if (el) levelRef.current = el; };
    const [intervalPerPage, setIntervalPerPage] = useState(15);

    const meter: MeterReading = useMemo(() => ({
        odometer: Math.max(
            asset.odometerUnit === 'km' ? Math.round((asset.odometer ?? 0) * 0.621371) : (asset.odometer ?? 0),
            ...tasks.map((t) => t.meterSnapshot?.odometer ?? 0), 0,
        ),
        engineHours: Math.max(asset.engineHours ?? 0, ...tasks.map((t) => t.meterSnapshot?.engineHours ?? 0), 0),
    }), [asset, tasks]);

    /*
     * The rules, built the way the module builds them — same two functions, same tasks, so
     * a rule that reads PM-B there reads PM-B here with the same clocks and the same tier.
     */
    const baseMeta = useMemo<Record<string, ServiceIntervalMeta>>(
        () => buildSeedIntervalMeta(
            [{
                id: asset.id, assetType: asset.assetType, odometer: asset.odometer,
                odometerUnit: asset.odometerUnit === 'km' ? 'km' : 'mi',
            }],
            tasks,
        ),
        [asset, tasks],
    );

    const unitOf = (id: string) => (baseMeta[id]?.intervals?.mileage?.unit === 'km' ? 'km' : 'miles') as 'km' | 'miles';

    const [history, setHistory] = useState<ServiceEvent[]>(
        () => seedHistory(baseMeta, unitOf, (id) => baseMeta[id]?.name, vendors),
    );

    const meta = useMemo(
        () => applyHistoryToMeta(baseMeta, history, unitOf),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [baseMeta, history],
    );

    const rows = useMemo(
        () => deriveServiceIntervals(tasks, () => asset.kind, serviceName, meta)
            .filter((r) => r.assetIds.includes(asset.id) || r.applyToAll),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [tasks, meta, asset.id, asset.kind],
    );

    const openRule = openIntervalId ? rows.find((r) => r.id === openIntervalId) : undefined;
    const pairHistory = openRule ? historyForPair(history, asset.id, openRule.id) : [];
    const docCount = pairHistory.reduce((n, e) => n + (e.files?.length ?? 0), 0);

    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return pairHistory;
        return pairHistory.filter((e) => [
            e.vendorName, e.performedByName, e.invoiceNumber, e.notes,
            ...(e.files ?? []).map((f) => f.name),
            ...(e.files ?? []).flatMap((f) => f.tags ?? []),
        ].some((v) => String(v ?? '').toLowerCase().includes(q)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pairHistory, search]);

    const paged = shown.slice(page * perPage, page * perPage + perPage);
    const pagedRows = rows.slice(intervalPage * intervalPerPage, intervalPage * intervalPerPage + intervalPerPage);

    const fileRecord = (draft: ServiceRecordDraft) => {
        if (!openRule) return;
        setHistory((prev) => [{
            id: newEventId(),
            assetId: asset.id,
            intervalId: openRule.id,
            intervalName: openRule.name,
            serviceTypeIds: openRule.serviceTypeIds,
            performedAt: `${draft.date}T09:00:00.000Z`,
            odometer: draft.odometer,
            engineHours: draft.engineHours,
            // A figure off a shop's invoice is the shop's; one the yard typed is the yard's.
            readingSource: draft.vendorName ? 'shop' : 'typed',
            source: 'manual',
            vendorId: draft.vendorId,
            vendorName: draft.vendorName,
            performedBy: draft.performedBy,
            performedByName: draft.performedByName,
            driverId: draft.driverId,
            labour: draft.labour,
            parts: draft.parts,
            cost: draft.cost,
            currency: draft.currency,
            invoiceNumber: draft.invoiceNumber,
            notes: draft.notes,
            remarks: draft.remarks,
            files: draft.files.length ? draft.files : undefined,
        }, ...prev]);
        setAdding(false);
    };

    /** Fill a thin record so the list, its dates and its documents can be seen working. */
    const loadSample = () => {
        if (!openRule) return;
        const enrolled = meta[openRule.id]?.assets?.[asset.id];
        setHistory((prev) => [...sampleHistoryFor({
            assetId: asset.id,
            intervalId: openRule.id,
            intervalName: openRule.name,
            serviceTypeIds: openRule.serviceTypeIds,
            every: {
                miles: openRule.intervals?.mileage?.every,
                hours: openRule.intervals?.engineHours?.every,
                days: openRule.intervals?.days?.every,
            },
            anchor: {
                date: enrolled?.lastServiceDate ?? new Date().toISOString().slice(0, 10),
                odometer: enrolled?.lastOdometer ?? meter.odometer,
                engineHours: enrolled?.lastEngineHours ?? meter.engineHours,
            },
            vendors,
        }), ...prev]);
    };

    /*
     * Each level opens at the top of itself.
     *
     * Drilling in REPLACES the view, so the scroll position that belonged to the level
     * above means nothing here — and on an asset's page, where the header folds, arriving
     * part-way down springs the header open and pushes what you just opened off the bottom
     * of the screen. The ref follows whichever level is rendered; the one being left is
     * unmounted by the time the effect runs, which is why the last live node is kept.
     *
     * Above every early return below: React counts hooks per render, and a level that
     * skipped it would run fewer than the previous one did, which unmounts the page.
     */
    useLayoutEffect(() => { scrollAncestorsToTop(levelRef.current); }, [openIntervalId]);

    // ── The form ───────────────────────────────────────────────────────────
    if (adding && openRule) {
        return (
            <AddServiceRecordPage
                asset={{
                    id: asset.id,
                    label: asset.label,
                    kind: asset.kind,
                    description: asset.description,
                    driver: asset.driver,
                    meter,
                } as any}
                intervalName={openRule.name}
                intervals={openRule.intervals}
                services={openRule.serviceTypeIds.map(serviceName)}
                vendors={vendors}
                drivers={drivers}
                onCancel={() => setAdding(false)}
                onSave={fileRecord}
            />
        );
    }


    // ── One interval's records, read the way every other record's versions are ──
    if (openRule) {
        const clocks = clocksFor(openRule.id, rows, meta, asset.id, meter);
        const first = soonestClock(clocks);
        const last = pairHistory[0];
        return (
            <div ref={keepLevel} className="space-y-4">
                {/* One head, one Back. This level's way out is back to the intervals; the
                    level above's is back to the compliance list, and only one of them is
                    ever on screen. */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
                        <button
                            type="button"
                            onClick={() => { setOpenIntervalId(null); setSearch(''); setPage(0); }}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                        >
                            <ChevronLeft size={14} /> Back to intervals
                        </button>
                        <span aria-hidden className="h-5 w-px bg-slate-200" />
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <Wrench size={16} />
                        </span>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate text-[15px] font-bold text-slate-900">{openRule.name}</span>
                                {openRule.tier && tierOf(openRule.tier) && (
                                    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                                        tierOf(openRule.tier)!.pill)}>
                                        {tierOf(openRule.tier)!.label}
                                    </span>
                                )}
                            </div>
                            <p className="truncate text-[12px] text-slate-500">
                                {openRule.serviceTypeIds.map(serviceName).join(', ') || 'No services listed'}
                            </p>
                        </div>
                    </div>
                    {/* What has been captured, stated the way the record detail states it. */}
                    <div className="grid gap-4 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Fact label="Comes due first" value={first?.dueText}
                            note={first?.remainingText} over={first?.over} />
                        <Fact label="Every"
                            value={clocks.map((c) => c.everyText.replace('every ', '')).join(' · ') || undefined} />
                        <Fact label="Last performed" value={last ? shortDate(last.performedAt) : undefined}
                            note={last?.vendorName} />
                        <Fact label="On record"
                            value={`${pairHistory.length} service${pairHistory.length === 1 ? '' : 's'}`}
                            note={`${docCount} document${docCount === 1 ? '' : 's'}`} />
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    {/* The record list's own bar: what it is, then what you can do to it.
                        No Records/Documents switch — the documents are ON the rows, in the
                        column that names them, so a second view of the same four rows was a
                        choice with no answer behind it. */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
                        <span className="inline-flex items-center gap-2 text-[13px] font-bold text-slate-800">
                            <ClipboardCheck size={15} className="text-blue-600" /> Records
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-slate-500">
                                {pairHistory.length}
                            </span>
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                            {pairHistory.length < 3 && (
                                <button
                                    type="button"
                                    onClick={loadSample}
                                    title="Fill the record behind the countdown. Nothing already on it moves."
                                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                                >
                                    <Sparkles size={13} className="text-blue-600" /> Sample data
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setAdding(true)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                            >
                                <ClipboardCheck size={14} /> Add record
                            </button>
                        </div>
                    </div>

                    {/* The same search-and-narrow row the version list wears. */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                        <div className="relative min-w-[200px] flex-1">
                            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                                placeholder="Search vendor, invoice, tags, files…"
                                className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[13px] outline-none focus:border-blue-500"
                            />
                        </div>
                        {search.trim() !== '' && (
                            <button
                                type="button"
                                onClick={() => { setSearch(''); setPage(0); }}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                <SlidersHorizontal size={13} /> Reset
                            </button>
                        )}
                    </div>

                    {/* No inner scrollport: this panel sits in a page that already scrolls,
                        and a box of its own took the wheel away from it — you scrolled the
                        four rows and the page behind them never moved. */}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px]">
                            <thead>
                                <tr>
                                    <TH>Performed</TH>
                                    <TH className={COL_RULE}>State</TH>
                                    <TH className={cn(COL_RULE, 'text-right')}>Readings</TH>
                                    <TH className={COL_RULE}>Vendor / performed by</TH>
                                    <TH className={cn(COL_RULE, 'text-right')}>Cost</TH>
                                    <TH className={COL_RULE}>Document</TH>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paged.length === 0 && (
                                    <EmptyRow
                                        colSpan={6}
                                        Icon={FileText}
                                        title={pairHistory.length === 0 ? 'No records captured yet' : 'Nothing matches that'}
                                        hint={pairHistory.length === 0
                                            ? 'Use Add record to file what was done, what it cost and the paper for it.'
                                            : undefined}
                                        onClear={pairHistory.length === 0 ? undefined : () => { setSearch(''); setPage(0); }}
                                    />
                                )}
                                {paged.map((e) => {
                                    const current = e.id === pairHistory[0]?.id;
                                    return (
                                        <tr key={e.id} className="transition-colors hover:bg-slate-50/60">
                                            <TD>
                                                <div className="flex items-center gap-2.5 whitespace-nowrap">
                                                    <RowIcon Icon={Wrench} tone="blue" />
                                                    <span className="text-[13px] font-semibold text-slate-900">
                                                        {shortDate(e.performedAt)}
                                                    </span>
                                                </div>
                                            </TD>
                                            {/* The newest is what the countdown is measured from; the
                                                rest are what it was measured from before. */}
                                            <TD className={COL_RULE}>
                                                <span className={cn(
                                                    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                                                    current
                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                        : 'border-slate-200 bg-slate-100 text-slate-500')}>
                                                    <span className={cn('h-1.5 w-1.5 rounded-full',
                                                        current ? 'bg-emerald-500' : 'bg-slate-400')} />
                                                    {current ? 'Current' : 'History'}
                                                </span>
                                            </TD>
                                            <TD className={cn(COL_RULE, 'whitespace-nowrap text-right text-[13px] tabular-nums text-slate-800')}>
                                                {e.odometer != null ? `${e.odometer.toLocaleString()} mi` : <span className="text-slate-300">—</span>}
                                                {e.engineHours != null && (
                                                    <span className="ml-1 text-[11px] text-slate-500">
                                                        {e.engineHours.toLocaleString()}h
                                                    </span>
                                                )}
                                            </TD>
                                            <TD className={cn(COL_RULE, 'whitespace-nowrap text-[13px] text-slate-800')}>
                                                <span className="inline-block max-w-[7rem] truncate align-bottom">
                                                    {e.vendorName ?? <span className="text-slate-300">No shop</span>}
                                                </span>
                                                <span className="ml-1.5 inline-block max-w-[6rem] truncate align-bottom text-[11px] text-slate-500">
                                                    {e.performedByName ?? 'no name on it'}
                                                </span>
                                            </TD>
                                            <TD className={cn(COL_RULE, 'whitespace-nowrap text-right text-[13px] font-semibold tabular-nums text-slate-800')}>
                                                {e.cost
                                                    ? `${e.currency ?? 'USD'} ${e.cost.toFixed(2)}`
                                                    : <span className="font-normal text-slate-300">—</span>}
                                            </TD>
                                            <TD className={COL_RULE}>
                                                {(e.files?.length ?? 0) > 0 ? (
                                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                                        <FileText size={14} className="shrink-0 text-slate-400" />
                                                        <span
                                                            className="max-w-[7rem] truncate text-[13px] text-slate-700"
                                                            title={e.files!.map((f) => f.name).join(', ')}
                                                        >
                                                            {e.files![0].name}
                                                        </span>
                                                        {e.files!.length > 1 && (
                                                            <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
                                                                +{e.files!.length - 1}
                                                            </span>
                                                        )}
                                                        {e.files![0].url && (
                                                            <a
                                                                href={e.files![0].url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                title={`View ${e.files![0].name}`}
                                                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100"
                                                            >
                                                                <Eye size={13} />
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : <span className="text-[13px] text-slate-300">—</span>}
                                            </TD>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <TablePager
                        page={page}
                        perPage={perPage}
                        total={shown.length}
                        label="records"
                        onPage={setPage}
                        onPerPage={(n) => { setPerPage(n); setPage(0); }}
                    />
                </div>
            </div>
        );
    }

    // ── The intervals on this unit: names, and nothing else ────────────────
    return (
        <div ref={keepLevel} className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                    <ChevronLeft size={14} /> Back to list
                </button>
                <span aria-hidden className="h-5 w-px bg-slate-200" />
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <FileText size={16} />
                </span>
                <div className="min-w-0">
                    <div className="truncate text-[15px] font-bold text-slate-900">{record.name}</div>
                    <p className="truncate text-[12px] text-slate-500">{record.description}</p>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="px-5 py-3">
                    <h3 className="text-sm font-bold text-slate-900">Service intervals on this unit</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                        The paper is filed against the interval that called for the work. Open one
                        for its records and the documents filed with them.
                    </p>
                </div>
                {/* One column, and one line per row. The clocks, the next due and the
                    cost are the Maintenance module's to show, because that is where they
                    can be acted on; here they were six columns of figures in front of the
                    only thing being chosen. */}
                <div className="overflow-x-auto border-t border-slate-100">
                    <table className="w-full min-w-[520px]">
                        <thead>
                            <tr>
                                <TH>Service interval</TH>
                                <TH className={cn(COL_RULE, 'text-right')}>Records</TH>
                                <TH className={cn(COL_RULE, 'text-right')}>Documents</TH>
                                <TH className={cn(COL_RULE, 'w-px')} />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pagedRows.length === 0 && (
                                <EmptyRow
                                    colSpan={4}
                                    Icon={Wrench}
                                    title="This unit is not on a service interval"
                                    hint="Put it on one from the Maintenance module and it appears here."
                                />
                            )}
                            {pagedRows.map((r) => {
                                const mine = historyForPair(history, asset.id, r.id);
                                const files = mine.reduce((n, e) => n + (e.files?.length ?? 0), 0);
                                return (
                                    <tr
                                        key={r.id}
                                        onClick={() => { setOpenIntervalId(r.id); setSearch(''); setPage(0); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') setOpenIntervalId(r.id); }}
                                        tabIndex={0}
                                        role="link"
                                        className="cursor-pointer transition-colors hover:bg-slate-50/60 focus:bg-slate-50 focus:outline-none"
                                    >
                                        <TD>
                                            <div className="flex items-center gap-2.5 whitespace-nowrap">
                                                <RowIcon Icon={Wrench} tone="blue" />
                                                <span className="text-[13px] font-semibold text-slate-900">{r.name}</span>
                                                {r.tier && tierOf(r.tier) && (
                                                    <span className={cn('shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                                                        tierOf(r.tier)!.pill)}>
                                                        {tierOf(r.tier)!.label}
                                                    </span>
                                                )}
                                            </div>
                                        </TD>
                                        <TD className={cn(COL_RULE, 'whitespace-nowrap text-right text-[13px] font-semibold tabular-nums text-slate-700')}>
                                            {mine.length}
                                        </TD>
                                        <TD className={cn(COL_RULE, 'whitespace-nowrap text-right text-[13px] font-semibold tabular-nums text-slate-700')}>
                                            {files}
                                        </TD>
                                        <TD className={cn(COL_RULE, 'w-px pr-4 text-right')}>
                                            <ChevronRight size={16} className="text-slate-400" />
                                        </TD>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <TablePager
                    page={intervalPage}
                    perPage={intervalPerPage}
                    total={rows.length}
                    label="intervals"
                    onPage={setIntervalPage}
                    onPerPage={(n) => { setIntervalPerPage(n); setIntervalPage(0); }}
                />
            </div>
        </div>
    );
}

/** The clocks for one rule on this unit. */
function clocksFor(
    id: string,
    rows: { id: string; intervals?: any }[],
    meta: Record<string, ServiceIntervalMeta>,
    assetId: string,
    meter: MeterReading,
) {
    const row = rows.find((r) => r.id === id);
    return projectClocks(row?.intervals, meta[id]?.assets?.[assetId], meter);
}

/** One captured fact, in the shape the record detail states them. */
function Fact({ label, value, note, over }: {
    label: string; value?: string; note?: string; over?: boolean;
}) {
    return (
        <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
            <div className="mt-0.5 truncate text-[13px] font-semibold text-slate-900">
                {value ?? <span className="font-normal text-slate-300">—</span>}
            </div>
            {note && (
                <div className={cn('truncate text-[11px]', over ? 'font-semibold text-red-600' : 'text-slate-500')}>
                    {note}
                </div>
            )}
        </div>
    );
}
