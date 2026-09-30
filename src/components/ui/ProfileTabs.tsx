// ─────────────────────────────────────────────────────────────────────────────
// ProfileTabs — the tab strip a driver's profile and an asset's record share.
//
// They were two copies of the same markup that had drifted: one put a 14px icon
// 6px from its label and the other a 15px icon 8px away, the group separators sat
// at different widths, and only one of them dropped onto the border below. Nobody
// reports that; everybody notices that the two pages feel like two products.
//
// So it is one component. Each page still owns its own tab LIST — its ids, its
// labels, its groups, its counts — and this owns how a tab looks and how the rail
// behaves when there are more of them than fit.
// ─────────────────────────────────────────────────────────────────────────────

import { Fragment, type ElementType } from 'react';
import { TabScroller } from '@/components/ui/TabScroller';
import { cn } from '@/lib/utils';

export type ProfileTab<T extends string = string> = {
    id: T;
    label: string;
    icon?: ElementType;
    /** Shown as a badge when above zero; a zero badge is decoration. */
    count?: number;
    /**
     * Which run of tabs this belongs to. A thin rule is drawn wherever the group
     * changes, so the bar reads as sections rather than one long row.
     */
    group?: string;
};

export function ProfileTabs<T extends string>({ tabs, activeId, onChange, ariaLabel, className }: {
    tabs: ProfileTab<T>[];
    activeId: T;
    onChange: (id: T) => void;
    ariaLabel: string;
    className?: string;
}) {
    return (
        <div className={cn('w-full border-b border-slate-200 bg-white px-4 sm:px-8', className)}>
            <TabScroller ariaLabel={ariaLabel} activeKey={activeId}>
                {tabs.map((tab, i) => {
                    const active = activeId === tab.id;
                    const Icon = tab.icon;
                    const newGroup = i > 0 && tabs[i - 1]!.group !== tab.group;
                    return (
                        <Fragment key={tab.id}>
                            {newGroup && <div aria-hidden className="mx-1.5 h-5 w-px shrink-0 self-center bg-slate-200" />}
                            <button
                                type="button"
                                onClick={() => onChange(tab.id)}
                                // -mb-px so the active underline lands ON the strip's own
                                // border rather than a pixel above it.
                                className={cn(
                                    '-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                                    active
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800',
                                )}
                                aria-current={active ? 'page' : undefined}
                                data-tab-active={active || undefined}
                            >
                                {Icon && <Icon size={14} className={active ? 'text-blue-600' : 'text-slate-400'} />}
                                <span>{tab.label}</span>
                                {typeof tab.count === 'number' && tab.count > 0 && (
                                    <span className={cn(
                                        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                                        active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600',
                                    )}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        </Fragment>
                    );
                })}
            </TabScroller>
        </div>
    );
}
