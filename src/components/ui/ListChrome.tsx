// The furniture every list in this app is built from: a search box, a filter row, a column
// picker, sortable headers, a history toggle and a pager.
//
// It was written twice before it was written here — the compliance record table and the
// insurance filings on the MC certificate are the same list of the same shape, and two hand
// -rolled copies drift within a week: a different row height, a chevron that turns the other
// way, a pager that says "1-25 of 60" where the other says "1–25 of 60". Reading a screen
// gets slower every time one of those differs for no reason. So the parts live here and both
// tables ask for them.
//
// The look is the compliance table's, exactly — these were lifted from it rather than
// redesigned, so nothing moves on the screens that already use it.

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, Columns, Filter, Lock, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PAGE_SIZES, TH_CLS, bandTone, type SortState } from '@/components/ui/list-chrome';

/** A sortable (or plain) column heading. */
export function SortTh<C extends string>({ col, label, sortable, sort, onSort, className }: {
    col?: C; label: ReactNode; sortable?: boolean;
    sort: SortState<C> | null; onSort?: (c: C) => void; className?: string;
}) {
    if (!sortable || !col || !onSort) return <th className={cn(TH_CLS, className)}>{label}</th>;
    const active = sort?.col === col;
    const Icon = active ? (sort.dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
    return (
        <th className={cn(TH_CLS, className)}>
            <button type="button" onClick={() => onSort(col)} className={cn('inline-flex items-center gap-1 hover:text-slate-700 transition-colors', active && 'text-blue-600')}>
                {label} <Icon size={12} className={active ? '' : 'text-slate-300'} />
            </button>
        </th>
    );
}

/** One column a picker can show or hide. A locked column is always on and says why. */
export interface PickerColumn<C extends string> { id: C; label: string; locked?: boolean }

/** Column-visibility dropdown. */
export function ColumnPicker<C extends string>({ columns, visible, onToggle, align = 'right' }: {
    columns: PickerColumn<C>[]; visible: Set<C>; onToggle: (id: C) => void; align?: 'left' | 'right';
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen(o => !o)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
                <Columns size={14} /> Columns <ChevronDown size={13} className="text-slate-400" />
            </button>
            {open && (
                <>
                    {/* A click anywhere else closes it — a dropdown that needs the same button
                        clicked again to dismiss is a dropdown people leave open. */}
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className={cn('absolute z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white shadow-lg p-1.5', align === 'right' ? 'right-0' : 'left-0')}>
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Toggle columns</div>
                        {columns.map(c => (
                            <label key={c.id} className={cn('flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-slate-700', c.locked ? 'cursor-default opacity-80' : 'hover:bg-slate-50 cursor-pointer')}>
                                <input type="checkbox" checked={!!c.locked || visible.has(c.id)} disabled={c.locked}
                                    onChange={() => !c.locked && onToggle(c.id)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 disabled:opacity-100" />
                                <span className="flex-1">{c.label}</span>
                                {c.locked && <Lock size={11} className="text-slate-400" />}
                            </label>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * Search + filters + column picker, in that order and on one line until the width runs out.
 * `filters` is a slot: what a list filters BY is its own business, but where the controls sit
 * and what they look like is not.
 */
export function ListToolbar({ search, onSearch, placeholder, filters, filtersExtra, columns, className }: {
    search: string; onSearch: (v: string) => void; placeholder: string;
    filters?: ReactNode;
    /** Controls that narrow the list but are not value filters — a date range, a grouping.
     *  Separate from `filters` so they sit outside the funnel icon that labels those. */
    filtersExtra?: ReactNode;
    columns?: ReactNode; className?: string;
}) {
    return (
        <div className={cn('flex items-center gap-2 px-5 py-3 border-b border-slate-100 flex-wrap', className)}>
            <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => onSearch(e.target.value)} placeholder={placeholder}
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
            </div>
            {filters && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400"><Filter size={13} /></span>}
            {filters}
            {filtersExtra}
            {columns && <div className="hidden md:flex md:items-center md:gap-2">{columns}</div>}
        </div>
    );
}

/** A filter dropdown, styled like every other one. */
export function FilterSelect({ value, onChange, title, allLabel, options }: {
    value: string; onChange: (v: string) => void; title: string; allLabel: string; options: string[];
}) {
    return (
        <select value={value} onChange={e => onChange(e.target.value)} title={title}
            className="h-9 max-w-[13rem] rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
            <option value="">{allLabel}</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    );
}

/**
 * The switch that reveals the rows a list hides by default — records superseded by a newer
 * one, insurance filings that have been cancelled. Disabled, with its count still showing,
 * when there are none: "0" is an answer, and a control that vanishes is a control people
 * stop looking for.
 */
export function HistoryToggle({ on, onChange, count, label = 'Show history', emptyTitle = 'No older rows yet' }: {
    on: boolean; onChange: (v: boolean) => void; count: number; label?: string; emptyTitle?: string;
}) {
    const none = count === 0;
    return (
        <button type="button" disabled={none} onClick={() => onChange(!on)}
            title={none ? emptyTitle : on ? `Hide ${label.replace(/^Show /, '')}` : label}
            className={cn('inline-flex items-center gap-2 text-[12px] font-semibold', none ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-slate-800')}>
            <span className={cn('relative h-5 w-9 rounded-full transition-colors', on && !none ? 'bg-blue-600' : 'bg-slate-300')}>
                <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', on && !none ? 'left-[18px]' : 'left-0.5')} />
            </span>
            {label}
            <span className={cn('inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-slate-100', none ? 'text-slate-400' : 'text-slate-500')}>{count}</span>
        </button>
    );
}

/** Rows per page, the range being shown, and the pager. */
export function TablePager({ page, pageSize, total, onPage, onPageSize, className }: {
    page: number; pageSize: number; total: number;
    onPage: (p: number) => void; onPageSize: (n: number) => void; className?: string;
}) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const safe = Math.min(page, pages);
    const start = (safe - 1) * pageSize;
    return (
        <div className={cn('flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 flex-wrap', className)}>
            <div className="flex items-center gap-3 text-[12px] text-slate-500">
                <label className="flex items-center gap-1.5">
                    Rows per page
                    <select value={pageSize} onChange={e => onPageSize(Number(e.target.value))}
                        className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                        {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </label>
                <span className="tabular-nums">{total === 0 ? '0' : `${start + 1}–${Math.min(start + pageSize, total)}`} of {total}</span>
            </div>
            <div className="flex items-center gap-1">
                <button type="button" disabled={safe <= 1} onClick={() => onPage(safe - 1)}
                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                    <ChevronLeft size={14} /> Prev
                </button>
                <span className="px-2 text-[12px] text-slate-600 tabular-nums">Page {safe} of {pages}</span>
                <button type="button" disabled={safe >= pages} onClick={() => onPage(safe + 1)}
                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                    Next <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}

/**
 * The band across a grouped table that names a group and says how big it is.
 *
 * The tint is on an inner block rather than on the cell: a `.pin-first` table pins the first
 * cell of every row and paints it white, and a band's cell IS the first cell.
 */
/**
 * One filter chip carrying its own count.
 *
 * A row of chips that say only what they are makes you press each one to find out whether
 * it finds anything. With the number on it, the row is readable before it is used, and a
 * chip that would find nothing greys out instead of leading you to an empty table.
 *
 * `always` marks a group's own "all" chip: it stays pressable at zero, because a group with
 * no way back to all is a group you can get stuck in.
 */
export function FilterChip({ label, count, on, always, onClick }: {
    label: string; count: number; on: boolean; always?: boolean; onClick: () => void;
}) {
    const dead = count === 0 && !always;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={dead}
            className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-[12px] font-bold transition-colors',
                on ? 'bg-blue-600 text-white'
                    : dead ? 'cursor-not-allowed text-slate-300'
                    : 'text-slate-600 hover:bg-slate-200/60',
            )}
        >
            {label}
            <span className={cn('text-[11px] tabular-nums', on ? 'text-blue-100' : 'text-slate-400')}>
                {count}
            </span>
        </button>
    );
}

export function TableGroupBand({ label, count, colSpan }: { label: string; count: number; colSpan: number }) {
    return (
        <tr>
            <td colSpan={colSpan} className="border-y border-slate-200 p-0">
                <div className={cn('px-5 py-1.5', bandTone(label))}>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
                    <span className="ml-2 text-[10px] font-semibold tabular-nums opacity-60">{count}</span>
                </div>
            </td>
        </tr>
    );
}
