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
