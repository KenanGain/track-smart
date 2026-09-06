import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A page header that shrinks as its body scrolls, and comes back when you scroll up.
 *
 * It reacts to DIRECTION, not to a bare scroll position. A position threshold alone
 * condenses the moment you nudge the wheel, and then only gives the header back at the very
 * top — so the title is gone for the whole page and you have to scroll all the way home to
 * read it. Instead:
 *
 *  · A FLOOR. Nothing happens in the first `CONDENSE_AT` pixels. Near the top there is no
 *    room to win, and collapsing there is just flicker.
 *  · INTENT. Past the floor, the band follows the direction you are actually travelling,
 *    once you have travelled `INTENT` pixels that way. Scroll down — it condenses. Scroll
 *    back up anywhere on the page — it returns, without going to the top first.
 *  · A FLIP GUARD. Changing the band changes the layout: the header shrinks, the scroll
 *    container grows, and the browser clamps `scrollTop` — which arrives as scroll movement
 *    in the OPPOSITE direction and would flip the band straight back, forever. So direction
 *    is ignored for the length of the transition after each flip.
 *  · ONE READ PER FRAME. Scroll events outrun paint several times over and each one would
 *    re-render the whole page. A frame is all the header can show, and the flip is committed
 *    only when the band changes — so scrolling within a state costs nothing.
 *
 * The body must scroll in its OWN container (`ref`), not the window, so the band never
 * scrolls away — it only shrinks.
 */

/**
 * Every property the header animates, named explicitly. `transition-all` would have the
 * browser diff and interpolate every animatable property on every element in the band each
 * time it flips, which is most of the cost of the transition.
 */
export const HEADER_TRANSITION =
    'transition-[height,max-height,width,max-width,padding,margin,gap,opacity,font-size,border-width] duration-300 ease-out';

/** Nothing happens in the first this-many pixels — collapsing near the top is just flicker. */
const CONDENSE_AT = 140;
/** Travel in one direction that counts as intent, so a jitter or a trackpad twitch cannot flip it. */
const INTENT = 28;
/** How long layout keeps settling after a flip, in ms. Must cover the header's transition. */
const FLIP_SETTLE_MS = 380;

export function useCondensingHeader<T>(resetKey?: T) {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [condensed, setCondensed] = useState(false);
    const condensedRef = useRef(false);

    const lastTop = useRef(0);
    /** Distance travelled in the current direction: positive down, negative up. */
    const travel = useRef(0);
    /** While set, layout is still moving from the last flip and direction means nothing. */
    const flippedAt = useRef(0);

    const scrollRaf = useRef<number | undefined>(undefined);
    const onScroll = useCallback(() => {
        if (scrollRaf.current !== undefined) return;
        scrollRaf.current = requestAnimationFrame(() => {
            scrollRaf.current = undefined;
            const el = scrollRef.current;
            if (!el) return;
            const top = el.scrollTop;
            const delta = top - lastTop.current;
            lastTop.current = top;

            // Above the floor the header is always whole. This is also what makes scrolling
            // back to the top always restore it, whatever the direction bookkeeping says.
            if (top <= CONDENSE_AT) {
                travel.current = 0;
                if (condensedRef.current) { condensedRef.current = false; setCondensed(false); flippedAt.current = performance.now(); }
                return;
            }

            // The clamp that follows a flip arrives as movement the other way. Ignore
            // direction until the header has finished resizing, or it flips straight back.
            if (performance.now() - flippedAt.current < FLIP_SETTLE_MS) { travel.current = 0; return; }

            // Accumulate in the current direction; a reversal starts the count again, so
            // "how far have I gone THIS way" is what decides, not where the page happens to be.
            travel.current = delta > 0
                ? Math.max(0, travel.current) + delta
                : Math.min(0, travel.current) + delta;

            const next = travel.current > INTENT ? true : travel.current < -INTENT ? false : condensedRef.current;
            if (next === condensedRef.current) return;
            condensedRef.current = next;
            setCondensed(next);
            travel.current = 0;
            flippedAt.current = performance.now();
        });
    }, []);

    // `resetKey` changing (switching category, say) leaves the scroll position ALONE — the
    // list is being filtered, not replaced, and yanking the page to the top loses the row the
    // user was reading. The one thing that must still happen is the short-content case: if
    // the new content cannot scroll there is no gesture left to bring the header back, so it
    // would be stuck condensed. Measured after paint, since it depends on the new height.
    useEffect(() => {
        const raf = requestAnimationFrame(() => {
            const el = scrollRef.current;
            if (!el) return;
            lastTop.current = el.scrollTop;
            travel.current = 0;
            if (el.scrollHeight <= el.clientHeight + 1 || el.scrollTop <= CONDENSE_AT) {
                if (condensedRef.current) { condensedRef.current = false; setCondensed(false); }
            }
        });
        return () => cancelAnimationFrame(raf);
    }, [resetKey]);

    // Nothing scheduled may outlive the page.
    useEffect(() => () => {
        if (scrollRaf.current !== undefined) cancelAnimationFrame(scrollRaf.current);
    }, []);

    return { scrollRef, condensed, onScroll };
}
