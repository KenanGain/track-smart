// ─────────────────────────────────────────────────────────────────────────────
// TabScroller — a horizontal rail for a tab strip that is wider than its column.
//
// The browser scrollbar under a tab strip reads as a bug, but hiding it alone
// leaves no clue the strip scrolls. So this wraps the strip and adds:
//   • chevron buttons at each edge, shown ONLY while there is more to reveal
//     that way, that page the rail on click
//   • a soft fade under each chevron so cut-off tabs look cut off, not missing
//   • auto-scroll of the active tab into view when it changes off-screen
//   • re-measurement on scroll, on resize, and when the tab set itself changes
//
// It only owns the rail — the caller renders the buttons, so each page keeps its
// own tab markup (groups, separators, counts, icons).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** One edge affordance: a fade over the cut-off tabs plus the paging chevron. */
function RailArrow({ side, show, onPage }: { side: 'left' | 'right'; show: boolean; onPage: () => void }) {
    const Icon = side === 'left' ? ChevronLeft : ChevronRight;
    return (
        <div
            aria-hidden={!show}
            className={cn(
                // The wrapper only paints the fade — clicks pass through it to the
                // tabs underneath; the button itself re-enables pointer events.
                'pointer-events-none absolute inset-y-0 z-20 flex items-center transition-opacity duration-200',
                side === 'left'
                    ? 'left-0 pl-1 pr-6 bg-gradient-to-r from-white via-white to-transparent'
                    : 'right-0 pl-6 pr-1 bg-gradient-to-l from-white via-white to-transparent',
                show ? 'opacity-100' : 'opacity-0',
            )}
        >
            <button
                type="button"
                tabIndex={show ? 0 : -1}
                onClick={onPage}
                title={side === 'left' ? 'Scroll tabs left' : 'Scroll tabs right'}
                aria-label={side === 'left' ? 'Scroll tabs left' : 'Scroll tabs right'}
                className={cn(
                    'inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors',
                    'hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-95',
                    show ? 'pointer-events-auto' : 'pointer-events-none',
                )}
            >
                <Icon size={15} />
            </button>
        </div>
    );
}

export function TabScroller({ children, ariaLabel, activeKey, className, navClassName }: {
    children: ReactNode;
    ariaLabel?: string;
    /** Changing this scrolls the matching `[data-tab-active="true"]` child into view. */
    activeKey?: string;
    className?: string;
    navClassName?: string;
}) {
    const railRef = useRef<HTMLElement | null>(null);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(false);

    const measure = useCallback(() => {
        const el = railRef.current;
        if (!el) return;
        // 1px of slack — fractional layout widths otherwise leave an arrow lit
        // at the very end of the rail with nothing left to scroll to.
        const left = el.scrollLeft > 1;
        const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
        setCanLeft(prev => (prev === left ? prev : left));
        setCanRight(prev => (prev === right ? prev : right));
    }, []);

    // Measure once the rail is laid out, whenever it resizes, and whenever its
    // contents change (a count badge appearing can make the strip overflow).
    useEffect(() => {
        const el = railRef.current;
        if (!el) return;
        const raf = requestAnimationFrame(measure);
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        for (const child of Array.from(el.children)) ro.observe(child);
        const mo = new MutationObserver(measure);
        mo.observe(el, { childList: true, subtree: true, characterData: true });
        window.addEventListener('resize', measure);
        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            mo.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [measure]);

    // Keep the selected tab visible — picking one that is half cut off, or landing
    // on a page whose active tab is off to the right, should not hide it.
    useEffect(() => {
        const el = railRef.current;
        if (!el) return;
        const active = el.querySelector<HTMLElement>('[data-tab-active="true"]');
        if (!active) return;
        const { offsetLeft, offsetWidth } = active;
        const viewStart = el.scrollLeft;
        const viewEnd = viewStart + el.clientWidth;
        if (offsetLeft < viewStart + 24) {
            el.scrollTo({ left: Math.max(0, offsetLeft - 24), behavior: 'smooth' });
        } else if (offsetLeft + offsetWidth > viewEnd - 24) {
            el.scrollTo({ left: offsetLeft + offsetWidth - el.clientWidth + 24, behavior: 'smooth' });
        }
    }, [activeKey]);

    const page = useCallback((dir: -1 | 1) => {
        const el = railRef.current;
        if (!el) return;
        el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.75), behavior: 'smooth' });
    }, []);

    const pageLeft = useCallback(() => page(-1), [page]);
    const pageRight = useCallback(() => page(1), [page]);

    return (
        <div className={cn('relative', className)}>
            <RailArrow side="left" show={canLeft} onPage={pageLeft} />
            <nav
                ref={railRef as React.RefObject<HTMLElement>}
                onScroll={measure}
                aria-label={ariaLabel}
                className={cn('no-scrollbar flex items-center gap-0.5 overflow-x-auto scroll-smooth -mb-px', navClassName)}
            >
                {children}
            </nav>
            <RailArrow side="right" show={canRight} onPage={pageRight} />
        </div>
    );
}
