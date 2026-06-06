/**
 * Shared UI primitives for the Hiring module.
 *
 * Accent colors by module:
 *   ATS / Assignments  → blue   (from-sky-500 to-blue-600)
 *   DQ Files           → violet (from-violet-500 to-purple-600)
 */

import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ── KpiTile ───────────────────────────────────────────────────────────────────

export interface KpiTileProps {
    label: string;
    value: React.ReactNode;
    /** Tailwind bg-* class for the top accent bar. */
    accent: string;
    /** Tailwind text-* class for the value number. */
    tone?: string;
    Icon?: React.ElementType;
    active?: boolean;
    onClick?: () => void;
    /** Ring+border classes for the active state (default: ring-blue-300 border-blue-300). */
    activeRing?: string;
    hover?: string;
}

export function KpiTile({
    label, value, accent, tone, Icon, active, onClick,
    activeRing = 'ring-blue-300 border-blue-300', hover,
}: KpiTileProps) {
    const interactive = !!onClick;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!interactive}
            title={hover}
            className={cn(
                'group relative overflow-hidden rounded-lg border border-slate-200 bg-white text-left transition-all',
                interactive && 'cursor-pointer hover:border-slate-300 hover:shadow-sm',
                active && cn('ring-2', activeRing),
                !interactive && 'cursor-default',
            )}
        >
            {/* Top accent bar */}
            <div className={cn('h-0.5 w-full', accent)} />
            <div className="px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                    <span className={cn('text-xl font-black leading-none tabular-nums', tone ?? 'text-slate-900')}>
                        {value}
                    </span>
                    {Icon && <Icon size={14} className="text-slate-400" />}
                </div>
                <div className="mt-1 text-[9px] font-bold uppercase leading-tight tracking-wider text-slate-500">{label}</div>
            </div>
        </button>
    );
}

// ── PageHeader ────────────────────────────────────────────────────────────────

export interface PageHeaderProps {
    /** Tailwind gradient classes, for example "from-sky-500 to-blue-600". */
    iconGradient?: string;
    Icon: React.ElementType;
    title: string;
    subtitle: string;
    actions?: React.ReactNode;
    /** Content rendered below the title row (typically a TabStrip). */
    children?: React.ReactNode;
}

export function PageHeader({
    iconGradient = 'from-sky-500 to-blue-600',
    Icon, title, subtitle, actions, children,
}: PageHeaderProps) {
    return (
        <div className="border-b border-slate-200 bg-white px-8 pt-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm',
                        iconGradient,
                    )}>
                        <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
                        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
                    </div>
                </div>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
            {children}
        </div>
    );
}

// ── TabStrip ──────────────────────────────────────────────────────────────────

export type TabAccent = 'blue' | 'violet';

const TAB_ACCENT: Record<TabAccent, { active: string; border: string; badge: string }> = {
    blue:   { active: 'text-blue-600',   border: 'border-blue-600',   badge: 'bg-blue-100 text-blue-700' },
    violet: { active: 'text-violet-700', border: 'border-violet-600', badge: 'bg-violet-100 text-violet-700' },
};

export interface TabDef {
    id: string;
    label: string;
    Icon?: React.ElementType;
    count?: number;
}

export function TabStrip({
    tabs, active, onChange, accent = 'blue',
}: {
    tabs: TabDef[];
    active: string;
    onChange: (id: string) => void;
    accent?: TabAccent;
}) {
    const a = TAB_ACCENT[accent];
    return (
        <div className="flex items-center gap-1 -mb-px overflow-x-auto">
            {tabs.map(tab => {
                const on = active === tab.id;
                const TIcon = tab.Icon;
                return (
                    <button key={tab.id} type="button" onClick={() => onChange(tab.id)}
                        className={cn(
                            'inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                            on
                                ? cn(a.active, a.border)
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800',
                        )}>
                        {TIcon && <TIcon size={15} className={on ? a.active : 'text-slate-400'} />}
                        {tab.label}
                        {typeof tab.count === 'number' && tab.count > 0 && (
                            <span className={cn(
                                'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                                on ? a.badge : 'bg-slate-100 text-slate-600',
                            )}>{tab.count}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// ── FilterBar + SearchInput + SelectFilter ────────────────────────────────────

export function FilterBar({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            {children}
        </div>
    );
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }: {
    value: string; onChange: (v: string) => void; placeholder?: string;
}) {
    return (
        <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
        </div>
    );
}

export function SelectFilter({ value, onChange, options }: {
    value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
    return (
        <div className="relative">
            <select value={value} onChange={e => onChange(e.target.value)}
                className="h-9 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
    );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

export function EmptyState({ Icon, title, subtitle }: { Icon: React.ElementType; title: string; subtitle?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                <Icon size={22} />
            </div>
            <h3 className="text-sm font-semibold text-slate-500">{title}</h3>
            {subtitle && <p className="mt-1 max-w-xs text-xs text-slate-400">{subtitle}</p>}
        </div>
    );
}
