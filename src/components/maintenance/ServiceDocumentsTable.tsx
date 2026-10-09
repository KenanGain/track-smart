// ─────────────────────────────────────────────────────────────────────────────
// ServiceDocumentsTable — the paper a record produced, read as paper.
//
// The question this answers
// ─────────────────────────
// The service list answers "what has been done to this truck". It is the right list for
// a countdown and the wrong one for the other thing people come to a maintenance record
// for: "where is the safety certificate", "did that brake job ever send us an invoice",
// "which of these have we not labelled yet". Those are questions about DOCUMENTS, and
// asking them of a list of services means opening services one at a time to look inside.
//
// So the same record is offered two ways. Nothing here is a second copy: every row is one
// file on one ledger entry, read straight off it — a document withdrawn with its service
// disappears from here, and a tag added in the record form shows up here without anything
// being told about it.
// ─────────────────────────────────────────────────────────────────────────────

import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { FileText, Search, SlidersHorizontal, Eye, Download, Tag } from 'lucide-react';
import { TH, TD, COL_RULE, RowIcon, EmptyRow, TableScroll } from '@/components/ui/CatalogTable';
import { FilterChip, ResetFilters, TableGroupBand } from '@/components/ui/ListChrome';
import { TablePager } from '@/pages/inventory/TablePager';
import { tagColor } from '@/pages/compliance/safety-tags.data';
import type { ServiceEvent, ServiceDocument } from '@/pages/assets/service-history';
import { cn } from '@/lib/utils';

type DocGroupBy = 'none' | 'tag' | 'vendor' | 'month' | 'asset';

const shortDate = (iso?: string) => (iso
    ? new Date(iso.length === 10 ? `${iso}T08:00:00` : iso)
        .toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '—');

const monthOf = (iso: string) =>
    new Date(iso.length === 10 ? `${iso}T08:00:00` : iso)
        .toLocaleDateString(undefined, { year: 'numeric', month: 'long' });

const UNTAGGED = 'Untagged';

/** One file, with the service it came in on still attached to it. */
interface DocRow {
    key: string;
    file: ServiceDocument;
    event: ServiceEvent;
}

export function ServiceDocumentsTable({
    events, title, subtitle, assetLabel, showAsset = false, showInterval = false,
    onOpenRecord, headerAction, emptyHint,
}: {
    events: ServiceEvent[];
    title: string;
    subtitle?: string;
    assetLabel?: (id: string) => string;
    /** Off on one unit's own page, where every row would name the same truck. */
    showAsset?: boolean;
    /** Off on a rule's page, where every row would name the same rule. */
    showInterval?: boolean;
    /**
     * Open the service this file was filed with.
     *
     * A document on its own is half an answer: the invoice matters because of what it was
     * for, at what reading, by whom. The row names the service and this is how you get to
     * the rest of it.
     */
    onOpenRecord?: (eventId: string) => void;
    headerAction?: ReactNode;
    emptyHint?: string;
}) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'tagged' | 'untagged'>('all');
    const [groupBy, setGroupBy] = useState<DocGroupBy>('none');
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(15);

    /** Every file on every entry, newest service first — the one source, flattened. */
    const rows = useMemo<DocRow[]>(() => [...events]
        .sort((a, b) => String(b.performedAt).localeCompare(String(a.performedAt)))
        .flatMap((e) => (e.files ?? []).map((f, i) => ({ key: `${e.id}:${i}`, file: f, event: e }))),
        [events]);

    const counts = useMemo(() => ({
        all: rows.length,
        tagged: rows.filter((r) => (r.file.tags?.length ?? 0) > 0).length,
        // Worth a chip of its own: an untagged file is one nobody will find again, and
        // this is the only screen that can tell you how many of them there are.
        untagged: rows.filter((r) => (r.file.tags?.length ?? 0) === 0).length,
    }), [rows]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((r) => {
            const tagged = (r.file.tags?.length ?? 0) > 0;
            if (filter === 'tagged' && !tagged) return false;
            if (filter === 'untagged' && tagged) return false;
            if (!q) return true;
            return [
                r.file.name, r.event.vendorName, r.event.intervalName,
                r.event.performedByName, r.event.invoiceNumber,
                assetLabel?.(r.event.assetId), ...(r.file.tags ?? []),
            ].some((t) => String(t ?? '').toLowerCase().includes(q));
        });
    }, [rows, filter, search, assetLabel]);

    const bandOf = (r: DocRow) => {
        if (groupBy === 'vendor') return r.event.vendorName ?? 'No shop';
        if (groupBy === 'month') return monthOf(r.event.performedAt);
        if (groupBy === 'asset') return assetLabel?.(r.event.assetId) ?? r.event.assetId;
        return '';
    };

    /*
     * Banded, and by tag a file can be in two bands at once.
     *
     * A document tagged "Invoice" and "Brakes" genuinely belongs under both headings, and
     * showing it only under the first would make every band a lie about what is in it —
     * you would look under Brakes for the brake invoice and not find it. So grouping by
     * tag lists it under each of its tags; the band counts say how many are in each, and
     * the total under the list still counts files, not appearances.
     */
    const banded = useMemo<{ r: DocRow; band: string }[]>(() => {
        if (groupBy === 'none') return visible.map((r) => ({ r, band: '' }));
        const out = groupBy === 'tag'
            ? visible.flatMap((r) => ((r.file.tags?.length ?? 0) > 0
                ? r.file.tags!.map((t) => ({ r, band: t }))
                : [{ r, band: UNTAGGED }]))
            : visible.map((r) => ({ r, band: bandOf(r) }));
        return out.sort((a, b) => {
            if (groupBy === 'month') {
                return String(b.r.event.performedAt).localeCompare(String(a.r.event.performedAt));
            }
            // Untagged last: it is the leftovers, not a category.
            if (a.band === UNTAGGED && b.band !== UNTAGGED) return 1;
            if (b.band === UNTAGGED && a.band !== UNTAGGED) return -1;
            return a.band.localeCompare(b.band)
                || String(b.r.event.performedAt).localeCompare(String(a.r.event.performedAt));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, groupBy]);

    const bandCounts = useMemo(() => {
        const m = new Map<string, number>();
        if (groupBy === 'none') return m;
        for (const b of banded) m.set(b.band, (m.get(b.band) ?? 0) + 1);
        return m;
    }, [banded, groupBy]);

    useEffect(() => { setPage(0); }, [search, filter, groupBy]);

    const paged = banded.slice(page * perPage, page * perPage + perPage);
    // Document, Tags, Filed with, Added, Actions.
    const cols = 5 + (showAsset ? 1 : 0) + (showInterval ? 1 : 0);
    const filtering = filter !== 'all' || !!search.trim() || groupBy !== 'none';

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-900">{title}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                        {subtitle ?? `${rows.length} file${rows.length === 1 ? '' : 's'} filed with these services`}
                    </p>
                </div>
                {headerAction && <div className="shrink-0">{headerAction}</div>}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-2.5">
                <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
                    <FilterChip label="All" count={counts.all} on={filter === 'all'} always onClick={() => setFilter('all')} />
                    <FilterChip label="Tagged" count={counts.tagged} on={filter === 'tagged'} onClick={() => setFilter('tagged')} />
                    <FilterChip label="Untagged" count={counts.untagged} on={filter === 'untagged'} onClick={() => setFilter('untagged')} />
                </div>
                <div className="relative min-w-[180px] flex-1">
                    <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search file name, tag, vendor…"
                        className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[13px] outline-none focus:border-blue-500"
                    />
                </div>
                <div className="relative">
                    <SlidersHorizontal size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value as DocGroupBy)}
                        className="h-8 rounded-lg border border-slate-200 bg-white pl-7 pr-7 text-[12px] font-semibold text-slate-600 outline-none focus:border-blue-500"
                    >
                        <option value="none">Group by</option>
                        <option value="tag">Tag</option>
                        <option value="vendor">Vendor</option>
                        <option value="month">Month</option>
                        {showAsset && <option value="asset">Asset</option>}
                    </select>
                </div>
                <ResetFilters on={filtering} onReset={() => { setFilter('all'); setGroupBy('none'); setSearch(''); }} />
            </div>

            <div className="border-t border-slate-100">
                {/* Same box as the service list, for the same reason: a tag band three
                    screens down needs its column names still over it. */}
                <TableScroll>
                    <table className="w-full min-w-[760px]">
                        <thead>
                            <tr>
                                <TH>Document</TH>
                                <TH className={COL_RULE}>Tags</TH>
                                {showAsset && <TH className={COL_RULE}>Asset</TH>}
                                {showInterval && <TH className={COL_RULE}>Interval</TH>}
                                <TH className={COL_RULE}>Filed with</TH>
                                <TH className={COL_RULE}>Added</TH>
                                <TH className={cn(COL_RULE, 'text-right')}>Actions</TH>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paged.length === 0 && (
                                <EmptyRow
                                    colSpan={cols}
                                    Icon={FileText}
                                    title={rows.length === 0 ? 'No paper on record yet' : 'Nothing matches this view'}
                                    hint={rows.length === 0
                                        ? (emptyHint ?? 'Invoices, inspection sheets and certificates attached to a service show up here.')
                                        : undefined}
                                    onClear={rows.length === 0 ? undefined : () => {
                                        setFilter('all'); setGroupBy('none'); setSearch('');
                                    }}
                                />
                            )}
                            {paged.map(({ r, band }, i) => {
                                const prev = i === 0 ? null : paged[i - 1].band;
                                const { file, event } = r;
                                return (
                                    <Fragment key={`${r.key}:${band}`}>
                                        {groupBy !== 'none' && band !== prev && (
                                            <TableGroupBand label={band} count={bandCounts.get(band) ?? 0} colSpan={cols} />
                                        )}
                                        <tr className="transition-colors hover:bg-slate-50/60">
                                            <TD>
                                                <div className="flex items-center gap-2.5">
                                                    <RowIcon Icon={FileText} tone="blue" />
                                                    <div className="min-w-0">
                                                        <div className="max-w-[16rem] truncate text-[13px] font-semibold leading-tight text-slate-800" title={file.name}>
                                                            {file.name}
                                                        </div>
                                                        <p className="truncate text-[11px] leading-tight text-slate-500">
                                                            {file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB` : 'PDF'}
                                                            {event.vendorName ? ` · ${event.vendorName}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TD>
                                            <TD className={COL_RULE}>
                                                {(file.tags?.length ?? 0) > 0 ? (
                                                    <div className="flex flex-wrap items-center gap-1">
                                                        {file.tags!.map((t) => (
                                                            <span key={t} className={cn(
                                                                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                                                                tagColor(t))}>
                                                                {t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[12px] text-slate-400">
                                                        <Tag size={11} /> Untagged
                                                    </span>
                                                )}
                                            </TD>
                                            {showAsset && (
                                                <TD className={cn(COL_RULE, 'whitespace-nowrap text-[13px] text-slate-700')}>
                                                    {assetLabel?.(event.assetId) ?? event.assetId}
                                                </TD>
                                            )}
                                            {showInterval && (
                                                <TD className={cn(COL_RULE, 'text-[13px] text-slate-700')}>
                                                    <span className="block max-w-[10rem] truncate">
                                                        {event.intervalName ?? 'One-off repair'}
                                                    </span>
                                                </TD>
                                            )}
                                            {/* The service it came in on. A document on its own is
                                                half an answer — this is the other half. */}
                                            <TD className={COL_RULE}>
                                                <button
                                                    type="button"
                                                    disabled={!onOpenRecord}
                                                    onClick={() => onOpenRecord?.(event.id)}
                                                    className="min-w-0 text-left"
                                                >
                                                    <span className={cn('block whitespace-nowrap text-[13px] font-semibold text-slate-800',
                                                        onOpenRecord && 'hover:text-blue-600 hover:underline')}>
                                                        {shortDate(event.performedAt)}
                                                    </span>
                                                    <span className="block text-[11px] text-slate-500">
                                                        {event.source === 'work_order' ? 'Work order'
                                                            : event.source === 'manual' ? 'Entered by hand' : 'Opening record'}
                                                    </span>
                                                </button>
                                            </TD>
                                            <TD className={cn(COL_RULE, 'whitespace-nowrap text-[13px] tabular-nums text-slate-600')}>
                                                {file.addedAt ? shortDate(file.addedAt) : <span className="text-slate-300">—</span>}
                                            </TD>
                                            <TD className={cn(COL_RULE, 'whitespace-nowrap text-right')}>
                                                {file.url ? (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <a
                                                            href={file.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                                                        >
                                                            <Eye size={13} /> View
                                                        </a>
                                                        <a
                                                            href={file.url}
                                                            download
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                                            aria-label={`Download ${file.name}`}
                                                        >
                                                            <Download size={13} />
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-slate-400">No copy attached</span>
                                                )}
                                            </TD>
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
                label={groupBy === 'tag' ? 'listings' : 'documents'}
                onPage={setPage}
                onPerPage={(n) => { setPerPage(n); setPage(0); }}
            />
        </div>
    );
}
