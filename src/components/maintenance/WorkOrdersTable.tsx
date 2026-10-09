// ─────────────────────────────────────────────────────────────────────────────
// WorkOrdersTable — the one list of work orders, wherever they are being read.
//
// There are three places that ask "what has been sent to a shop": the Maintenance
// module (everything), one asset's page (that unit), and one interval's page (that
// rule). They are the same question with a different filter in front of it, and
// they were three hand-rolled tables — one with a pager and no grouping, one with
// neither, and a third that did not exist. A list that looks different on every
// screen is a list people have to re-learn on every screen, so it lives here once,
// with the search / chips / banding / pager every other long list in the app wears.
// ─────────────────────────────────────────────────────────────────────────────

import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Briefcase, Search, SlidersHorizontal } from 'lucide-react';
import { TH, TD, COL_RULE, EmptyRow } from '@/components/ui/CatalogTable';
import { ColumnPicker, FilterChip, ResetFilters, TableGroupBand, type PickerColumn } from '@/components/ui/ListChrome';
import { TablePager } from '@/pages/inventory/TablePager';
import { cn } from '@/lib/utils';

/**
 * One work order, as a list needs it.
 *
 * It is named, not numbered. "#1_OPEN" is an id leaking onto the screen: it says nothing
 * about what the order is, and nobody in a yard refers to one that way. The name is the
 * work and the unit it is on, which is how it gets talked about.
 */
export interface WorkOrderRow {
    id: string;
    /** "Brake Inspection — ACM-T0101". */
    name: string;
    /** The shop the work was sent to. */
    vendor: string;
    /**
     * The driver it was handed to, where one was.
     *
     * Its own column rather than squeezed into the vendor's: they are two different
     * facts about one order. A shop does the work and invoices for it; a driver is how
     * the truck GETS there, or who does the job where the yard handles it. Both can be
     * true at once, and a single "Assigned to" column had to pick one to tell you.
     */
    driver?: string;
    /** Open until it is signed off; then completed, or called off. */
    state: 'open' | 'completed' | 'cancelled';
    createdAt: string;
    dueDate?: string;
    /** The units it covers, in the scope being read. */
    assets: string[];
    services: string[];
    taskCount: number;
    doneCount: number;
    /** What it came to, where it has been closed out or a bill was filed with it. */
    total?: number;
    currency?: string;
}

const STATE_PILL: Record<WorkOrderRow['state'], { cls: string; label: string }> = {
    open: { cls: 'border-blue-200 bg-blue-50 text-blue-700', label: 'Open' },
    completed: { cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: 'Completed' },
    cancelled: { cls: 'border-slate-200 bg-slate-100 text-slate-500', label: 'Cancelled' },
};

const STATE_FILTERS: { id: WorkOrderRow['state'] | 'all'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'open', label: 'Open' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
];

type OrderGroupBy = 'none' | 'status' | 'vendor' | 'asset' | 'service' | 'month';

/**
 * The columns, and the two that cannot be turned off.
 *
 * The name is what the row IS — a list of orders with it hidden is a list of blanks — and
 * the actions are what the list is for. Everything else is somebody’s preference: a yard
 * wants the unit and the date, an office wants the vendor and the cost.
 */
type OrderCol = 'vendor' | 'driver' | 'assets' | 'work' | 'raised' | 'due' | 'cost' | 'status';

/*
 * The same columns the form that raises an order asks for, in the same order: what it is
 * called, the shop, the driver, the work, when it was raised and when it is owed.
 *
 * Cost and Status are off by default. Cost is empty until an order is closed out, so on
 * a list of open ones it is a column of dashes; status is already the filter chips above
 * the list and the band a grouped list is split by. Both stay in the Columns menu for
 * anybody who wants them back.
 */
const ORDER_COLUMNS: PickerColumn<OrderCol | 'name' | 'actions'>[] = [
    { id: 'name', label: 'Order name', locked: true },
    { id: 'vendor', label: 'Vendor' },
    { id: 'driver', label: 'Driver' },
    { id: 'assets', label: 'Assets' },
    { id: 'work', label: 'Service interval' },
    { id: 'raised', label: 'Date' },
    { id: 'due', label: 'Due' },
    { id: 'cost', label: 'Cost' },
    { id: 'status', label: 'Status' },
    { id: 'actions', label: 'Actions', locked: true },
];

const ALL_COLS: OrderCol[] = ['vendor', 'driver', 'assets', 'work', 'raised', 'due', 'cost', 'status'];
const DEFAULT_COLS: OrderCol[] = ['vendor', 'driver', 'assets', 'work', 'raised', 'due'];

const STATE_BAND: Record<WorkOrderRow['state'], { rank: number; label: string }> = {
    open: { rank: 0, label: 'Open' },
    completed: { rank: 1, label: 'Completed' },
    cancelled: { rank: 2, label: 'Cancelled' },
};

const shortDate = (iso: string) =>
    new Date(iso.length === 10 ? `${iso}T08:00:00` : iso)
        .toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

const monthOf = (iso: string) =>
    new Date(iso.length === 10 ? `${iso}T08:00:00` : iso)
        .toLocaleDateString(undefined, { year: 'numeric', month: 'long' });

export function WorkOrdersTable({
    orders, title, subtitle, action, emptyTitle, emptyHint,
    showAssets = true, rowActions, onOpen, filter: filterProp, onFilter,
}: {
    orders: WorkOrderRow[];
    title: string;
    /** The line under the title. Left out, it counts what is open. */
    subtitle?: ReactNode;
    /** The button on the right of the header — usually "Create work order". */
    action?: ReactNode;
    emptyTitle?: string;
    emptyHint?: string;
    /** Off on one asset's page, where every row would name the same unit. */
    showAssets?: boolean;
    rowActions?: (order: WorkOrderRow) => ReactNode;
    onOpen?: (order: WorkOrderRow) => void;
    /**
     * The state filter, where the page outside owns it.
     *
     * The module page's header chips filter this list once its own cards have scrolled
     * away, so the chips and the row above the table have to be the same control rather
     * than two that disagree.
     */
    filter?: WorkOrderRow['state'] | 'all';
    onFilter?: (f: WorkOrderRow['state'] | 'all') => void;
}) {
    const [search, setSearch] = useState('');
    const [ownFilter, setOwnFilter] = useState<WorkOrderRow['state'] | 'all'>('all');
    const filter = filterProp ?? ownFilter;
    const setFilter = (f: WorkOrderRow['state'] | 'all') => { setOwnFilter(f); onFilter?.(f); };
    const [groupBy, setGroupBy] = useState<OrderGroupBy>('none');
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(15);
    const [visibleCols, setVisibleCols] = useState<Set<OrderCol>>(() => new Set(DEFAULT_COLS));
    const showCol = (c: OrderCol) => visibleCols.has(c);

    const counts = useMemo(() => {
        const m: Record<string, number> = { all: orders.length, open: 0, completed: 0, cancelled: 0 };
        for (const o of orders) m[o.state] += 1;
        return m;
    }, [orders]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return orders.filter((o) => {
            if (filter !== 'all' && o.state !== filter) return false;
            if (!q) return true;
            return [o.name, o.vendor, ...o.assets, ...o.services]
                .some((t) => String(t).toLowerCase().includes(q));
        });
    }, [orders, filter, search]);

    const bandOf = (o: WorkOrderRow): { rank: number; label: string } => {
        if (groupBy === 'status') return STATE_BAND[o.state];
        if (groupBy === 'vendor') return { rank: 0, label: o.vendor || 'No vendor' };
        if (groupBy === 'asset') return { rank: 0, label: o.assets[0] ?? 'No asset' };
        if (groupBy === 'service') return { rank: 0, label: o.services[0] ?? 'No service' };
        if (groupBy === 'month') return { rank: 0, label: monthOf(o.createdAt) };
        return { rank: 0, label: '' };
    };

    const banded = useMemo(() => {
        if (groupBy === 'none') return visible;
        return [...visible].sort((a, b) => {
            const ba = bandOf(a), bb = bandOf(b);
            // Newest month first; everything else reads alphabetically.
            if (groupBy === 'month') return String(b.createdAt).localeCompare(String(a.createdAt));
            return ba.rank - bb.rank || ba.label.localeCompare(bb.label);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, groupBy]);

    const bandCounts = useMemo(() => {
        const m = new Map<string, number>();
        if (groupBy === 'none') return m;
        for (const o of banded) {
            const label = bandOf(o).label;
            m.set(label, (m.get(label) ?? 0) + 1);
        }
        return m;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [banded, groupBy]);

    // Narrowing the list moves what was on page three to page one.
    useEffect(() => { setPage(0); }, [search, filter, groupBy]);

    const paged = banded.slice(page * perPage, page * perPage + perPage);
    const cols = 1 + ALL_COLS.filter((c) => showCol(c) && (showAssets || c !== 'assets')).length + (rowActions ? 1 : 0);
    const filtered = filter !== 'all' || !!search.trim() || groupBy !== 'none';

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-900">{title}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                        {subtitle ?? <>{counts.open} open · {orders.length} in all</>}
                    </p>
                </div>
                {action}
            </div>

            {/* The same row of chips, search and banding the asset and interval lists wear. */}
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-2.5">
                <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
                    {STATE_FILTERS.map((f) => (
                        <FilterChip
                            key={f.id}
                            label={f.label}
                            count={counts[f.id] ?? 0}
                            on={filter === f.id}
                            always={f.id === 'all'}
                            onClick={() => setFilter(f.id)}
                        />
                    ))}
                </div>
                <div className="relative min-w-[180px] flex-1">
                    <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search work order, vendor, unit..."
                        className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[13px] outline-none focus:border-blue-500"
                    />
                </div>
                <div className="relative">
                    <SlidersHorizontal size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value as OrderGroupBy)}
                        className="h-8 rounded-lg border border-slate-200 bg-white pl-7 pr-7 text-[12px] font-semibold text-slate-600 outline-none focus:border-blue-500"
                    >
                        {/* The control is already labelled "Group by" by its own icon and its
                            first option; repeating it on every line just made each one longer
                            than the box. */}
                        <option value="none">Group by</option>
                        <option value="service">Service</option>
                        <option value="vendor">Vendor</option>
                        {showAssets && <option value="asset">Asset</option>}
                        <option value="status">Status</option>
                        <option value="month">Month</option>
                    </select>
                </div>
                <ColumnPicker
                    columns={showAssets ? ORDER_COLUMNS : ORDER_COLUMNS.filter((c) => c.id !== 'assets')}
                    visible={visibleCols as Set<OrderCol | 'name' | 'actions'>}
                    onToggle={(id) => setVisibleCols((prev) => {
                        const next = new Set(prev);
                        const col = id as OrderCol;
                        if (next.has(col)) next.delete(col); else next.add(col);
                        return next;
                    })}
                />
                <ResetFilters on={filtered} onReset={() => { setFilter('all'); setGroupBy('none'); setSearch(''); }} />
            </div>

            <div className="border-t border-slate-100">
                <div className="overflow-x-auto">
                    {/* Narrow enough to read where it is read. On an asset's own page
                        there is no Assets column and the card is ~950px wide, so 820 of
                        minimum left the Due date off the end of the screen. */}
                    <table className={cn('w-full', showAssets ? 'min-w-[900px]' : 'min-w-[720px]')}>
                        <thead>
                            <tr>
                                <TH>Order name</TH>
                                {showCol('vendor') && <TH className={COL_RULE}>Vendor</TH>}
                                {showCol('driver') && <TH className={COL_RULE}>Driver</TH>}
                                {showAssets && showCol('assets') && <TH className={COL_RULE}>Assets</TH>}
                                {showCol('work') && <TH className={COL_RULE}>Service interval</TH>}
                                {showCol('raised') && <TH className={COL_RULE}>Date</TH>}
                                {showCol('due') && <TH className={COL_RULE}>Due</TH>}
                                {showCol('cost') && <TH className={COL_RULE}>Cost</TH>}
                                {showCol('status') && <TH className={COL_RULE}>Status</TH>}
                                {rowActions && <TH className={cn(COL_RULE, 'text-right')}>Actions</TH>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paged.length === 0 && (
                                <EmptyRow
                                    colSpan={cols}
                                    Icon={Briefcase}
                                    title={orders.length === 0
                                        ? (emptyTitle ?? 'No work orders yet')
                                        : 'No work order matches this view'}
                                    hint={orders.length === 0 ? emptyHint : undefined}
                                    onClear={orders.length === 0 ? undefined : () => {
                                        setFilter('all'); setGroupBy('none'); setSearch('');
                                    }}
                                />
                            )}
                            {paged.map((o, i) => {
                                // The band only announces itself where it changes.
                                const band = groupBy === 'none' ? null : bandOf(o);
                                const prevBand = i === 0 || groupBy === 'none' ? null : bandOf(paged[i - 1]);
                                const pill = STATE_PILL[o.state];
                                return (
                                    <Fragment key={o.id}>
                                        {band && (!prevBand || prevBand.label !== band.label) && (
                                            <TableGroupBand label={band.label} count={bandCounts.get(band.label) ?? 0} colSpan={cols} />
                                        )}
                                        <tr
                                            className={cn('transition-colors hover:bg-slate-50/60', onOpen && 'cursor-pointer')}
                                            onClick={onOpen ? () => onOpen(o) : undefined}
                                        >
                                            {/* The name, and that is the cell. "raised 5 Sep"
                                                sat under it as a second line on every row of
                                                a list that already has a Raised column. */}
                                            <TD>
                                                <div className="max-w-[12rem] truncate text-[13px] font-bold text-slate-900" title={o.name}>
                                                    {o.name}
                                                </div>
                                            </TD>
                                            {showCol('vendor') && (
                                                <TD className={cn(COL_RULE, 'text-slate-700')}>
                                                    <div className="max-w-[11rem] truncate" title={o.vendor}>{o.vendor}</div>
                                                </TD>
                                            )}
                                            {showCol('driver') && (
                                                <TD className={cn(COL_RULE, 'text-slate-700')}>
                                                    {o.driver
                                                        ? <div className="max-w-[9rem] truncate" title={o.driver}>{o.driver}</div>
                                                        : <span className="text-slate-300">—</span>}
                                                </TD>
                                            )}
                                            {showAssets && showCol('assets') && (
                                                <TD className={COL_RULE}>
                                                    <div className="max-w-[12rem] truncate text-sm text-slate-700" title={o.assets.join(', ')}>
                                                        {o.assets.join(', ') || <span className="text-slate-300">—</span>}
                                                    </div>
                                                </TD>
                                            )}
                                            {showCol('work') && (
                                                <TD className={COL_RULE}>
                                                    {/* What it covers and how much of it is done, beside
                                                        each other. A progress bar over a two-job order is
                                                        three pixels of information and a whole column of
                                                        chrome; under the work it was a second row of
                                                        table on every order with more than one job. */}
                                                    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                                                        <span className="max-w-[9rem] truncate text-sm text-slate-700" title={o.services.join(', ')}>
                                                            {o.services.join(', ') || `${o.taskCount} job${o.taskCount === 1 ? '' : 's'}`}
                                                        </span>
                                                        {o.taskCount > 1 && (
                                                            <span className="shrink-0 text-[11px] text-slate-400">
                                                                {o.doneCount}/{o.taskCount} done
                                                            </span>
                                                        )}
                                                    </div>
                                                </TD>
                                            )}
                                            {showCol('raised') && (
                                                <TD className={cn(COL_RULE, 'whitespace-nowrap text-sm text-slate-600')}>
                                                    {shortDate(o.createdAt)}
                                                </TD>
                                            )}
                                            {showCol('due') && (
                                                <TD className={cn(COL_RULE, 'whitespace-nowrap text-sm text-slate-600')}>
                                                    {o.dueDate ? shortDate(o.dueDate) : <span className="text-slate-300">—</span>}
                                                </TD>
                                            )}
                                            {showCol('cost') && (
                                                <TD className={cn(COL_RULE, 'whitespace-nowrap tabular-nums text-slate-700')}>
                                                    {o.total ? `${o.currency ?? 'USD'} ${o.total.toFixed(2)}` : <span className="text-slate-300">—</span>}
                                                </TD>
                                            )}
                                            {showCol('status') && (
                                                <TD className={COL_RULE}>
                                                    <span className={cn(
                                                        'inline-flex whitespace-nowrap items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                                                        pill.cls,
                                                    )}>
                                                        {pill.label}
                                                    </span>
                                                </TD>
                                            )}
                                            {rowActions && (
                                                <TD className={cn(COL_RULE, 'text-right')}>
                                                    <div onClick={(e) => e.stopPropagation()}>{rowActions(o)}</div>
                                                </TD>
                                            )}
                                        </tr>
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Always shown, even on one row: "Showing 1–1 of 1" is how a list says it is
                not hiding anything, and a footer that comes and goes moves the page under you. */}
            <TablePager
                page={page}
                perPage={perPage}
                total={banded.length}
                label="work orders"
                onPage={setPage}
                onPerPage={(n) => { setPerPage(n); setPage(0); }}
            />
        </div>
    );
}
