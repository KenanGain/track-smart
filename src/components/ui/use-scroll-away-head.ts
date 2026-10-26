import { useCallback, useEffect, useRef, useState, type Ref } from 'react';

/**
 * A list page whose KPI cards scroll up and away, then hand the scroll to the table.
 *
 * The page body (`outerRef`) holds the KPI row and the list card, and the card is exactly as
 * tall as the body. Scrolling down first moves the body — the KPI cards travel up out of
 * view — until the card fills the screen. Only then does the table's own box (`innerRef`)
 * take the scroll (`rowsLive`), so its pinned header and the pager stay on screen. Back at
 * the table's top, scrolling up moves the body again and the cards come back down.
 *
 * Two halves to the hand-over:
 *
 *  · The table box refuses vertical scroll (`overflow-y: hidden`) until the body has reached
 *    its end. A box that cannot scroll passes the wheel and the finger on to its parent, so
 *    the first part of the travel always moves the cards, on a wheel or a touch screen.
 *
 *  · Once it can scroll, the WHEEL is steered into it here. Chrome picks a wheel's scroll
 *    target once and keeps it until the pointer moves: with the mouse held still over the
 *    rows, every notch after the cards were gone went to the body — already at its end — and
 *    the table never moved until the mouse was nudged. So while the pointer is over the body
 *    and the table has room in that direction, the wheel scrolls the table directly. Anywhere
 *    over the body counts, not only over the rows: on a short window the table moves up as the
 *    cards leave, and the pointer that was on the rows is now on the pager or the toolbar.
 *
 * A host that does not give the body a height (the Super Admin dashboard, where the whole
 * page scrolls) has nothing to scroll here, so the rows are live from the start.
 */
export function useScrollAwayHead(contentKey?: unknown) {
    const outerRef = useRef<HTMLDivElement | null>(null);
    const innerRef = useRef<HTMLDivElement | null>(null);
    const [rowsLive, setRowsLive] = useState(false);
    /** Whether there is anything above the list to scroll away at all. */
    const [canScroll, setCanScroll] = useState(false);

    const check = useCallback(() => {
        const el = outerRef.current;
        if (!el) return;
        const max = el.scrollHeight - el.clientHeight;
        setRowsLive(max <= 1 || el.scrollTop >= max - 1);
        setCanScroll(max > 1);
    }, []);

    useEffect(() => {
        check();
        const el = outerRef.current;
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null;
        if (el && ro) {
            ro.observe(el);
            Array.from(el.children).forEach((c) => ro.observe(c));
        }
        window.addEventListener('resize', check);
        return () => { ro?.disconnect(); window.removeEventListener('resize', check); };
    }, [check]);

    // The wheel half of the hand-over — see above. Not passive: it has to be able to stop the
    // body from also taking the notch it has just given to the table.
    useEffect(() => {
        const outer = outerRef.current;
        if (!outer) return;
        const onWheel = (e: WheelEvent) => {
            const inner = innerRef.current;
            if (!inner || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
            const max = outer.scrollHeight - outer.clientHeight;
            const bodyAtEnd = max <= 1 || outer.scrollTop >= max - 1;
            const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * inner.clientHeight : e.deltaY;
            if (dy > 0) {
                if (!bodyAtEnd) return;                                                     // cards still showing — the body takes it
                if (inner.scrollTop + inner.clientHeight >= inner.scrollHeight - 1) return; // last row showing — nothing to do
            } else if (inner.scrollTop <= 0) {
                return;                                                                     // top of the table — the body brings the cards back
            }
            e.preventDefault();
            inner.scrollTop += dy;
        };
        outer.addEventListener('wheel', onWheel, { passive: false });
        return () => outer.removeEventListener('wheel', onWheel);
    }, []);

    // The KPI row can change height (filters folding on a phone, a new count) — re-measure.
    useEffect(() => { check(); }, [check, contentKey]);

    return { outerRef, innerRef, rowsLive, canScroll, onOuterScroll: check };
}

/** One element, two refs — the table box is both this hook's and the condensing header's. */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
    return (el: T | null) => {
        for (const r of refs) {
            if (!r) continue;
            if (typeof r === 'function') r(el);
            else (r as { current: T | null }).current = el;
        }
    };
}
