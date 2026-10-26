import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { AppUser, UserRole } from '@/data/users.data';
import type { MonitoringAlert } from '@/pages/compliance/monitoring-alerts';
import type { LayoutItem, ScopeKind, WidgetSize } from './dashboard-layout';
import type { DashData } from './dashboard-data';

// ─────────────────────────────────────────────────────────────────────────────
// What a widget is.
//
// A widget is a title, the menu it summarises, and a `render(ctx, size)` — four layouts of
// the same thing, the way a phone's home-screen widget shows one figure when small and the
// whole story when large. The page owns the card chrome (grip, title, open, ⋮, the resize
// handles, the filter); the widget owns everything inside. A role is offered a widget only
// if its menu table shows the menu. A shortcut is a widget too — one that stands for a page
// or a single record, and says what it knows about it.
// ─────────────────────────────────────────────────────────────────────────────

export type Tone = 'slate' | 'blue' | 'emerald' | 'amber' | 'rose' | 'orange' | 'violet' | 'sky' | 'indigo' | 'teal' | 'red' | 'pink' | 'cyan';
export const TONE: Record<Tone, { text: string; bg: string; soft: string; border: string }> = {
    slate: { text: 'text-slate-600', bg: 'bg-slate-400', soft: 'bg-slate-100 text-slate-700', border: 'border-slate-200' },
    blue: { text: 'text-blue-600', bg: 'bg-blue-500', soft: 'bg-blue-50 text-blue-700', border: 'border-blue-200' },
    emerald: { text: 'text-emerald-600', bg: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200' },
    amber: { text: 'text-amber-600', bg: 'bg-amber-500', soft: 'bg-amber-50 text-amber-700', border: 'border-amber-200' },
    rose: { text: 'text-rose-600', bg: 'bg-rose-500', soft: 'bg-rose-50 text-rose-700', border: 'border-rose-200' },
    orange: { text: 'text-orange-600', bg: 'bg-orange-500', soft: 'bg-orange-50 text-orange-700', border: 'border-orange-200' },
    violet: { text: 'text-violet-600', bg: 'bg-violet-500', soft: 'bg-violet-50 text-violet-700', border: 'border-violet-200' },
    sky: { text: 'text-sky-600', bg: 'bg-sky-500', soft: 'bg-sky-50 text-sky-700', border: 'border-sky-200' },
    indigo: { text: 'text-indigo-600', bg: 'bg-indigo-500', soft: 'bg-indigo-50 text-indigo-700', border: 'border-indigo-200' },
    teal: { text: 'text-teal-600', bg: 'bg-teal-500', soft: 'bg-teal-50 text-teal-700', border: 'border-teal-200' },
    red: { text: 'text-red-600', bg: 'bg-red-500', soft: 'bg-red-50 text-red-700', border: 'border-red-200' },
    pink: { text: 'text-pink-600', bg: 'bg-pink-500', soft: 'bg-pink-50 text-pink-700', border: 'border-pink-200' },
    cyan: { text: 'text-cyan-600', bg: 'bg-cyan-500', soft: 'bg-cyan-50 text-cyan-700', border: 'border-cyan-200' },
};
/** The same tones for SVG and recharts, which take colours, not classes — the Beta Safety Analysis palette. */
export const HEX: Record<Tone, string> = {
    slate: '#94a3b8', blue: '#3b82f6', emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e', orange: '#f97316',
    violet: '#8b5cf6', sky: '#0ea5e9', indigo: '#6366f1', teal: '#14b8a6', red: '#ef4444', pink: '#ec4899', cyan: '#06b6d4',
};
/** Categorical series, in the order the Beta Safety Analysis page uses. */
export const PALETTE: Tone[] = ['blue', 'violet', 'amber', 'emerald', 'red', 'pink', 'cyan'];

/** One choice the person can make on a card — what it shows, kept with their layout. */
export interface WidgetOption {
    key: string;
    label: string;
    choices: { id: string; label: string }[];
    default: string;
}

/** What a shortcut card stands for: a page the menu offers, or one record. */
export type ShortcutKind = 'page' | 'driver' | 'asset' | 'applicant' | 'carrier';
export interface Shortcut {
    kind: ShortcutKind;
    /** The sidebar key of the page, or the record's id. */
    ref: string;
    label: string;
    sub?: string;
    /** The page's path (page shortcuts). */
    path?: string;
    /** The top-level menu the page belongs to — what decides whether the role may have it. */
    menuKey?: string;
    /** The carrier a record belongs to. */
    accountId?: string;
    tone?: Tone;
}

export interface BuildCtx {
    data: DashData;
    user: AppUser;
    role: UserRole;
    /** The card being drawn — its shape, its option values, its shortcut. */
    item: LayoutItem;
    /** Whether this person's menu shows that sidebar menu. */
    can: (menuKey?: string) => boolean;
    go: (path: string) => void;
    /** Open one record on its page — the page reads the hand-off and opens it. */
    openRecord: (path: string, id: string, type?: string) => void;
    openAlert: (a: MonitoringAlert, accountId?: string) => void;
    openCarrier: (accountId: string, path?: string) => void;
    /** The card's own option, as chosen (or its default). */
    opt: (key: string) => string;
    /** How many months the time charts cover — the page's period control. */
    months: number;
}

export type WidgetCategory = 'Overview' | 'Compliance' | 'Fleet' | 'Safety' | 'Hiring' | 'Team' | 'Shortcuts';

export interface WidgetDef {
    id: string;
    title: string;
    blurb: string;
    Icon: LucideIcon;
    tone: Tone;
    category: WidgetCategory;
    /** The sidebar menu this summarises — hidden from a role whose table hides that menu. */
    menuKey?: string | ((scope: ScopeKind) => string);
    scopes: ScopeKind[];
    sizes: WidgetSize[];
    defaultSize: WidgetSize;
    path?: (scope: ScopeKind) => string;
    /** A filter the card carries in its header. */
    option?: WidgetOption;
    render: (ctx: BuildCtx, size: WidgetSize) => ReactNode;
}

export const ALL_SIZES: WidgetSize[] = ['sm', 'md', 'lg', 'xl'];
export const menuKeyOf = (w: WidgetDef, scope: ScopeKind): string | undefined => (typeof w.menuKey === 'function' ? w.menuKey(scope) : w.menuKey);
