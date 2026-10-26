// The non-visual half of the shared list furniture (see `ListChrome.tsx`): the constants and
// the sort rule. Split out so the component file exports nothing but components — anything
// else in there breaks fast refresh for every page that imports it.

export const PAGE_SIZES = [10, 25, 50, 100];

/** Header cell class — every list's column headings read the same. */
export const TH_CLS = 'px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap';
/** A header row whose cells carry their own padding — the same type as TH_CLS, set once on the row. */
export const TH_ROW_CLS = 'border-b border-slate-200 bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500';

/** Which column is sorted, and which way. `null` = the list's own natural order. */
export interface SortState<C extends string> { col: C; dir: 'asc' | 'desc' }

/**
 * Click-to-sort for one heading: ascending, descending, then back to the list's own order —
 * three states, because there is no way back to "as filed" from a two-state toggle.
 */
export function nextSort<C extends string>(prev: SortState<C> | null, col: C): SortState<C> | null {
    if (!prev || prev.col !== col) return { col, dir: 'asc' };
    return prev.dir === 'asc' ? { col, dir: 'desc' } : null;
}

/**
 * What a grouped list's band looks like, by what the band SAYS. Keyed on the label so a page
 * adds a band without teaching this file about it — anything unlisted is the neutral slate,
 * which is the right answer for "Trucks" or "Comdata Inc." and the wrong one for "Expired".
 */
export const GROUP_BAND_TONE: Record<string, string> = {
    // Something is wrong, today.
    Expired: 'text-rose-700 bg-rose-50/70',
    'Not started': 'text-rose-700 bg-rose-50/70',
    '6 or more missing': 'text-rose-700 bg-rose-50/70',
    // Something is missing, or close.
    'Missing document': 'text-amber-700 bg-amber-50/70',
    'Missing date': 'text-amber-700 bg-amber-50/70',
    'Expiring Soon': 'text-amber-700 bg-amber-50/70',
    'Under half done': 'text-amber-700 bg-amber-50/70',
    '3\u20135 missing': 'text-amber-700 bg-amber-50/70',
    '1\u20132 missing': 'text-amber-700 bg-amber-50/70',
    // Nothing to do.
    Completed: 'text-emerald-700 bg-emerald-50/70',
    'Fully complete': 'text-emerald-700 bg-emerald-50/70',
    'Nothing missing': 'text-emerald-700 bg-emerald-50/70',
    Active: 'text-emerald-700 bg-emerald-50/70',
    // Being watched.
    Monitored: 'text-blue-700 bg-blue-50/70',
};
export const bandTone = (label: string) => GROUP_BAND_TONE[label] ?? 'text-slate-600 bg-slate-50';

/**
 * A header cell pinned to the top of its table's scroll box. The rule under it is an inset
 * shadow: a sticky cell's own border scrolls away with the rows.
 */
export const PIN_TH = 'sticky top-0 z-10 bg-slate-50 shadow-[inset_0_-1px_0_#e2e8f0]';
/** The Actions heading: pinned to the top AND the right edge, with a rule on its left. */
export const PIN_TH_ACTIONS = `${PIN_TH} right-0 z-20 w-[84px] pr-4 text-right shadow-[inset_0_-1px_0_#e2e8f0,inset_1px_0_0_#e2e8f0]`;
/** The Actions cell on each row: pinned right, painted to match the row's hover. Needs `group` on the row. */
export const PIN_TD_ACTIONS = 'sticky right-0 bg-white pr-4 text-right shadow-[inset_1px_0_0_#f1f5f9] group-hover:bg-slate-50';
/** The class that hides a list's filter controls on a phone until `FiltersToggle` opens them. */
export const mobileFold = (open: boolean) => (open ? 'contents' : 'max-md:hidden contents');
