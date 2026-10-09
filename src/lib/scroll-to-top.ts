// ─────────────────────────────────────────────────────────────────────────────
// scrollAncestorsToTop — a view that replaces another opens at the top of itself.
//
// Drilling from a list into one of its records REPLACES the page: the scroll position that
// belonged to the list means nothing on the record. Keeping it drops you part-way down
// something you have not seen the top of — and on a page whose header folds, the header
// springs open as you arrive and pushes the record you just opened off the bottom of the
// screen. Measured on an asset's IFTA Decal: opened from a list scrolled to 458, you landed
// at 82 with a 575px header above you and the record's first card at y=589, below the fold.
// From the outside that is indistinguishable from the page refusing to scroll.
//
// The panel that drills cannot do this itself, because it does not own the thing that
// scrolls — it is rendered standalone on its own page, embedded in an asset's record and
// embedded in a driver's, and a different ancestor scrolls in each. So rather than guess
// which one, every ancestor that CAN scroll is sent to the top. The ones that are already
// there cost nothing.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send every scrollable ancestor of `el` back to the top, `el` included.
 *
 * Called from a layout effect, so it lands before the browser paints the new view rather
 * than as a jump a frame after it appears.
 */
export function scrollAncestorsToTop(el: Element | null | undefined): void {
    for (let node: Element | null = el ?? null; node; node = node.parentElement) {
        // `scrollTop` is only writable on something that actually scrolls; on anything
        // else the assignment is silently ignored, which is why this can be unconditional
        // for the element itself but not for the whole chain — a `position: fixed` dialog
        // between here and the page would otherwise be scrolled too.
        if (node.scrollHeight > node.clientHeight + 1 && node.scrollTop > 0) {
            const how = getComputedStyle(node).overflowY;
            if (how === 'auto' || how === 'scroll' || node === document.scrollingElement) {
                node.scrollTop = 0;
            }
        }
    }
    // The window, for the placements where the page itself is what scrolls.
    if (window.scrollY > 0) window.scrollTo({ top: 0 });
}
