import type { ReactNode, Ref, UIEventHandler } from 'react';
import { cn } from '@/lib/utils';
import { PAGE_PAD } from '@/components/ui/ListPageHeader';
import { useCondensingHeader } from '@/components/ui/use-condensing-header';
import { useListHeaderBridge } from '@/components/ui/list-header-bridge';

/**
 * The state every page under a `ListPageHeader` needs, in one call: the body's scroll box and
 * handler, and whether the header is condensed — by the rows being read, or by a list below
 * saying its KPI cards have scrolled away (`bridge`, provided with `<ListHeaderBridge>`).
 */
export function usePageChrome(resetKey?: unknown) {
    const { scrollRef, condensed: rowsCondensed, onScroll } = useCondensingHeader(resetKey);
    const bridge = useListHeaderBridge();
    return { scrollRef, onScroll, condensed: rowsCondensed || bridge.away, bridge };
}

/**
 * The body of a page that is not one list — cards, a form, settings sections. It scrolls in
 * its own box so the header above stays put and condenses as it does.
 */
export function ScrollBody({ scrollRef, onScroll, children, className, pad = PAGE_PAD }: {
    scrollRef?: Ref<HTMLDivElement>;
    onScroll?: UIEventHandler<HTMLDivElement>;
    children: ReactNode;
    className?: string;
    pad?: string;
}) {
    return (
        <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto [overflow-anchor:none]">
            <div className={cn('space-y-5 py-4 sm:py-5', pad, className)}>{children}</div>
        </div>
    );
}
