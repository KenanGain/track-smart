// ─────────────────────────────────────────────────────────────────────────────
// ServiceHistoryTable — what has been done, wherever that question is asked.
//
// The asset's page asks it of one unit, a rule's page asks it of one rule, and both are
// the same list with a different filter. It reads the ledger in `service-history.ts`
// directly, so it cannot show anything the countdowns were not also counted from.
// ─────────────────────────────────────────────────────────────────────────────

import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { History, Search, SlidersHorizontal, FileText, Briefcase, Eye, Pencil, Share2 } from 'lucide-react';
import { TH, TD, COL_RULE, EmptyRow, TableScroll } from '@/components/ui/CatalogTable';
import { KebabMenu } from '@/components/ui/KebabMenu';
import { FilterChip, ResetFilters, TableGroupBand } from '@/components/ui/ListChrome';
import { TablePager } from '@/pages/inventory/TablePager';
import type { ServiceEvent } from '@/pages/assets/service-history';
import { cn } from '@/lib/utils';

type HistoryGroupBy = 'none' | 'interval' | 'asset' | 'vendor' | 'month';

const shortDate = (iso: string) =>
    new Date(iso.length === 10 ? `${iso}T08:00:00` : iso)
        .toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

const monthOf = (iso: string) =>
    new Date(iso.length === 10 ? `${iso}T08:00:00` : iso)
        .toLocaleDateString(undefined, { year: 'numeric', month: 'long' });

export function ServiceHistoryTable({
    events, title, subtitle, assetLabel, showAsset = false, showInterval = true,
    onOpenOrder, onOpenInterval, onOpen, onEdit, onShare, emptyAction, headerAction,
}: {
    events: ServiceEvent[];
    title: string;
    subtitle?: string;
    /** Unit number for an asset id — what people call the truck. */
    assetLabel?: (id: string) => string;
    /** Off on one unit's own page, where every row would name the same truck. */
    showAsset?: boolean;
    /** Off on a rule's page, where every row would name the same rule. */
    showInterval?: boolean;
    onOpenOrder?: (orderId: string) => void;
    onOpenInterval?: (intervalId: string) => void;
    /** Open the entry’s own page. A row cannot hold what was done, by whom, for how much. */
    onOpen?: (eventId: string) => void;
    /**
     * Correct an entry.
     *
     * A reading typed wrong is the commonest fault in a maintenance record, and it moves
     * the countdown with it — so it has to be fixable where it is read.
     */
    onEdit?: (eventId: string) => void;
    onShare?: (eventId: string) => void;
    /** Offered when there is genuinely nothing on record — not when a filter hid it all. */
    emptyAction?: ReactNode;
    /**
     * What to do about the list, beside its title.
     *
     * Filing a service belongs next to the services already filed. It was reachable only
     * from the bar at the top of the page, which is the right place for it and not the
     * only one — you decide to add a record while looking at the ones that are there.
     */
    headerAction?: ReactNode;
}) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'work_order' | 'manual' | 'seed'>('all');
    const [groupBy, setGroupBy] = useState<HistoryGroupBy>('none');
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(15);

    const counts = useMemo(() => ({
        all: events.length,
        work_order: events.filter((e) => e.source === 'work_order').length,
        manual: events.filter((e) => e.source === 'manual').length,
        // The opening balance: what the fleet was already carrying when the record
        // started. Lumping it in with "entered by hand" claimed somebody typed it today.
        seed: events.filter((e) => e.source === 'seed').length,
    }), [events]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return events.filter((e) => {
            if (filter !== 'all' && e.source !== filter) return false;
            if (!q) return true;
            return [e.intervalName, e.vendorName, e.performedByName, e.invoiceNumber, assetLabel?.(e.assetId)]
                .some((t) => String(t ?? '').toLowerCase().includes(q));
        });
    }, [events, filter, search, assetLabel]);

    const bandOf = (e: ServiceEvent) => {
        if (groupBy === 'interval') return e.intervalName ?? 'One-off repair';
        if (groupBy === 'asset') return assetLabel?.(e.assetId) ?? e.assetId;
        if (groupBy === 'vendor') return e.vendorName ?? 'No vendor';
        if (groupBy === 'month') return monthOf(e.performedAt);
        return '';
    };

    const banded = useMemo(() => {
        if (groupBy === 'none') return visible;
        return [...visible].sort((a, b) => {
            if (groupBy === 'month') return String(b.performedAt).localeCompare(String(a.performedAt));
            return bandOf(a).localeCompare(bandOf(b))
                || String(b.performedAt).localeCompare(String(a.performedAt));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, groupBy]);

    const bandCounts = useMemo(() => {
        const m = new Map<string, number>();
        if (groupBy === 'none') return m;
        for (const e of banded) m.set(bandOf(e), (m.get(bandOf(e)) ?? 0) + 1);
        return m;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [banded, groupBy]);

    useEffect(() => { setPage(0); }, [search, filter, groupBy]);

    const paged = banded.slice(page * perPage, page * perPage + perPage);
    const hasActions = !!(onOpen || onEdit || onShare);
    // Performed, Odometer, Hours, Vendor, Performed by, Cost, Document.
    const cols = 5 + (showAsset ? 1 : 0) + (showInterval ? 1 : 0) + (hasActions ? 1 : 0);
    const filtering = filter !== 'all' || !!search.trim() || groupBy !== 'none';

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-900">{title}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                        {subtitle ?? `${events.length} service${events.length === 1 ? '' : 's'} on record`}
                    </p>
                </div>
                {headerAction && <div className="shrink-0">{headerAction}</div>}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-2.5">
                <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
                    <FilterChip label="All" count={counts.all} on={filter === 'all'} always onClick={() => setFilter('all')} />
                    <FilterChip label="Work orders" count={counts.work_order} on={filter === 'work_order'} onClick={() => setFilter('work_order')} />
                    <FilterChip label="Entered by hand" count={counts.manual} on={filter === 'manual'} onClick={() => setFilter('manual')} />
                    <FilterChip label="Opening records" count={counts.seed} on={filter === 'seed'} onClick={() => setFilter('seed')} />
                </div>
                <div className="relative min-w-[180px] flex-1">
                    <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search interval, vendor, invoice..."
                        className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[13px] outline-none focus:border-blue-500"
                    />
                </div>
                <div className="relative">
                    <SlidersHorizontal size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value as HistoryGroupBy)}
                        className="h-8 rounded-lg border border-slate-200 bg-white pl-7 pr-7 text-[12px] font-semibold text-slate-600 outline-none focus:border-blue-500"
                    >
                        <option value="none">Group by</option>
                        {showInterval && <option value="interval">Interval</option>}
                        {showAsset && <option value="asset">Asset</option>}
                        <option value="vendor">Vendor</option>
                        <option value="month">Month</option>
                    </select>
                </div>
                <ResetFilters on={filtering} onReset={() => { setFilter('all'); setGroupBy('none'); setSearch(''); }} />
            </div>

            <div className="border-t border-slate-100">
                {/* Scrolls inside its own box, so the column names stay while the record
                    runs past them. Forty entries is four screens, and by the second one
                    "188,400" with no heading over it could be miles, hours or dollars. */}
                <TableScroll>
                    <table className="w-full min-w-[820px]">
                        <thead>
                            <tr>
                                <TH>Performed</TH>
                                {showAsset && <TH className={COL_RULE}>Asset</TH>}
                                {showInterval && <TH className={COL_RULE}>Interval</TH>}
                                {/* Nine columns did not fit the card this table is read in:
                                    on a unit's History the last two — the cost and the
                                    document — sat off the right-hand edge behind a sideways
                                    scroll nobody uses, which is a worse way to lose a figure
                                    than stacking it. So the two readings share a cell and so
                                    do the shop and the person. They are still one line each,
                                    still scannable down the column, and now all of them are
                                    on the screen at once. */}
                                <TH className={cn(COL_RULE, 'text-right')}>Readings</TH>
                                <TH className={COL_RULE}>Vendor / performed by</TH>
                                <TH className={cn(COL_RULE, 'text-right')}>Cost</TH>
                                <TH className={COL_RULE}>Document</TH>
                                {hasActions && <TH className={cn(COL_RULE, 'text-right')}>Actions</TH>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paged.length === 0 && (
                                <EmptyRow
                                    colSpan={cols}
                                    Icon={History}
                                    title={events.length === 0
                                        ? 'Nothing on record yet'
                                        : 'Nothing matches this view'}
                                    hint={events.length === 0
                                        ? 'Completing a work order files the service here, and so does saying when one was last done.'
                                        : undefined}
                                    onClear={events.length === 0 ? undefined : () => {
                                        setFilter('all'); setGroupBy('none'); setSearch('');
                                    }}
                                    action={events.length === 0 ? emptyAction : undefined}
                                />
                            )}
                            {paged.map((e, i) => {
                                const band = groupBy === 'none' ? null : bandOf(e);
                                const prevBand = i === 0 || groupBy === 'none' ? null : bandOf(paged[i - 1]);
                                return (
                                    <Fragment key={e.id}>
                                        {band && prevBand !== band && (
                                            <TableGroupBand label={band} count={bandCounts.get(band) ?? 0} colSpan={cols} />
                                        )}
                                        <tr
                                            onClick={onOpen ? () => onOpen(e.id) : undefined}
                                            onKeyDown={onOpen ? (ev) => { if (ev.key === 'Enter') onOpen(e.id); } : undefined}
                                            tabIndex={onOpen ? 0 : undefined}
                                            role={onOpen ? 'link' : undefined}
                                            className={cn('transition-colors hover:bg-slate-50/60',
                                                onOpen && 'cursor-pointer focus:bg-slate-50 focus:outline-none')}
                                        >
                                            <TD>
                                                <div className="flex items-center gap-2 whitespace-nowrap">
                                                    <span className="text-[13px] font-semibold text-slate-900">
                                                        {shortDate(e.performedAt)}
                                                    </span>
                                                    <span
                                                        className="text-[11px] text-slate-400"
                                                        title={e.source === 'work_order' ? 'Filed by closing a work order'
                                                            : e.source === 'manual' ? 'Entered by hand'
                                                                : 'Opening record — what the fleet was already carrying'}
                                                    >
                                                        {e.source === 'work_order' ? 'Work order'
                                                            : e.source === 'manual' ? 'By hand' : 'Opening'}
                                                    </span>
                                                </div>
                                            </TD>
                                            {showAsset && (
                                                <TD className={cn(COL_RULE, 'whitespace-nowrap text-sm text-slate-700')}>
                                                    {assetLabel?.(e.assetId) ?? e.assetId}
                                                </TD>
                                            )}
                                            {showInterval && (
                                                <TD className={COL_RULE}>
                                                    <button
                                                        type="button"
                                                        disabled={!e.intervalId || !onOpenInterval}
                                                        onClick={(ev) => { ev.stopPropagation(); if (e.intervalId) onOpenInterval?.(e.intervalId); }}
                                                        className="max-w-[10rem] text-left"
                                                    >
                                                        <div className={cn('truncate text-[13px] font-semibold text-slate-800',
                                                            e.intervalId && onOpenInterval && 'hover:underline')}>
                                                            {e.intervalName ?? 'One-off repair'}
                                                        </div>
                                                    </button>
                                                </TD>
                                            )}
                                            {/* Both meters, one above the other. A visit takes
                                                both readings at the same moment, so they belong
                                                to each other more than either belongs to a column
                                                of its own. */}
                                            <TD className={cn(COL_RULE, 'whitespace-nowrap text-right')}>
                                                <span className="block text-[13px] tabular-nums text-slate-800">
                                                    {e.odometer != null
                                                        ? `${e.odometer.toLocaleString()} mi`
                                                        : <span className="text-slate-300">—</span>}
                                                </span>
                                                {e.engineHours != null && (
                                                    <span className="block text-[11px] tabular-nums text-slate-500">
                                                        {e.engineHours.toLocaleString()} h
                                                    </span>
                                                )}
                                            </TD>
                                            {/* Where it was done, and who did it. Two facts, still
                                                written as two — a driver can have work done at a
                                                shop, and a yard mechanic does it with no shop at
                                                all, so one line can carry either, both or neither. */}
                                            <TD className={COL_RULE}>
                                                <span className="block max-w-[10rem] truncate text-[13px] text-slate-800">
                                                    {e.vendorName ?? <span className="text-slate-300">No shop</span>}
                                                </span>
                                                {e.performedByName ? (
                                                    <span className="block max-w-[10rem] truncate text-[11px] text-slate-500">
                                                        {e.performedByName}
                                                        <span className="text-slate-400">
                                                            {' · '}{e.performedBy === 'driver' ? 'Driver' : 'Mechanic'}
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span className="block text-[11px] text-slate-400">No name on it</span>
                                                )}
                                            </TD>
                                            <TD className={cn(COL_RULE, 'whitespace-nowrap text-right tabular-nums text-slate-700')}>
                                                {/* The amount, and nothing else. The invoice number is
                                                    how you find the paper in a cabinet, and the paper
                                                    itself is one column over — it is still searched on
                                                    and still on the record's own page. */}
                                                {e.cost ? `${e.currency ?? 'USD'} ${e.cost.toFixed(2)}` : <span className="text-slate-300">—</span>}
                                            </TD>
                                            {/*
                                              * The file, named, with a View beside it — the shape
                                              * every other document list in this app uses.
                                              *
                                              * It read "View #INV-3722" before, which named the
                                              * invoice and not the file, and put the only thing you
                                              * could click next to a number it had nothing to do
                                              * with.
                                              */}
                                            <TD className={COL_RULE}>
                                                <div className="flex items-center gap-2 whitespace-nowrap">
                                                    {(e.files?.length ?? 0) > 0 ? (
                                                        <>
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
                                                                    onClick={(ev) => ev.stopPropagation()}
                                                                    className="inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-blue-100 bg-blue-50 px-2 text-[12px] font-bold text-blue-700 transition-colors hover:border-blue-200 hover:bg-blue-100"
                                                                >
                                                                    <Eye size={13} /> View
                                                                </a>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-[13px] text-slate-300">—</span>
                                                    )}
                                                    {/* On the same line as the document rather than under
                                                        it: a second row of chips made every entry two rows
                                                        tall for a button most of them do not have. */}
                                                    {e.orderId && onOpenOrder && (
                                                        <button
                                                            type="button"
                                                            onClick={(ev) => { ev.stopPropagation(); onOpenOrder(e.orderId!); }}
                                                            className="inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 text-[12px] font-bold text-slate-600 hover:bg-slate-50"
                                                        >
                                                            <Briefcase size={12} /> Order
                                                        </button>
                                                    )}
                                                    {e.editedAt && (
                                                        <span className="shrink-0 whitespace-nowrap rounded border border-amber-200 bg-amber-50 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-amber-700">
                                                            Corrected
                                                        </span>
                                                    )}
                                                </div>
                                            </TD>
                                            {hasActions && (
                                                <TD className={cn(COL_RULE, 'text-right')}>
                                                    <div className="flex items-center justify-end gap-1" onClick={(ev) => ev.stopPropagation()}>
                                                        <KebabMenu
                                                            className="justify-end"
                                                            title={`Actions for ${e.intervalName ?? 'this service'}`}
                                                            items={[
                                                                ...(onOpen ? [{ label: 'View', icon: Eye, onClick: () => onOpen(e.id) }] : []),
                                                                ...(onEdit ? [{ label: 'Edit', icon: Pencil, onClick: () => onEdit(e.id) }] : []),
                                                                ...(onShare ? [{ label: 'Share to chat', icon: Share2, onClick: () => onShare(e.id) }] : []),
                                                            ]}
                                                        />
                                                    </div>
                                                </TD>
                                            )}
                                        </tr>
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </TableScroll>
            </div>

            <TablePager
                page={page}
                perPage={perPage}
                total={banded.length}
                label="services"
                onPage={setPage}
                onPerPage={(n) => { setPerPage(n); setPage(0); }}
            />
        </div>
    );
}
