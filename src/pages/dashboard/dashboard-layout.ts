import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { UserRole } from '@/data/users.data';
import type { Shortcut } from './dashboard-types';

// ─────────────────────────────────────────────────────────────────────────────
// What a person's dashboard holds, and in what order, shape and setting.
//
// A card is so many columns wide (1–4 of the grid's 4) and so many rows tall (1–3): dragged
// out at any edge or corner, or set from the ⋮ presets. Which of a widget's four layouts it
// draws follows from that shape (`variantOf`), so a 1×2 card gets the medium layout stacked
// and a 3×2 the wide one. A shortcut card carries what it points at. A layout is per person
// and per kind of view (the carrier view and the service-profile view are different jobs) —
// not per carrier, so an Admin who looks after six carriers arranges the carrier view once.
// Until somebody rearranges it, the layout is the preset for their role, filtered by what
// their menu lets them see.
// ─────────────────────────────────────────────────────────────────────────────

export type WidgetSize = 'sm' | 'md' | 'lg' | 'xl';
export type ScopeKind = 'carrier' | 'profile';
export interface LayoutItem { id: string; w: number; h: number; opts?: Record<string, string>; shortcut?: Shortcut }
export interface DashLayout { items: LayoutItem[]; /** The preset it was made from, until the person changes it. */ preset?: string }

export const MAX_W = 4;
export const MAX_H = 3;
export const SIZE_META: Record<WidgetSize, { label: string; short: string; hint: string; w: number; h: number }> = {
    sm: { label: 'Small', short: 'S', hint: 'One figure', w: 1, h: 1 },
    md: { label: 'Medium', short: 'M', hint: 'A figure and a chart', w: 2, h: 1 },
    lg: { label: 'Large', short: 'L', hint: 'Figures, a chart and a list', w: 2, h: 2 },
    xl: { label: 'Wide', short: 'XL', hint: 'The full width', w: 4, h: 2 },
};
export const SIZE_ORDER: WidgetSize[] = ['sm', 'md', 'lg', 'xl'];

/** Which of the four layouts a card of this shape draws. */
export function variantOf(w: number, h: number): WidgetSize {
    if (h <= 1) return w <= 1 ? 'sm' : 'md';
    if (w <= 1) return 'md';
    return w === 2 ? 'lg' : 'xl';
}
export const shapeLabel = (w: number, h: number) => `${w} × ${h}`;
export const isShortcutId = (id: string) => id.startsWith('sc:');

/** The carrier view: everything, for the people who run the carrier. */
const CARRIER_FULL = [
    'attention', 'alerts', 'calendar', 'account', 'driver-compliance', 'asset-compliance', 'maintenance', 'safety',
    'roadside', 'violations', 'accidents', 'safety-events', 'hos', 'hiring', 'onboarding', 'inventory', 'fuel',
    'users', 'messages', 'audit',
];

/** Which widgets a role starts with, in order. Anything else its menu allows is in "Customize". */
export const CARRIER_PRESET: Record<UserRole, string[]> = {
    'super-admin': CARRIER_FULL,
    admin: CARRIER_FULL,
    'fleet-admin': CARRIER_FULL,
    // A Safety Manager's day is compliance and the safety record; the fleet's money is not theirs.
    'safety-manager': ['attention', 'alerts', 'calendar', 'driver-compliance', 'asset-compliance', 'safety', 'roadside', 'violations', 'accidents', 'safety-events', 'hos', 'hiring', 'onboarding', 'maintenance', 'messages'],
    user: ['attention', 'alerts', 'calendar', 'messages', 'driver-compliance', 'asset-compliance', 'inventory', 'maintenance', 'roadside', 'violations', 'accidents', 'fuel', 'hiring'],
    driver: [],
};

/** The service-profile view: the carriers side by side first, then the sums. */
export const PROFILE_PRESET: string[] = [
    'sp-health', 'sp-carriers', 'attention', 'alerts', 'calendar', 'driver-compliance', 'asset-compliance', 'sp-fleet',
    'hiring', 'violations', 'accidents', 'roadside', 'maintenance', 'users', 'sp-billing', 'messages', 'audit',
];

/** A ready-made dashboard: pick it and use it. */
export interface DashPreset { id: string; name: string; blurb: string; scope: ScopeKind; items: LayoutItem[] }
const P = (id: string, w: number, h: number): LayoutItem => ({ id, w, h });
export const DASH_PRESETS: DashPreset[] = [
    { id: 'full', scope: 'carrier', name: 'Full overview', blurb: 'Everything your menu offers, each at its natural size.', items: [P('attention', 2, 1), P('alerts', 2, 2), P('calendar', 2, 1), P('account', 2, 1), P('driver-compliance', 2, 1), P('asset-compliance', 2, 1), P('maintenance', 2, 1), P('safety', 2, 2), P('roadside', 1, 1), P('violations', 2, 1), P('accidents', 1, 1), P('safety-events', 1, 1), P('hos', 1, 1), P('hiring', 2, 1), P('onboarding', 1, 1), P('inventory', 1, 1), P('fuel', 1, 1), P('users', 1, 1), P('messages', 2, 1), P('audit', 2, 1)] },
    { id: 'charts', scope: 'carrier', name: 'Charts only', blurb: 'The chart-led cards, large — a wall of trends and breakdowns.', items: [P('safety', 4, 2), P('alerts', 2, 2), P('driver-compliance', 2, 2), P('violations', 2, 2), P('accidents', 2, 2), P('roadside', 2, 2), P('fuel', 2, 2), P('hiring', 2, 2), P('maintenance', 2, 2), P('audit', 2, 2)] },
    { id: 'compliance', scope: 'carrier', name: 'Compliance only', blurb: 'Records, monitoring and the calendar — nothing else.', items: [P('attention', 2, 1), P('calendar', 2, 2), P('alerts', 2, 2), P('driver-compliance', 2, 2), P('asset-compliance', 2, 2), P('roadside', 2, 1), P('hos', 1, 1), P('maintenance', 1, 1)] },
    { id: 'safety', scope: 'carrier', name: 'Safety & risk', blurb: 'The score, tickets, accidents, events and hours — the safety record.', items: [P('safety', 4, 2), P('violations', 2, 2), P('accidents', 2, 2), P('safety-events', 2, 1), P('hos', 2, 1), P('roadside', 2, 1), P('calendar', 2, 1)] },
    { id: 'fleet', scope: 'carrier', name: 'Fleet & operations', blurb: 'Units, maintenance, inventory and fuel — running the fleet.', items: [P('account', 2, 1), P('maintenance', 2, 2), P('asset-compliance', 2, 2), P('fuel', 2, 2), P('inventory', 2, 1), P('roadside', 2, 1), P('calendar', 2, 1), P('users', 1, 1), P('messages', 1, 1)] },
    { id: 'glance', scope: 'carrier', name: 'At a glance', blurb: 'Every figure as a small tile — a KPI wall.', items: ['attention', 'alerts', 'calendar', 'driver-compliance', 'asset-compliance', 'maintenance', 'safety', 'roadside', 'violations', 'accidents', 'safety-events', 'hos', 'hiring', 'onboarding', 'inventory', 'fuel', 'users', 'messages', 'audit', 'account'].map((id) => P(id, 1, 1)) },
    { id: 'people', scope: 'carrier', name: 'Hiring & people', blurb: 'The pipeline, onboarding, the team and the conversation.', items: [P('attention', 2, 1), P('hiring', 2, 2), P('onboarding', 2, 2), P('users', 2, 1), P('messages', 2, 1), P('audit', 2, 1)] },
    { id: 'p-birdseye', scope: 'profile', name: "Bird's-eye", blurb: 'Every carrier against every risk, then what needs doing.', items: [P('sp-health', 4, 2), P('sp-carriers', 2, 2), P('attention', 2, 2), P('alerts', 2, 2), P('calendar', 2, 2), P('sp-fleet', 2, 1), P('sp-billing', 1, 1), P('users', 1, 1)] },
    { id: 'p-full', scope: 'profile', name: 'Full overview', blurb: 'Everything, each at its natural size.', items: [P('sp-health', 4, 2), P('sp-carriers', 2, 2), P('attention', 2, 1), P('alerts', 2, 2), P('calendar', 2, 1), P('driver-compliance', 2, 1), P('asset-compliance', 2, 1), P('sp-fleet', 2, 1), P('hiring', 2, 1), P('violations', 2, 1), P('accidents', 1, 1), P('roadside', 1, 1), P('maintenance', 1, 1), P('users', 1, 1), P('sp-billing', 1, 1), P('messages', 1, 1), P('audit', 2, 1)] },
    { id: 'p-compliance', scope: 'profile', name: 'Compliance across carriers', blurb: 'Records and monitoring, carrier by carrier.', items: [P('sp-health', 4, 2), P('driver-compliance', 2, 2), P('asset-compliance', 2, 2), P('alerts', 2, 2), P('calendar', 2, 2), P('roadside', 2, 1), P('hos', 2, 1)] },
    { id: 'p-charts', scope: 'profile', name: 'Charts only', blurb: 'The chart-led cards across the profile.', items: [P('sp-carriers', 4, 2), P('sp-fleet', 2, 2), P('alerts', 2, 2), P('violations', 2, 2), P('accidents', 2, 2), P('hiring', 2, 2), P('audit', 2, 2)] },
    { id: 'p-safety', scope: 'profile', name: 'Safety across carriers', blurb: 'Tickets, accidents, inspections and hours, carrier by carrier.', items: [P('sp-health', 4, 2), P('violations', 2, 2), P('accidents', 2, 2), P('roadside', 2, 2), P('hos', 2, 2)] },
    { id: 'p-glance', scope: 'profile', name: 'At a glance', blurb: 'Every figure as a small tile.', items: ['sp-health', 'sp-carriers', 'attention', 'alerts', 'calendar', 'driver-compliance', 'asset-compliance', 'sp-fleet', 'hiring', 'violations', 'accidents', 'roadside', 'maintenance', 'users', 'sp-billing', 'messages', 'audit'].map((id) => P(id, 1, 1)) },
];
export const presetsFor = (scope: ScopeKind): DashPreset[] => DASH_PRESETS.filter((p) => p.scope === scope);

const KEY = 'dashboard-layout-v2';
const OLD_KEY = 'dashboard-layout-v1';
const EVENT = 'dashboard-layout-change';
type Store = Record<string, DashLayout>;
type OldItem = { id: string; size?: WidgetSize };

/** A v1 layout (sizes) becomes shapes; anything else is read as is. */
function normalize(items: (LayoutItem | OldItem)[]): LayoutItem[] {
    return items.map((i) => {
        if ('w' in i && typeof i.w === 'number') return { id: i.id, w: Math.min(MAX_W, Math.max(1, i.w)), h: Math.min(MAX_H, Math.max(1, i.h || 1)), opts: i.opts, shortcut: i.shortcut };
        const m = SIZE_META[(i as OldItem).size ?? 'sm'] ?? SIZE_META.sm;
        return { id: i.id, w: m.w, h: m.h };
    });
}
function read(): Store {
    try {
        const raw = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
        const s = JSON.parse(raw || '{}') as Record<string, { items: (LayoutItem | OldItem)[] }>;
        const out: Store = {};
        for (const [k, v] of Object.entries(s)) out[k] = { items: normalize(v.items ?? []), preset: (v as { preset?: string }).preset };
        return out;
    } catch { return {}; }
}
function write(s: Store): void {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private window */ }
    window.dispatchEvent(new Event(EVENT));
}
const slot = (userId: string, scope: ScopeKind) => `${userId}|${scope}`;

let cache: { raw: string | null; value: Store } | null = null;
function snapshot(): Store {
    let raw: string | null = null;
    try { raw = (localStorage.getItem(KEY) ?? '') + '|' + (localStorage.getItem(OLD_KEY) ?? ''); } catch { /* private window */ }
    if (cache && cache.raw === raw) return cache.value;
    cache = { raw, value: read() };
    return cache.value;
}
function subscribe(cb: () => void): () => void {
    window.addEventListener(EVENT, cb);
    window.addEventListener('storage', cb);
    return () => { window.removeEventListener(EVENT, cb); window.removeEventListener('storage', cb); };
}

/**
 * The layout to show, and the ways to change it. `fallback` is the preset already filtered
 * to what this person may see; a saved layout is filtered the same way on the way out, so a
 * widget whose menu was since hidden from the role disappears without anyone touching it.
 * The changers read the latest items through a ref, so they keep their identity across
 * changes and a card that memoises on them re-renders only when its own item changes.
 */
export function useDashLayout(userId: string, scope: ScopeKind, fallback: DashLayout, allowed: (item: LayoutItem) => boolean) {
    const store = useSyncExternalStore(subscribe, snapshot, snapshot);
    const key = slot(userId, scope);
    const saved = store[key];
    const layout: DashLayout = saved ? { items: saved.items.filter(allowed), preset: saved.preset } : fallback;
    const customized = !!saved;
    const latest = useRef(layout.items);
    latest.current = layout.items;

    // Any change by hand is no longer the preset it started from.
    const save = useCallback((items: LayoutItem[], preset?: string) => {
        const s = read();
        s[key] = { items, preset };
        write(s);
    }, [key]);
    const applyPreset = useCallback((preset: DashPreset, items: LayoutItem[]) => save(items, preset.id), [save]);

    const resize = useCallback((id: string, w: number, h: number) => {
        const nw = Math.min(MAX_W, Math.max(1, Math.round(w)));
        const nh = Math.min(MAX_H, Math.max(1, Math.round(h)));
        const items = latest.current;
        if (items.some((i) => i.id === id && i.w === nw && i.h === nh)) return;
        save(items.map((i) => (i.id === id ? { ...i, w: nw, h: nh } : i)));
    }, [save]);
    const setOpt = useCallback((id: string, optKey: string, value: string) =>
        save(latest.current.map((i) => (i.id === id ? { ...i, opts: { ...(i.opts ?? {}), [optKey]: value } } : i))), [save]);
    const hide = useCallback((id: string) => save(latest.current.filter((i) => i.id !== id)), [save]);
    const show = useCallback((id: string, w: number, h: number) =>
        save(latest.current.some((i) => i.id === id) ? latest.current : [...latest.current, { id, w, h }]), [save]);
    const addShortcut = useCallback((shortcut: Shortcut, w: number, h: number) => {
        const id = `sc:${shortcut.kind}:${shortcut.ref}`;
        if (latest.current.some((i) => i.id === id)) return;
        save([...latest.current, { id, w, h, shortcut }]);
    }, [save]);
    const move = useCallback((from: number, to: number) => {
        const items = latest.current;
        if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
        const next = [...items];
        const [m] = next.splice(from, 1);
        next.splice(to, 0, m);
        save(next);
    }, [save]);
    const reset = useCallback(() => {
        const s = read();
        delete s[key];
        write(s);
    }, [key]);

    return { layout, customized, resize, setOpt, hide, show, addShortcut, move, reset, applyPreset };
}

// ── The period the time charts cover, per person ──
const PERIOD_KEY = 'dashboard-period-v1';
export const PERIODS = [3, 6, 12] as const;
export function readPeriod(userId: string): number {
    try { const n = Number(JSON.parse(localStorage.getItem(PERIOD_KEY) || '{}')[userId]); return PERIODS.includes(n as 3 | 6 | 12) ? n : 6; } catch { return 6; }
}
export function writePeriod(userId: string, months: number): void {
    try { const s = JSON.parse(localStorage.getItem(PERIOD_KEY) || '{}'); s[userId] = months; localStorage.setItem(PERIOD_KEY, JSON.stringify(s)); } catch { /* private window */ }
}
