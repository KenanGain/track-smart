// The non-visual half of the shared list furniture (see `ListChrome.tsx`): the constants and
// the sort rule. Split out so the component file exports nothing but components — anything
// else in there breaks fast refresh for every page that imports it.

export const PAGE_SIZES = [10, 25, 50, 100];

/** Header cell class — every list's column headings read the same. */
export const TH_CLS = 'px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap';

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
