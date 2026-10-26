import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { KpiChip } from '@/components/ui/KpiChipStrip';
import type { KpiStat } from '@/components/ui/KpiStatCard';

/**
 * Between a list and the page header above it.
 *
 * The KPI cards belong to the list — its filters, its counts — but the header that has to
 * show their figures once they scroll away belongs to the page. So the list publishes its
 * figures (`useHeaderChips`) and says when its cards are out of view (`useBridgeAway`, done
 * by `ListScrollFrame`), and the page reads both (`useListHeaderBridge`): the header
 * condenses and the figures appear in it the moment the cards leave, and go again as the
 * cards come back. A list shown with no bridge above it (the Super Admin dashboard, the
 * Maintenance tab) publishes into nothing.
 */
interface Bridge {
    setChips: (chips: KpiChip[] | null) => void;
    setAway: (away: boolean) => void;
}
const BridgeCtx = createContext<Bridge | null>(null);
export const ListHeaderBridge = BridgeCtx.Provider;

/** The page's half: provide `value`, then hand `chips` and `away` to `ListPageHeader`. */
export function useListHeaderBridge() {
    const [chips, setChips] = useState<KpiChip[] | null>(null);
    const [away, setAway] = useState(false);
    const value = useMemo<Bridge>(() => ({ setChips, setAway }), []);
    return { value, chips, away };
}

/** The frame's half: whether the cards above the list have scrolled out of view. */
export function useBridgeAway(away: boolean) {
    const b = useContext(BridgeCtx);
    useEffect(() => { b?.setAway(away); }, [b, away]);
    useEffect(() => () => b?.setAway(false), [b]);
}

/**
 * The list's half: its KPI figures, re-sent only when a figure or the picked card changes
 * (the clicks travel with them, so a chip filters exactly as its card does).
 */
export function useHeaderChips(chips: KpiChip[]) {
    const b = useContext(BridgeCtx);
    const key = chips.map((c) => `${c.id}:${String(c.value)}:${c.active ? 1 : 0}`).join('|');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the content of `chips`
    useEffect(() => { b?.setChips(chips); }, [b, key]);
    useEffect(() => () => b?.setChips(null), [b]);
}

const ACCENT_TEXT: Record<string, string> = {
    blue: 'text-blue-600', emerald: 'text-emerald-600', amber: 'text-amber-600', rose: 'text-rose-600',
    red: 'text-red-600', slate: 'text-slate-700', indigo: 'text-indigo-600', violet: 'text-violet-600', sky: 'text-sky-600',
};

/** The cards' own array, in chip form — one source, so the two cannot disagree. */
export function chipsFromStats(stats: KpiStat[], activeId?: string, onPick?: (id: string) => void): KpiChip[] {
    return stats.map((s) => ({
        id: s.id,
        label: s.label,
        value: s.value,
        tone: s.accent ? ACCENT_TEXT[s.accent] : undefined,
        active: activeId === s.id,
        onClick: onPick ? () => onPick(s.id) : undefined,
    }));
}
