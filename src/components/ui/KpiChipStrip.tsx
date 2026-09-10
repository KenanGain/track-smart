import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { HEADER_TRANSITION } from '@/components/ui/use-condensing-header';

/**
 * The KPI row, in its small form.
 *
 * A list page's KPI cards are the first thing on it and the first thing to scroll away — so
 * the moment you are actually working the list, the numbers that frame it are gone. Rather
 * than pin a hundred-pixel row of cards to the top forever, the cards hand over to this: as
 * the header condenses, the same figures fade in beside the title as one compact line.
 *
 * Both forms are driven by the same array, so they cannot disagree, and a chip keeps whatever
 * click-to-filter its card had.
 */
export interface KpiChip {
    id: string;
    label: string;
    value: ReactNode;
    /** Text colour for the number, matching the card it stands in for. */
    tone?: string;
    active?: boolean;
    onClick?: () => void;
}

export function KpiChipStrip({ items, condensed, className }: {
    items: KpiChip[];
    /** Shown only while the header is condensed — the full cards cover the rest of the time. */
    condensed: boolean;
    className?: string;
}) {
    return (
        <div
            aria-hidden={!condensed}
            className={cn('overflow-hidden', HEADER_TRANSITION,
                condensed ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0',
                className)}
        >
            {/* no-scrollbar rather than a visible one: this is a summary, and a scrollbar
                across the header reads as a rendering fault (it did, on the tab strip). */}
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-2">
                {items.map(i => {
                    const Tag = i.onClick ? 'button' : 'div';
                    return (
                        <Tag
                            key={i.id}
                            {...(i.onClick ? { type: 'button' as const, onClick: i.onClick } : {})}
                            tabIndex={condensed ? undefined : -1}
                            className={cn(
                                'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 transition-colors',
                                i.onClick && 'hover:border-slate-300 hover:bg-slate-50',
                                i.active ? 'border-blue-200 bg-blue-50/70' : 'border-slate-200 bg-white',
                            )}
                        >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{i.label}</span>
                            <span className={cn('text-[13px] font-bold tabular-nums', i.tone ?? 'text-slate-800')}>{i.value}</span>
                        </Tag>
                    );
                })}
            </div>
        </div>
    );
}
