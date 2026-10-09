// ─────────────────────────────────────────────────────────────────────────────
// Back, for the pages that are not pages.
//
// Several screens in this app open a whole view without changing the route: an interval's
// own page, an asset's own page, a full-screen form. They are pages as far as anybody
// using them is concerned — you go in, you come out — but they are React state, so the
// browser's Back button knew nothing about them and took you out of the app instead.
//
// This gives one of those views an entry in the browser's history. Opening pushes one;
// Back pops it and closes the view, leaving you exactly where you were. Closing it from
// inside takes the entry away again, so Back never has to be pressed twice for the same
// screen.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';

/*
 * The views that are open, innermost last.
 *
 * `popstate` is a window event: every open view hears every Back, and nothing in the
 * event says which one it was aimed at. Without this, pressing Back on a service record
 * opened from an interval opened from a unit closed all three — one Back, three screens.
 *
 * Only the innermost view answers. Entries are pushed in the order the views open, which
 * is the order they nest, because each one pushes on the render where it appears.
 */
const openViews: string[] = [];

/**
 * Make an in-page view answer the Back button.
 *
 * @param open  whether the view is showing
 * @param onClose what Back should do — the same thing the view's own back button does
 * @param key   a name for this view, so nested ones can be told apart in the debugger
 */
export function useBackAwareView(open: boolean, onClose: () => void, key = 'view'): void {
    // `onClose` is usually an inline arrow, which would re-run the effect on every render
    // and push a history entry each time.
    const close = useRef(onClose);
    close.current = onClose;

    useEffect(() => {
        if (!open || typeof window === 'undefined') return;

        const token = `${key}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
        openViews.push(token);
        // No URL change: this app's routing is state, not location, and rewriting the
        // address bar would promise a deep link that a reload could not honour.
        window.history.pushState({ backAwareView: token }, '');

        let closedByBack = false;
        /*
         * A pop is only OUR pop when it lands past our own entry.
         *
         * Views nest — an interval's page opens the add-record form over it — and the
         * inner one takes its entry back out when it closes from inside. That traversal
         * fires `popstate` at every listener, so the page underneath used to close as
         * well and drop you two screens back. After the inner view's entry goes, the top
         * of the history is ours again, which is precisely how we know the Back was not
         * aimed at us.
         */
        const onPop = () => {
            // Somebody else's Back: a view further in is the one being left.
            if (openViews[openViews.length - 1] !== token) return;
            const top = (window.history.state as { backAwareView?: string } | null)?.backAwareView;
            // Our own entry is back on top, which means what was popped belonged to a view
            // that closed from inside. Not a Back aimed at us either.
            if (top === token) return;
            closedByBack = true;
            close.current();
        };
        window.addEventListener('popstate', onPop);

        return () => {
            window.removeEventListener('popstate', onPop);
            const at = openViews.lastIndexOf(token);
            if (at !== -1) openViews.splice(at, 1);
            if (closedByBack) return;
            /*
             * Closed from inside — take the entry back out, or Back would step through a
             * view that is no longer on screen.
             *
             * Not here, though: one view very often closes while its replacement opens in
             * the same update (a unit's page → one of its intervals), and React runs every
             * cleanup BEFORE any of the new effects. Stepping back on this line would
             * therefore queue a traversal, let the arriving view push its entry, and then
             * pop THAT one — closing the page the moment it appeared. A microtask runs
             * after the whole batch has settled, by which point the top of the history
             * says which view actually owns it.
             */
            queueMicrotask(() => {
                const top = (window.history.state as { backAwareView?: string } | null)?.backAwareView;
                if (top === token) window.history.back();
            });
        };
    }, [open, key]);
}
