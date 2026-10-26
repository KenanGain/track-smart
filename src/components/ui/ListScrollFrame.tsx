import type { ReactNode, Ref, UIEventHandler } from 'react';
import { cn } from '@/lib/utils';
import { PAGE_PAD } from '@/components/ui/ListPageHeader';
import { mergeRefs, useScrollAwayHead } from '@/components/ui/use-scroll-away-head';
import { useBridgeAway } from '@/components/ui/list-header-bridge';

/**
 * The body of a list page under a `ListPageHeader`: whatever sits above the list (a notice,
 * the KPI cards) scrolls up and away first, then the list card — exactly one screen tall —
 * takes the scroll, with its column header pinned and its pager on screen. See
 * `useScrollAwayHead` for how the hand-over works. Once the cards are out of view the page
 * header is told (`list-header-bridge`), so it condenses and shows their figures instead.
 *
 * The card opens with the list's own line — what it is, how many are showing, and the
 * controls that act on the whole list (columns, export) — so the toolbar under it carries
 * only search, filters and grouping and stays on one row.
 *
 * `scrollRef` / `onScroll` land on the table's own scroll box, so a header that condenses
 * (`useCondensingHeader`) folds as the rows are read.
 */
export function ListScrollFrame({
    above, title, count, total, description, actions, toolbar, footer, children, scrollRef, onScroll, contentKey, pad = PAGE_PAD,
}: {
    above?: ReactNode;
    /** The list's name, on the line at the top of the card. */
    title?: string;
    /** How many rows are showing; with `total`, reads "12 of 41" while filtered. */
    count?: number;
    total?: number;
    /** One line saying what the list is. */
    description?: ReactNode;
    /** Whole-list controls — the column picker, Export. */
    actions?: ReactNode;
    toolbar?: ReactNode;
    footer?: ReactNode;
    /** The table. Pin its header cells with `PIN_TH`. */
    children: ReactNode;
    scrollRef?: Ref<HTMLDivElement>;
    onScroll?: UIEventHandler<HTMLDivElement>;
    /** Anything that changes the height of `above` or the row count — re-measures the hand-over. */
    contentKey?: unknown;
    pad?: string;
}) {
    const { outerRef, innerRef, rowsLive, canScroll, onOuterScroll } = useScrollAwayHead(contentKey);
    useBridgeAway(rowsLive && canScroll);
    const filtered = count !== undefined && total !== undefined && count !== total;
    return (
        <div ref={outerRef} onScroll={onOuterScroll} className={cn('min-h-0 flex-1 overflow-y-auto bg-slate-50 py-4 sm:py-5 [overflow-anchor:none]', pad)}>
            {above && <div className="space-y-4">{above}</div>}
            <div className={cn('flex h-[calc(100%+0.5rem)] min-h-[22rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm', above && 'mt-4')}>
                {(title || description || actions) && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-100 px-5 py-3">
                        <div className="min-w-0 flex-1">
                            {title && (
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-bold text-slate-900">{title}</h2>
                                    {count !== undefined && (
                                        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                                            filtered ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600')}>
                                            {filtered ? `${count.toLocaleString()} of ${total!.toLocaleString()}` : count.toLocaleString()}
                                        </span>
                                    )}
                                </div>
                            )}
                            {description && <p className="mt-0.5 truncate text-[12px] text-slate-500">{description}</p>}
                        </div>
                        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
                    </div>
                )}
                {toolbar}
                <div ref={mergeRefs(innerRef, scrollRef)} onScroll={onScroll}
                    className={cn('min-h-0 max-h-[calc(100dvh-12rem)] flex-1 [overflow-anchor:none]', rowsLive ? 'overflow-auto' : 'overflow-x-auto overflow-y-hidden')}>
                    {children}
                </div>
                {footer}
            </div>
        </div>
    );
}
