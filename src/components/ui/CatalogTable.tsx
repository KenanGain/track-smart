// ─────────────────────────────────────────────────────────────────────────────
// CatalogTable — the pieces every catalog list in the app is built from.
//
// The Inventory list settled the shape: KPI tiles across the top, a scrolling strip
// of category tabs with counts, a search row, then a table with ruled columns, an
// icon chip against the first cell and a pager underneath. Vendors and Service Types
// each had their own idea of a table; this is the one they now share.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';
import { TabScroller } from '@/components/ui/TabScroller';
import { cn } from '@/lib/utils';

/**
 * Sticky, so the column you are reading still has a name three screens down.
 *
 * On the CELLS, never on the <thead>: a table paints its background on the cells, so a
 * sticky thead stays put while the rows scroll straight through it. Each cell carries its
 * own opaque background and its own stacking instead.
 *
 * `-top-px` rather than `top-0`, because a table's own top border sits between the
 * scrollport edge and the first header cell, and at fractional zoom a one-pixel line of
 * the row beneath bleeds through above it.
 *
 * This only DOES anything inside something that scrolls — see `TableScroll`.
 */
export const TH = ({ children, className }: { children?: ReactNode; className?: string }) => (
    <th className={cn(
        'sticky -top-px z-10 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap',
        className,
    )}>
        {children}
    </th>
);

/**
 * The box a table scrolls inside, so its headings can stay.
 *
 * The missing half of `TH`. A sticky cell sticks to its nearest SCROLLPORT, and the plain
 * `overflow-x-auto` wrapper these tables sat in is exactly that — a scrollport whose
 * height is the whole table, so it never scrolls vertically and the headings never had
 * anything to stick to. The header was declared sticky everywhere and stuck nowhere; you
 * scrolled a forty-row record and lost the column names on row six.
 *
 * Giving the box a ceiling is what turns it into a scrollport that scrolls. Short tables
 * are unaffected — a list of three rows never reaches the ceiling, so nothing nests and
 * nothing scrolls twice. Long ones scroll their rows under their own headings, with the
 * card's title, filters and pager staying put around them.
 */
export const TableScroll = ({ children, className }: { children?: ReactNode; className?: string }) => (
    <div className={cn('max-h-[calc(100vh-18rem)] overflow-auto', className)}>
        {children}
    </div>
);

export const TD = ({ children, className, onClick }: {
    children?: ReactNode;
    className?: string;
    /** Set on cells whose own controls must not also trigger the row's click. */
    onClick?: React.MouseEventHandler<HTMLTableCellElement>;
}) => (
    <td className={cn('px-4 py-3 align-middle text-sm', className)} onClick={onClick}>{children}</td>
);

/** The ruled divider every column after the first carries. */
export const COL_RULE = 'border-l border-slate-200';

/**
 * The category strip: chevrons only while there is more that way, a fade so cut-off
 * tabs look cut off, and the active tab scrolled into view when it changes. A dozen
 * categories do not fit a laptop, and a bare overflow row just stops mid-word.
 */
export function CatalogTabs<T extends string>({ tabs, active, onChange, ariaLabel }: {
    tabs: { id: T; label: string; count: number }[];
    active: T;
    onChange: (t: T) => void;
    ariaLabel: string;
}) {
    return (
        <div className="border-b border-slate-200 bg-slate-50/40 px-5">
            <TabScroller ariaLabel={ariaLabel} activeKey={active}>
                {tabs.map((t) => {
                    const isActive = active === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => onChange(t.id)}
                            data-tab-active={isActive || undefined}
                            className={cn(
                                'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] font-semibold transition-colors',
                                isActive
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800',
                            )}
                        >
                            {t.label}
                            <span className={cn(
                                'inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                                isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/70 text-slate-600',
                            )}>
                                {t.count}
                            </span>
                        </button>
                    );
                })}
            </TabScroller>
        </div>
    );
}

/** The tinted square against the first cell of a row. */
export function RowIcon({ Icon, tone = 'slate' }: {
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    tone?: 'blue' | 'violet' | 'amber' | 'emerald' | 'slate';
}) {
    const cls = {
        blue: 'bg-blue-50 text-blue-600',
        violet: 'bg-violet-50 text-violet-600',
        amber: 'bg-amber-50 text-amber-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        slate: 'bg-slate-100 text-slate-500',
    }[tone];
    return (
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', cls)}>
            <Icon size={15} />
        </span>
    );
}

/** Nothing matched. Says what is filtering, and offers to stop. */
/**
 * A row action with a symbol AND a word.
 *
 * The thing a row mostly needs doing belongs in front of you, not one click inside a
 * kebab: an icon on its own is a guess, and a kebab is a guess plus a click. So it is a
 * symbol AND a word. The menu keeps everything else.
 */
export function RowButton({ Icon, label, tone = 'slate', onClick, disabled, title }: {
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    tone?: 'slate' | 'blue' | 'emerald' | 'red';
    onClick: () => void;
    /** Disabled says why, because a dead control with no reason is a bug to the person reading it. */
    disabled?: boolean;
    title?: string;
}) {
    const tones = {
        slate: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
        blue: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
        emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
        red: 'border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600',
    } as const;
    return (
        <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            disabled={disabled}
            title={title}
            className={cn(
                'inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-md border px-2 text-[12px] font-bold transition-colors',
                disabled ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300' : tones[tone],
            )}
        >
            <Icon size={13} /> {label}
        </button>
    );
}

export function EmptyRow({ colSpan, Icon, title, hint, onClear, action }: {
    colSpan: number;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string;
    hint?: ReactNode;
    onClear?: () => void;
    /**
     * Something to do about it being empty.
     *
     * "Clear filters" answers a list that is empty because of the view; this answers one
     * that is empty because nothing has happened yet, which is a different problem and
     * needs a different button.
     */
    action?: ReactNode;
}) {
    return (
        <tr>
            <td colSpan={colSpan} className="p-12 text-center">
                <Icon size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">{title}</p>
                {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
                {onClear && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                    >
                        Clear filters
                    </button>
                )}
                {action && <div className="mt-3 flex justify-center">{action}</div>}
            </td>
        </tr>
    );
}
