// ─────────────────────────────────────────────────────────────────────────────
// Where "back" actually goes.
//
// Every page in this app writes its own back button, and every one of them
// guesses: "Back to Assets", "Back to Drivers", "Back to Inventory". The guess
// is a page's opinion about how you must have got there, and it is wrong
// whenever you came another way — open a truck from the Inventory list and Back
// says Assets; open the same truck from a compliance alert and Back still says
// Assets, because the page has never been told otherwise.
//
// So the app remembers. A short stack of where you have been, and one resolver
// that turns a path into the words a person would use for it — read off the
// sidebar wherever the sidebar knows, because the nav is already the list of
// what this app calls its own pages, and a second list of names is a second
// list to keep in step.
//
// A stack, not a single `previousPath`: A → B → A → B and a one-slot memory
// sends you round in circles. Going back POPS, so the trail unwinds the way you
// walked it. Anything that is not really a place (a modal route, the same path
// twice) never goes on.
//
// The fallback still matters. Arriving straight at a deep link — a shared URL, a
// reload — leaves nothing to go back to, and a page always knows the one place
// it belongs under. That is what `fallback` is for, and it is the ONLY thing the
// old hard-coded labels were ever right about.
// ─────────────────────────────────────────────────────────────────────────────

import { SIDEBAR_NODES } from "@/data/sidebar.data";

/** Where a back button goes, and what it should say. */
export interface BackTarget {
    path: string;
    /** "Drivers", "Inventory" — the place, without the word "Back". */
    label: string;
}

const MAX = 20;
let trail: string[] = [];

/** Paths that are a step in a flow rather than a place to return to. */
const isPlace = (p: string) => !!p && p !== "/";

/**
 * Remember a navigation.
 *
 * Called once, by the router. The path being LEFT is what goes on the stack —
 * where you are now is not somewhere to go back to.
 */
export function recordNavigation(from: string, to: string): void {
    if (!isPlace(from) || from === to) return;
    // Going back to where you just were unwinds rather than stacking, or a there-and-back
    // leaves two copies of the same page in the trail and Back stops making progress.
    if (trail[trail.length - 1] === to) { trail.pop(); return; }
    trail.push(from);
    if (trail.length > MAX) trail = trail.slice(-MAX);
}

/** The trail, for anything that wants to show or test it. Newest last. */
export const navigationTrail = (): string[] => [...trail];

/** Start again — on sign-out, when the previous session's trail is somebody else's. */
export function clearNavigationHistory(): void {
    trail = [];
}

// ── Naming a path ───────────────────────────────────────────────────────────

/** Every sidebar destination, deepest path first so "/settings/tags" beats "/settings". */
const navLabels = (): { path: string; label: string }[] => {
    const out: { path: string; label: string }[] = [];
    const walk = (nodes: readonly any[]) => {
        for (const n of nodes) {
            if (n.path) out.push({ path: n.path, label: n.label });
            if (n.children) walk(n.children);
        }
    };
    walk(SIDEBAR_NODES as readonly any[]);
    return out.sort((a, b) => b.path.length - a.path.length);
};
let navCache: { path: string; label: string }[] | null = null;

/**
 * Routes the sidebar does not know, because they are not menu items.
 *
 * Deliberately short. Anything that can be named by the nav is named by the nav; this is
 * for the tabs and sub-pages a person still thinks of as a place they were.
 */
const EXTRA: { test: RegExp; label: string }[] = [
    { test: /^\/inventory\/drivers/, label: "Drivers" },
    { test: /^\/inventory\/assets/, label: "Assets" },
    { test: /^\/inventory\/vendors/, label: "Vendors" },
    { test: /^\/inventory/, label: "Inventory" },
    { test: /^\/account\/drivers/, label: "Drivers" },
    { test: /^\/account\/assets/, label: "Assets" },
    { test: /^\/account/, label: "Account" },
    { test: /^\/driver-mobile-app/, label: "the driver app" },
    { test: /^\/messages/, label: "Messages" },
    { test: /^\/profile\/me/, label: "your profile" },
];

/** What a person would call this page. */
export function labelForPath(path: string): string {
    if (!navCache) navCache = navLabels();
    const exact = navCache.find((n) => path === n.path);
    if (exact) return exact.label;
    for (const e of EXTRA) if (e.test.test(path)) return e.label;
    const under = navCache.find((n) => path.startsWith(`${n.path}/`));
    if (under) return under.label;
    // Last resort: the last segment, tidied. Better than "Back" on its own, which tells
    // somebody nothing about what they are about to lose.
    const seg = path.split("/").filter(Boolean).pop() ?? "";
    if (!seg) return "back";
    return seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Where back goes from here.
 *
 * The last place you were, unless there is none — a reload, a shared link, or the first
 * page of the session — in which case the page's own fallback, which is the one thing it
 * genuinely knows: what it belongs under.
 */
export function backTarget(fallback: string, fallbackLabel?: string): BackTarget {
    const last = trail[trail.length - 1];
    if (last) return { path: last, label: labelForPath(last) };
    return { path: fallback, label: fallbackLabel ?? labelForPath(fallback) };
}

/** `backTarget`, as the sentence a button shows. */
export const backLabel = (t: BackTarget): string => `Back to ${t.label}`;
