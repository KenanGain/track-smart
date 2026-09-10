import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HEADER_TRANSITION } from '@/components/ui/use-condensing-header';
import { KpiChipStrip, type KpiChip } from '@/components/ui/KpiChipStrip';
import { SubTabs, type SubTab } from '@/components/ui/SubTabs';

/**
 * The horizontal rhythm every list page keeps, header and body alike, so a table's first
 * column lines up under the page title at every width. Three steps, not one: 16px is right on
 * a phone and looks like a mistake on a 27" monitor.
 */
export const PAGE_PAD = 'px-4 sm:px-6 lg:px-8';

/**
 * The header every fleet LIST page wears — Default Compliances, Violations, Accidents,
 * Tickets, Safety Events, Hours of Service.
 *
 * They had six. One led with a breadcrumb, one with a gradient icon, one with neither; titles
 * ran text-xl, text-2xl and text-lg; three condensed on scroll and three scrolled away
 * entirely, taking their category tabs — the page's own navigation — off the screen with them.
 * Every one of those was defensible alone and none of them survived being seen next to the
 * others, so this is now the only way to draw one.
 *
 * The shape, top to bottom:
 *
 *   [icon] Title  (count)                                 [Export] [Add record]
 *          One line saying what these records are
 *          [ 497 total ] [ 12 open ] [ 3 overdue ]        ← only while condensed
 *   ─ Tabs ──────────────────────────────────────────────  [view switch]
 *
 * On scroll the description folds, the title steps down, the icon and buttons lose a little
 * height, and the KPI figures appear on a line of their own as the cards they belong to scroll
 * out of reach. What never changes is the tab row: navigation that disappears when you scroll
 * is not navigation, and it is the reason the whole band stays put instead of scrolling away.
 */
export function ListPageHeader({
    Icon, title, description, count, countTitle, chips, actions, condensed,
    tabs, activeTab, onTabChange, tabsRight, tabsLabel, showZeroCounts, pad = PAGE_PAD,
}: {
    Icon: LucideIcon;
    title: string;
    /** One line under the title. Folds away as the header condenses. */
    description?: ReactNode;
    /** How many records the page holds, said once, beside the title at every height. */
    count?: number;
    countTitle?: string;
    /** The KPI cards' figures, shown only while condensed (see `KpiChipStrip`). */
    chips?: KpiChip[];
    /** Buttons — Export, Add, a carrier pill. They stay put and keep working at every height. */
    actions?: ReactNode;
    condensed: boolean;
    /** Category / entity tabs. Omit for a page with a single list. */
    tabs?: SubTab[];
    activeTab?: string;
    onTabChange?: (id: string) => void;
    /** A control belonging to the tab row rather than the title row (e.g. Records | roster). */
    tabsRight?: ReactNode;
    tabsLabel?: string;
    /** Show a `0` badge rather than hiding it — in a filter strip, an empty bucket is an answer. */
    showZeroCounts?: boolean;
    /** Horizontal padding, matched to the body beneath it. */
    pad?: string;
}) {
    return (
        <header className={cn('z-30 shrink-0 border-b border-slate-200 bg-white', HEADER_TRANSITION,
            condensed ? 'shadow-md' : 'shadow-sm')}>
            {/* Row 1 — who you are and what you can do. `items-center` with wrapping: on a
                phone the actions drop to their own line under the title rather than squeezing
                it to three characters and an ellipsis. */}
            <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-2', pad, HEADER_TRANSITION,
                condensed ? 'py-2' : 'py-3 sm:py-4')}>
                <div className={cn('flex shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600',
                    HEADER_TRANSITION, condensed ? 'h-8 w-8' : 'h-9 w-9 sm:h-10 sm:w-10')}>
                    <Icon size={condensed ? 16 : 20} />
                </div>
                <div className="min-w-0 flex-1">
                    {/* The count belongs to the title, in one place, at every height — pages
                        used to say it in the subtitle, in a pill by the buttons and again as a
                        TOTAL chip, and the three could disagree. */}
                    <div className="flex min-w-0 items-center gap-2">
                        <h1 className={cn('truncate font-bold tracking-tight text-slate-900', HEADER_TRANSITION,
                            condensed ? 'text-sm sm:text-base' : 'text-lg sm:text-xl lg:text-2xl')}>{title}</h1>
                        {count !== undefined && (
                            <span title={countTitle ?? `${count.toLocaleString()} records`}
                                className={cn('shrink-0 rounded-full bg-slate-100 font-bold tabular-nums text-slate-600',
                                    HEADER_TRANSITION, condensed ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]')}>
                                {count.toLocaleString()}
                            </span>
                        )}
                    </div>
                    {/* Hidden below `sm`: on a phone this line is the whole width and gets
                        truncated to nothing useful, and the title already says what the page is. */}
                    {description && (
                        <p className={cn('hidden overflow-hidden truncate text-[13px] text-slate-500 sm:block',
                            HEADER_TRANSITION, condensed ? 'mt-0 max-h-0 opacity-0' : 'mt-0.5 max-h-6 opacity-100')}>
                            {description}
                        </p>
                    )}
                </div>

                {actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
            </div>

            {/* Row 2 — the figures, on a line of their own, appearing as the cards they stand
                in for scroll out of reach.

                They used to ride the title row, taking whatever width was left between the
                title and the buttons. On this page that width is nothing: a scope switch and
                two buttons fill the row, the strip collapsed to zero and the numbers were
                simply never seen. A line of its own is a line they always fit on — and it
                scrolls sideways rather than wrapping, so six figures work on a phone. */}
            {chips && chips.length > 0 && (
                <div className={pad}><KpiChipStrip items={chips} condensed={condensed} /></div>
            )}

            {/* Row 3 — where you can go. Never condenses away: navigation that disappears when
                you scroll is not navigation. */}
            {tabs && tabs.length > 0 && activeTab !== undefined && onTabChange && (
                <div className={cn('flex items-end gap-3', pad)}>
                    <SubTabs
                        className="min-w-0 flex-1"
                        bordered={false}
                        size={condensed ? 'sm' : 'md'}
                        showZeroCounts={showZeroCounts}
                        ariaLabel={tabsLabel}
                        tabs={tabs}
                        activeId={activeTab}
                        onChange={onTabChange}
                    />
                    {tabsRight && (
                        <div className={cn('hidden shrink-0 sm:block', HEADER_TRANSITION, condensed ? 'pb-1.5' : 'pb-2')}>{tabsRight}</div>
                    )}
                </div>
            )}
        </header>
    );
}

/**
 * The scrolling body under a `ListPageHeader`.
 *
 * When `standalone` is false the view has been embedded in someone else's page — a driver's
 * profile, an asset's — and renders its children bare: that host owns the scrolling, and a
 * second scroll container here would trap the list in a box inside their page.
 */
export function ListPageBody({ scrollRef, onScroll, standalone = true, children }: {
    scrollRef?: React.Ref<HTMLDivElement>;
    onScroll?: React.UIEventHandler<HTMLDivElement>;
    standalone?: boolean;
    children: ReactNode;
}) {
    if (!standalone) return <>{children}</>;
    return (
        <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    );
}
