import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

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
 *
 * That container MUST carry `overflow-anchor: none`. The header sits inside it, so folding
 * changes the size of content above the viewport, and the browser's scroll anchoring
 * answers by adjusting `scrollTop` to hold the view still. The adjustment arrives here as
 * movement UP, indistinguishable from the user scrolling back — so the header began to
 * close, was told it was being scrolled away from, and sprang open a frame later. It took
 * a second gesture to make it stick, which is what "the scrolling is not working properly"
 * looks like from the outside. No amount of direction smoothing fixes it; the phantom
 * movement has to stop being generated.
 */

/**
 * Every property the header animates, named explicitly. `transition-all` would have the
 * browser diff and interpolate every animatable property on every element in the band each
 * time it flips, which is most of the cost of the transition.
 */
export const HEADER_TRANSITION =
    'transition-[height,max-height,width,max-width,padding,margin,gap,opacity,font-size,border-width]'
    /*
     * Seven tenths of a second, on a curve that is the same travelling either way.
     *
     * It began at a third of a second on a plain ease-out, which read as a snap — the header
     * did not appear to MOVE so much as to be replaced, which is what makes a condensing
     * header feel like a glitch rather than a response. Half a second on a quintic ease-out
     * fixed the closing but not the opening: an ease-OUT leaves immediately and arrives
     * slowly, so folding away was gentle and coming back was a jump, and the two gestures
     * did not feel like the same thing done in opposite directions.
     *
     * So the curve is symmetric. It takes up the slack before it moves, carries the weight
     * through the middle and sets down softly, which is what makes it read as the page being
     * drawn down and drawn back up rather than switched between two states. Slow enough to
     * follow with the eye, and well short of feeling like something to wait for.
     */
    + ' duration-700 ease-[cubic-bezier(0.65,0,0.35,1)]';

/**
 * Whether the page header above is currently condensed.
 *
 * The KPI cards are not part of the header — they belong to whichever view is on screen — but
 * they give their height back at the same moment it does, so the whole top of the page clears
 * in one motion instead of the header shrinking above a block that stays. Reading it from
 * context is what lets the same view render under a condensing header (the Default Compliances
 * page) or on its own (embedded in a driver's profile, where nothing condenses) without either
 * side knowing about the other — the default is simply "not condensed".
 */
export const CondensedHeaderContext = createContext(false);
export const useCondensedHeader = (): boolean => useContext(CondensedHeaderContext);

/** Nothing happens in the first this-many pixels — collapsing near the top is just flicker. */
const CONDENSE_AT = 140;
/**
 * Travel in one direction that counts as intent.
 *
 * Raised with the slower curve: at 28px a trackpad's inertia could still reverse the band
 * mid-animation, so the header started folding and changed its mind halfway. Forty is
 * about one notch of a wheel — deliberate, and well clear of a twitch.
 */
const INTENT = 40;
/**
 * How long layout keeps settling after a flip, in ms.
 *
 * It MUST outlast the header's transition above, with room to spare. Everything the flip
 * sets in motion — the clamp when the page shortens, the reflow as the cards give their
 * height back — arrives as scroll movement, and until the travelling has stopped none of
 * it means anything about where the reader wants to be. Shorter than the transition and
 * the header changes its mind halfway through its own animation. Raised with the curve:
 * 700ms of travel, and 140ms on the end for the last of the layout to come to rest.
 */
const FLIP_SETTLE_MS = 840;

/**
 * The same shrink-on-scroll band, for a header that does NOT own the thing that scrolls.
 *
 * A record's detail view is rendered standalone on its own page, and embedded inside a
 * driver's profile and an asset's — different ancestors do the scrolling in each, and the
 * view cannot know which. Two earlier attempts got this wrong in opposite directions: an
 * IntersectionObserver's `rootMargin` is measured from the VIEWPORT, so a view sitting below
 * an app bar begins life past the line and the header arrives condensed on a page nobody has
 * scrolled; and walking up the ancestors for `overflow-y: auto` finds the first element
 * *styled* to scroll, which is not always the one that actually does — so no events arrive
 * and the header never folds at all.
 *
 * So it asks neither. The distance is read between two elements the view owns: the pinned
 * BAR, which by construction sits at the top edge of whatever is scrolling (it is `sticky
 * top-0` inside it), and an ANCHOR one pixel above it. At rest they are together and the
 * distance is ~0; once the bar pins, the anchor keeps travelling and the gap IS the scroll.
 * Nothing about the container is assumed, so it works in all three placements.
 *
 * Scroll events do not bubble, but they do propagate down the capture phase — so one
 * document-level capturing listener hears whichever ancestor is really scrolling.
 *
 * The floor, intent and flip-guard are the ones documented above, and the anchor sits ABOVE
 * everything that collapses: folding the header cannot move the thing that decides whether to
 * fold it, so there is no oscillator.
 *
 * Attach `ref` to an empty element as the first child of the view, and `barRef` to the
 * sticky bar directly after it.
 */
export function useCondensingAnchor() {
    const ref = useRef<HTMLDivElement | null>(null);
    const barRef = useRef<HTMLDivElement | null>(null);
    const [condensed, setCondensed] = useState(false);
    const [stuck, setStuck] = useState(false);
    const condensedRef = useRef(false);
    const travel = useRef(0);
    const lastPast = useRef(0);
    const flippedAt = useRef(0);
    const raf = useRef<number | undefined>(undefined);

    useEffect(() => {
        /**
         * How far the top of the view has travelled above the top of the visible area. The
         * pinned bar marks that edge, so this is ~0 until the bar pins and then grows with
         * the scroll — whichever element the scroll is happening in.
         *
         * Both nodes are read per measurement rather than captured once. The header is
         * unmounted whenever a record's own detail page takes over the view and mounted again
         * when it closes; a captured node would leave this measuring a detached element, whose
         * rectangle is all zeros, and the band would never move again.
         */
        const scrolledPast = () => {
            const el = ref.current;
            if (!el) return 0;
            const anchor = el.getBoundingClientRect().top;
            const bar = barRef.current?.getBoundingClientRect().top ?? anchor;
            return bar - anchor;
        };

        const onScroll = () => {
            if (raf.current !== undefined) return;
            raf.current = requestAnimationFrame(() => {
                raf.current = undefined;
                const past = scrolledPast();
                setStuck(past > 2);
                const delta = past - lastPast.current;
                lastPast.current = past;

                // Above the floor the header is always whole — which is also what guarantees
                // the view opens expanded, whatever the bookkeeping says.
                if (past <= CONDENSE_AT) {
                    travel.current = 0;
                    if (condensedRef.current) { condensedRef.current = false; setCondensed(false); flippedAt.current = performance.now(); }
                    return;
                }
                if (performance.now() - flippedAt.current < FLIP_SETTLE_MS) { travel.current = 0; return; }
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
        };

        // Read after paint: the view has no position until it has been laid out, and this
        // first read is what settles the band OPEN when the page has not been scrolled.
        const first = requestAnimationFrame(onScroll);
        // Capturing, on the document: a scroll event does not bubble, so listening on one
        // chosen element means guessing which element scrolls. This hears all of them.
        document.addEventListener('scroll', onScroll, { capture: true, passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            cancelAnimationFrame(first);
            if (raf.current !== undefined) cancelAnimationFrame(raf.current);
            document.removeEventListener('scroll', onScroll, { capture: true });
            window.removeEventListener('resize', onScroll);
        };
    }, []);

    return { ref, barRef, condensed, stuck };
}

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

            /*
             * The flip guard comes FIRST, and it covers the floor rule as well as direction.
             *
             * Folding hands ~380px back to the page, so the page gets SHORTER — and on
             * anything but a long tab what is left no longer reaches the floor. The browser
             * clamps `scrollTop` down to the new maximum, that arrives here as a position
             * near the top, and the floor rule below reads it as "the user has scrolled home"
             * and opens the header again. The fold undoes itself, every time, on exactly the
             * tabs where it would have helped most.
             *
             * It was answered once by padding the page out so it stayed tall enough to keep
             * its own fold — which left that padding under the content as empty page you
             * could scroll into, dragging a list's pinned toolbar up under the header until
             * the rows it belongs to were gone. The page should not have to be made taller to
             * hold a state it is already in. It only has to stop being asked about it while
             * the layout is still moving.
             */
            if (performance.now() - flippedAt.current < FLIP_SETTLE_MS) { travel.current = 0; return; }

            // Above the floor the header is always whole. This is also what makes scrolling
            // back to the top always restore it, whatever the direction bookkeeping says.
            if (top <= CONDENSE_AT) {
                travel.current = 0;
                if (condensedRef.current) { condensedRef.current = false; setCondensed(false); flippedAt.current = performance.now(); }
                return;
            }

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

    /**
     * The way back, for a tab that folded itself flat.
     *
     * Folding gives the page ~380px, and on a short tab that is enough to make everything
     * fit — which leaves it with nothing to scroll. The header is then correct and stuck:
     * `scrollTop` is pinned at 0, scrolling up moves nothing, no scroll event is raised, and
     * the only way to see the title again is to leave the tab and come back.
     *
     * The gesture still happens even when the page cannot answer it, so it is read directly,
     * and only in that corner — wherever there is real scrolling left, the scroll handler
     * above is the one that decides, on travel, exactly as before.
     *
     * Bound natively and PASSIVE rather than as a React prop. A wheel handler the browser
     * has to consult before it scrolls costs the compositor its fast path — and on this
     * container it cost the wheel entirely: with the prop attached, the page stopped
     * responding to the wheel at all while `scrollTop` could still be set from script.
     * Passive says up front that this listener will never cancel the scroll, so the scroll
     * happens as it always did and this only gets told about it.
     */
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (!condensedRef.current || e.deltaY >= 0) return;
            if (el.scrollHeight - el.clientHeight > CONDENSE_AT) return;
            if (performance.now() - flippedAt.current < FLIP_SETTLE_MS) return;
            condensedRef.current = false;
            setCondensed(false);
            flippedAt.current = performance.now();
        };
        el.addEventListener('wheel', onWheel, { passive: true });
        return () => el.removeEventListener('wheel', onWheel);
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
