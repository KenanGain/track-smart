import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// StepScroller — a horizontal stepper strip paged by a left and right arrow.
//
// Steps scroll sideways under a hidden scrollbar; the arrows only appear when the steps
// do not fit, and each one greys out once there is nothing more to see that way. The
// step at `focus` is brought to the middle — the one picked on a file, the one the
// driver is on in a list — so it is never left half-hidden past the edge.
//
// Children mark each step with `data-step` so the focus can find it.
// ─────────────────────────────────────────────────────────────────────────────

export function StepScroller({ focus, size = 'md', className, children }: {
    /** Index of the step to keep in view. */
    focus?: number;
    /** Arrow size, matched to the step bubbles: md = 36px bubbles, sm = 28px. */
    size?: 'sm' | 'md';
    className?: string;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [edge, setEdge] = useState({ left: false, right: false });

    const measure = () => {
        const el = ref.current;
        if (!el) return;
        setEdge({ left: el.scrollLeft > 2, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
    };

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const el = ref.current;
        const step = focus == null ? undefined : el?.querySelectorAll<HTMLElement>('[data-step]')[focus];
        if (!el || !step) return;
        el.scrollTo({ left: step.offsetLeft - (el.clientWidth - step.offsetWidth) / 2, behavior: 'smooth' });
    }, [focus]);

    const page = (dir: -1 | 1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.7, behavior: 'smooth' });
    const overflow = edge.left || edge.right;

    const arrow = (dir: -1 | 1) => {
        const on = dir < 0 ? edge.left : edge.right;
        const Icon = dir < 0 ? ChevronLeft : ChevronRight;
        return (
            <button type="button" onClick={(e) => { e.stopPropagation(); page(dir); }} disabled={!on}
                aria-label={dir < 0 ? 'Previous steps' : 'Next steps'}
                className={cn('flex shrink-0 items-center justify-center rounded-full border transition',
                    size === 'md' ? 'mt-[2px] h-8 w-8' : 'h-7 w-7',
                    on ? 'border-slate-200 bg-white text-slate-600 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'
                        : 'cursor-default border-slate-100 bg-slate-50 text-slate-300')}>
                <Icon className="h-4 w-4" />
            </button>
        );
    };

    return (
        <div className={cn('flex min-w-0 items-start gap-2', className)}>
            {overflow && arrow(-1)}
            <div ref={ref} onScroll={measure} className="no-scrollbar relative min-w-0 flex-1 overflow-x-auto">
                <div className="flex min-w-max items-start">{children}</div>
            </div>
            {overflow && arrow(1)}
        </div>
    );
}
