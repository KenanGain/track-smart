// ─────────────────────────────────────────────────────────────────────────────
// AI widget kit — the interactive cards an agent attaches to a reply.
//
// Everything here is a CONTROL, not a picture:
//   • KPI tiles      → click one to filter the rows below it
//   • mini charts    → click a bar / slice / point to filter by it
//   • filter chips   → toggle, combine, clear
//   • rows           → click to open that exact record on its own page
//   • expand         → the card grows (and takes the full dashboard width) to show
//                      the full list and a taller chart, then collapses back
//
// Two consumers: `AiPanelCard` (a single data panel — "show me expiring documents")
// and `AiDashboardCard` (a tagged driver's / asset's mini dashboard, one widget per
// domain). Both share the same guts so filtering behaves identically.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import {
    Users, FileText, BellRing, AlertTriangle, Ticket, UserPlus, ShieldCheck, Clock,
    ClipboardCheck, Building2, DollarSign, Sparkles, ArrowRight, ChevronRight, X,
    Maximize2, Minimize2, Filter, Truck, User, ExternalLink, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
    AiChart, AiDashboard, AiFilter, AiPanel, AiRow, AiStat, AiTone, AiWidget, AiWidgetKey, AgentIntent,
} from './ai-agents';

// ── tones ────────────────────────────────────────────────────────────────────

export const AI_TONE: Record<AiTone, { chip: string; num: string; sq: string; bar: string; ring: string; hex: string }> = {
    rose:    { chip: 'bg-rose-100 text-rose-700',       num: 'text-rose-600',    sq: 'bg-rose-50 text-rose-600',      bar: 'bg-rose-500',    ring: 'ring-rose-300',    hex: '#f43f5e' },
    amber:   { chip: 'bg-amber-100 text-amber-700',     num: 'text-amber-600',   sq: 'bg-amber-50 text-amber-600',    bar: 'bg-amber-500',   ring: 'ring-amber-300',   hex: '#f59e0b' },
    emerald: { chip: 'bg-emerald-100 text-emerald-700', num: 'text-emerald-600', sq: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500', ring: 'ring-emerald-300', hex: '#10b981' },
    blue:    { chip: 'bg-blue-100 text-blue-700',       num: 'text-blue-600',    sq: 'bg-blue-50 text-blue-600',      bar: 'bg-blue-500',    ring: 'ring-blue-300',    hex: '#3b82f6' },
    violet:  { chip: 'bg-violet-100 text-violet-700',   num: 'text-violet-600',  sq: 'bg-violet-50 text-violet-600',  bar: 'bg-violet-500',  ring: 'ring-violet-300',  hex: '#8b5cf6' },
    slate:   { chip: 'bg-slate-100 text-slate-600',     num: 'text-slate-700',   sq: 'bg-slate-100 text-slate-500',   bar: 'bg-slate-400',   ring: 'ring-slate-300',   hex: '#94a3b8' },
};

export const AI_INTENT: Record<AgentIntent, { icon: LucideIcon; tone: AiTone }> = {
    greeting:   { icon: Sparkles,       tone: 'violet' },
    help:       { icon: Sparkles,       tone: 'violet' },
    drivers:    { icon: Users,          tone: 'blue' },
    documents:  { icon: FileText,       tone: 'blue' },
    expiring:   { icon: BellRing,       tone: 'amber' },
    accidents:  { icon: AlertTriangle,  tone: 'rose' },
    tickets:    { icon: Ticket,         tone: 'amber' },
    hiring:     { icon: UserPlus,       tone: 'violet' },
    onboarding: { icon: UserPlus,       tone: 'violet' },
    safety:     { icon: ShieldCheck,    tone: 'rose' },
    hos:        { icon: Clock,          tone: 'amber' },
    violations: { icon: AlertTriangle,  tone: 'amber' },
    dqfiles:    { icon: ClipboardCheck, tone: 'blue' },
    account:    { icon: Building2,      tone: 'emerald' },
    paystub:    { icon: DollarSign,     tone: 'emerald' },
};

const WIDGET_ICON: Record<AiWidgetKey, { icon: LucideIcon; tone: AiTone }> = {
    documents:  { icon: FileText,       tone: 'blue' },
    monitoring: { icon: BellRing,       tone: 'amber' },
    safety:     { icon: ShieldCheck,    tone: 'rose' },
    tickets:    { icon: Ticket,         tone: 'amber' },
    dqfiles:    { icon: ClipboardCheck, tone: 'blue' },
    violations: { icon: AlertTriangle,  tone: 'amber' },
    accidents:  { icon: AlertTriangle,  tone: 'rose' },
    hos:        { icon: Clock,          tone: 'violet' },
};

/** What a row click resolves to — the destination page plus the record to open. */
export interface RowTarget { path: string; recordId?: string; label: string }

// ── KPI tiles (clickable = filter) ───────────────────────────────────────────

function KpiTiles({ stats, active, onToggle, compact }: {
    stats: AiStat[]; active: Set<string>; onToggle: (f: string) => void; compact?: boolean;
}) {
    const cols = stats.length >= 4 ? 'grid-cols-4' : stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2';
    return (
        <div className={cn('grid gap-px bg-slate-100', cols)}>
            {stats.map(s => {
                const tone = AI_TONE[s.tone ?? 'slate'];
                const on = !!s.filter && active.has(s.filter);
                const clickable = !!s.filter;
                return (
                    <button
                        key={s.label}
                        type="button"
                        disabled={!clickable}
                        onClick={() => s.filter && onToggle(s.filter)}
                        title={clickable ? (on ? `Clear “${s.label}” filter` : `Filter by ${s.label}`) : s.label}
                        className={cn('relative bg-white text-center transition-colors',
                            compact ? 'px-1.5 py-1.5' : 'px-2.5 py-2',
                            clickable ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default',
                            on && 'bg-slate-900/[0.04] ring-1 ring-inset ' + tone.ring)}
                    >
                        <p className={cn('font-extrabold leading-none tabular-nums', compact ? 'text-[15px]' : 'text-[17px]', tone.num)}>{s.value}</p>
                        <p className="mt-1 truncate text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
                        {on && <span className={cn('absolute inset-x-0 bottom-0 h-[2px]', tone.bar)} />}
                    </button>
                );
            })}
        </div>
    );
}

// ── mini charts (clickable = filter) ─────────────────────────────────────────

function BarChart({ chart, active, onToggle, tall }: {
    chart: AiChart; active: Set<string>; onToggle: (f: string) => void; tall?: boolean;
}) {
    const max = chart.max ?? Math.max(1, ...chart.points.map(p => p.value));
    const h = tall ? 104 : 56;
    return (
        <div className="flex items-end gap-1.5" style={{ height: h + 26 }}>
            {chart.points.map((p, i) => {
                const tone = AI_TONE[p.tone ?? 'blue'];
                const on = !!p.filter && active.has(p.filter);
                const dim = active.size > 0 && !!p.filter && !on;
                return (
                    <button
                        key={`${p.label}-${i}`}
                        type="button"
                        disabled={!p.filter}
                        onClick={() => p.filter && onToggle(p.filter)}
                        title={`${p.label}: ${chart.unit === '$' ? '$' : ''}${p.value}${chart.unit && chart.unit !== '$' ? ` ${chart.unit}` : ''}`}
                        className={cn('group flex min-w-0 flex-1 flex-col items-center justify-end gap-1', p.filter && 'cursor-pointer')}
                    >
                        <span className={cn('text-[10px] font-bold tabular-nums leading-none', on ? tone.num : 'text-slate-500')}>
                            {chart.unit === '$' ? '$' : ''}{p.value}
                        </span>
                        <span
                            className={cn('w-full rounded-t transition-all', tone.bar, dim && 'opacity-30', p.filter && 'group-hover:opacity-90', on && 'ring-2 ring-inset ' + tone.ring)}
                            style={{ height: Math.max(3, (p.value / max) * h) }}
                        />
                        <span className="w-full truncate text-center text-[9px] font-semibold uppercase tracking-wide text-slate-400">{p.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

function LineChart({ chart, tall }: { chart: AiChart; tall?: boolean }) {
    const max = chart.max ?? Math.max(1, ...chart.points.map(p => p.value));
    const w = 240, h = tall ? 96 : 56;
    const step = chart.points.length > 1 ? w / (chart.points.length - 1) : w;
    const pts = chart.points.map((p, i) => [i * step, h - (p.value / max) * (h - 8) - 4] as const);
    const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `0,${h} ${line} ${w},${h}`;
    const hex = AI_TONE[chart.points[0]?.tone ?? 'blue'].hex;
    return (
        <div>
            <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" preserveAspectRatio="none" style={{ height: h }}>
                <polygon points={area} fill={hex} opacity="0.12" />
                <polyline points={line} fill="none" stroke={hex} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" fill="#fff" stroke={hex} strokeWidth="1.8" />)}
            </svg>
            <div className="mt-1 flex justify-between">
                {chart.points.map((p, i) => (
                    <span key={i} className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{p.label}</span>
                ))}
            </div>
        </div>
    );
}

function DonutChart({ chart, active, onToggle, tall }: {
    chart: AiChart; active: Set<string>; onToggle: (f: string) => void; tall?: boolean;
}) {
    const total = chart.points.reduce((n, p) => n + p.value, 0);
    const size = tall ? 108 : 84;
    const r = size / 2 - 8, c = 2 * Math.PI * r;
    let offset = 0;
    return (
        <div className="flex items-center gap-3">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
                {total > 0 && chart.points.map((p, i) => {
                    const frac = p.value / total;
                    const dash = frac * c;
                    const on = !!p.filter && active.has(p.filter);
                    const dim = active.size > 0 && !!p.filter && !on;
                    const el = (
                        <circle
                            key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
                            stroke={AI_TONE[p.tone ?? 'blue'].hex}
                            strokeWidth={on ? 13 : 10}
                            strokeDasharray={`${dash} ${c - dash}`}
                            strokeDashoffset={-offset}
                            opacity={dim ? 0.3 : 1}
                            className={p.filter ? 'cursor-pointer' : undefined}
                            onClick={() => p.filter && onToggle(p.filter)}
                        />
                    );
                    offset += dash;
                    return el;
                })}
            </svg>
            <div className="min-w-0 flex-1 space-y-1">
                {chart.points.map((p, i) => {
                    const on = !!p.filter && active.has(p.filter);
                    return (
                        <button
                            key={i} type="button" disabled={!p.filter}
                            onClick={() => p.filter && onToggle(p.filter)}
                            className={cn('flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left', p.filter && 'hover:bg-slate-50', on && 'bg-slate-100')}
                        >
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: AI_TONE[p.tone ?? 'blue'].hex }} />
                            <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold text-slate-600">{p.label}</span>
                            <span className="shrink-0 text-[10.5px] font-bold tabular-nums text-slate-700">{p.value}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function ProgressChart({ chart }: { chart: AiChart }) {
    const max = chart.max ?? Math.max(1, ...chart.points.map(p => p.value));
    return (
        <div className="space-y-2">
            {chart.points.map((p, i) => {
                const tone = AI_TONE[p.tone ?? 'blue'];
                return (
                    <div key={i}>
                        <div className="mb-1 flex items-baseline justify-between gap-2">
                            <span className="min-w-0 truncate text-[10.5px] font-semibold text-slate-600">{p.label}</span>
                            <span className={cn('shrink-0 text-[10.5px] font-bold tabular-nums', tone.num)}>{p.value}{chart.unit ?? ''}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <span className={cn('block h-full rounded-full transition-all', tone.bar)} style={{ width: `${Math.min(100, (p.value / max) * 100)}%` }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function MiniChart({ chart, active, onToggle, tall }: {
    chart: AiChart; active: Set<string>; onToggle: (f: string) => void; tall?: boolean;
}) {
    if (!chart.points.length) return null;
    return (
        <div className="border-t border-slate-100 px-3 py-2.5">
            {chart.title && (
                <p className="mb-1.5 flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wide text-slate-400">
                    {chart.title}
                    {chart.points.some(p => p.filter) && <span className="font-semibold normal-case tracking-normal text-slate-300">· tap to filter</span>}
                </p>
            )}
            {chart.kind === 'bar' && <BarChart chart={chart} active={active} onToggle={onToggle} tall={tall} />}
            {chart.kind === 'line' && <LineChart chart={chart} tall={tall} />}
            {chart.kind === 'donut' && <DonutChart chart={chart} active={active} onToggle={onToggle} tall={tall} />}
            {chart.kind === 'progress' && <ProgressChart chart={chart} />}
        </div>
    );
}

// ── filter chips ─────────────────────────────────────────────────────────────

function FilterChips({ filters, active, onToggle, onClear, shown, total }: {
    filters: AiFilter[]; active: Set<string>; onToggle: (f: string) => void; onClear: () => void;
    shown: number; total: number;
}) {
    return (
        <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 bg-slate-50/60 px-3 py-2">
            <Filter size={11} className="shrink-0 text-slate-400" />
            {filters.map(f => {
                const on = active.has(f.id);
                const tone = AI_TONE[f.tone ?? 'slate'];
                return (
                    <button
                        key={f.id} type="button" onClick={() => onToggle(f.id)}
                        className={cn('rounded-full px-2 py-0.5 text-[10.5px] font-bold transition-colors',
                            on ? tone.chip + ' ring-1 ring-inset ' + tone.ring : 'bg-white text-slate-500 ring-1 ring-inset ring-slate-200 hover:bg-slate-100')}
                    >
                        {f.label}
                    </button>
                );
            })}
            {active.size > 0 && (
                <button type="button" onClick={onClear}
                    className="ml-auto inline-flex items-center gap-0.5 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-slate-700">
                    <X size={10} /> {shown} of {total}
                </button>
            )}
        </div>
    );
}

// ── rows (clickable = open the record) ───────────────────────────────────────

function RowList({ rows, onOpenRow, limit }: {
    rows: AiRow[]; onOpenRow?: (t: RowTarget) => void; limit?: number;
}) {
    const shown = limit ? rows.slice(0, limit) : rows;
    if (!shown.length) {
        return <p className="px-3 py-5 text-center text-[11.5px] font-medium text-slate-400">Nothing matches this filter.</p>;
    }
    return (
        <div className="divide-y divide-slate-50">
            {shown.map((r, i) => {
                const target = r.path ? { path: r.path, recordId: r.recordId, label: r.title } : null;
                const clickable = !!target && !!onOpenRow;
                return (
                    <div
                        key={`${r.title}-${i}`}
                        role={clickable ? 'button' : undefined}
                        tabIndex={clickable ? 0 : undefined}
                        onClick={clickable ? () => onOpenRow!(target!) : undefined}
                        onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenRow!(target!); } } : undefined}
                        className={cn('group flex items-center gap-2.5 px-3 py-2 transition-colors',
                            clickable && 'cursor-pointer hover:bg-blue-50/60')}
                    >
                        <div className="min-w-0 flex-1">
                            <p className={cn('truncate text-[12.5px] font-semibold text-slate-800', clickable && 'group-hover:text-blue-700')}>{r.title}</p>
                            {r.subtitle && <p className="truncate text-[11px] text-slate-500">{r.subtitle}</p>}
                            {typeof r.progress === 'number' && (
                                <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-slate-100">
                                    <span className={cn('block h-full rounded-full', AI_TONE[r.tone ?? 'blue'].bar)} style={{ width: `${Math.min(100, Math.max(0, r.progress))}%` }} />
                                </span>
                            )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                            {r.badge && <span className={cn('rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide', AI_TONE[r.tone ?? 'slate'].chip)}>{r.badge}</span>}
                            {r.meta && <span className="text-[10.5px] font-medium text-slate-400">{r.meta}</span>}
                        </div>
                        {clickable && (
                            <span className="ml-0.5 hidden shrink-0 items-center gap-0.5 text-[10px] font-bold text-blue-600 group-hover:inline-flex">
                                View <ChevronRight size={11} />
                            </span>
                        )}
                        {clickable && <ChevronRight size={13} className="shrink-0 text-slate-300 group-hover:hidden" />}
                    </div>
                );
            })}
        </div>
    );
}

// ── filtering hook shared by panels + widgets ────────────────────────────────

function useRowFilter(rows: AiRow[] | undefined) {
    const [active, setActive] = useState<Set<string>>(new Set());
    const toggle = (f: string) => setActive(prev => {
        const next = new Set(prev);
        if (next.has(f)) next.delete(f); else next.add(f);
        return next;
    });
    const clear = () => setActive(new Set());
    const filtered = useMemo(() => {
        const all = rows ?? [];
        if (!active.size) return all;
        return all.filter(r => (r.tags ?? []).some(t => active.has(t)));
    }, [rows, active]);
    return { active, toggle, clear, filtered };
}

/** A progress ring — the headline score / completeness of a widget. */
function Ring({ value, tone, label }: { value: number; tone?: AiTone; label: string }) {
    const t = AI_TONE[tone ?? 'blue'];
    const r = 20, c = 2 * Math.PI * r, dash = (Math.min(100, Math.max(0, value)) / 100) * c;
    return (
        <div className="flex shrink-0 items-center gap-2">
            <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
                <circle cx="24" cy="24" r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
                <circle cx="24" cy="24" r={r} fill="none" stroke={t.hex} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${dash} ${c - dash}`} />
            </svg>
            <div className="min-w-0">
                <p className={cn('text-[15px] font-extrabold leading-none tabular-nums', t.num)}>{value}%</p>
                <p className="truncate text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            </div>
        </div>
    );
}

// ── a single data panel ──────────────────────────────────────────────────────

export function AiPanelCard({ panel, onOpen, onOpenRow }: {
    panel: AiPanel; onOpen?: (path: string) => void; onOpenRow?: (t: RowTarget) => void;
}) {
    const { icon: Icon, tone } = AI_INTENT[panel.intent];
    const accent = AI_TONE[tone];
    const { active, toggle, clear, filtered } = useRowFilter(panel.rows);
    const [expanded, setExpanded] = useState(false);
    const collapsed = panel.collapsedRows ?? 4;
    const canExpand = (panel.rows?.length ?? 0) > collapsed || !!panel.chart;

    return (
        <div className={cn('mt-3 overflow-hidden rounded-xl border bg-white shadow-sm transition-all',
            expanded ? 'border-blue-300 shadow-md' : 'border-slate-200')}>
            <div className="flex items-start gap-2.5 border-b border-slate-100 p-3">
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', accent.sq)}><Icon size={17} /></span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold text-slate-800">{panel.title}</p>
                    {panel.summary && <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{panel.summary}</p>}
                </div>
                {canExpand && (
                    <button type="button" onClick={() => setExpanded(v => !v)} title={expanded ? 'Collapse' : 'Expand'}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                        {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                )}
            </div>

            {panel.stats && panel.stats.length > 0 && <KpiTiles stats={panel.stats} active={active} onToggle={toggle} />}
            {panel.chart && <MiniChart chart={panel.chart} active={active} onToggle={toggle} tall={expanded} />}
            {panel.filters && panel.filters.length > 0 && (
                <FilterChips filters={panel.filters} active={active} onToggle={toggle} onClear={clear}
                    shown={filtered.length} total={panel.rows?.length ?? 0} />
            )}
            {panel.rows && panel.rows.length > 0 && (
                <RowList rows={filtered} onOpenRow={onOpenRow} limit={expanded ? undefined : collapsed} />
            )}
            {!expanded && filtered.length > collapsed && (
                <button type="button" onClick={() => setExpanded(true)}
                    className="w-full border-t border-slate-100 py-2 text-[11px] font-bold text-blue-600 transition-colors hover:bg-blue-50">
                    Show all {filtered.length} →
                </button>
            )}

            <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-2.5">
                <span className="min-w-0 truncate text-[10.5px] font-medium text-slate-400">{panel.footnote}</span>
                {panel.link && (
                    <button type="button" onClick={() => onOpen?.(panel.link!.path)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-slate-700">
                        {panel.link.label} <ArrowRight size={12} />
                    </button>
                )}
            </div>
        </div>
    );
}

// ── one dashboard widget ─────────────────────────────────────────────────────

function DashWidget({ widget, expanded, onExpand, onOpen, onOpenRow }: {
    widget: AiWidget; expanded: boolean; onExpand: () => void;
    onOpen?: (path: string) => void; onOpenRow?: (t: RowTarget) => void;
}) {
    const { icon: Icon, tone } = WIDGET_ICON[widget.key];
    const accent = AI_TONE[tone];
    const { active, toggle, clear, filtered } = useRowFilter(widget.rows);
    const collapsedRows = expanded ? undefined : 3;

    return (
        <div className={cn('flex min-w-0 flex-col overflow-hidden rounded-xl border bg-white transition-all',
            expanded ? 'border-blue-300 shadow-md' : 'border-slate-200 shadow-sm')}>
            <div className="flex items-start gap-2 p-2.5">
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', accent.sq)}><Icon size={14} /></span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold text-slate-800">{widget.title}</p>
                    {widget.summary && <p className={cn('text-[10.5px] leading-snug text-slate-500', !expanded && 'line-clamp-2')}>{widget.summary}</p>}
                </div>
                <button type="button" onClick={onExpand} title={expanded ? 'Collapse widget' : 'Expand widget'}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                    {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
            </div>

            {widget.progress && (
                <div className="border-t border-slate-100 px-2.5 py-2">
                    <Ring value={widget.progress.value} tone={widget.progress.tone} label={widget.progress.label} />
                </div>
            )}
            {widget.stats && widget.stats.length > 0 && (
                <div className="border-t border-slate-100">
                    <KpiTiles stats={widget.stats} active={active} onToggle={toggle} compact={!expanded} />
                </div>
            )}
            {widget.chart && <MiniChart chart={widget.chart} active={active} onToggle={toggle} tall={expanded} />}
            {expanded && widget.filters && widget.filters.length > 0 && (
                <FilterChips filters={widget.filters} active={active} onToggle={toggle} onClear={clear}
                    shown={filtered.length} total={widget.rows?.length ?? 0} />
            )}
            {widget.rows && widget.rows.length > 0 && (
                <div className="border-t border-slate-100">
                    <RowList rows={filtered} onOpenRow={onOpenRow} limit={collapsedRows} />
                </div>
            )}
            {!expanded && filtered.length > 3 && (
                <button type="button" onClick={onExpand}
                    className="border-t border-slate-100 py-1.5 text-[10.5px] font-bold text-blue-600 transition-colors hover:bg-blue-50">
                    +{filtered.length - 3} more →
                </button>
            )}
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-2.5 py-1.5">
                <span className="min-w-0 truncate text-[9.5px] font-medium text-slate-400">{widget.footnote}</span>
                {widget.link && (
                    <button type="button" onClick={() => onOpen?.(widget.link!.path)} title={widget.link.label}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-bold text-slate-600 transition-colors hover:bg-white hover:text-blue-700">
                        Open <ExternalLink size={10} />
                    </button>
                )}
            </div>
        </div>
    );
}

// ── the subject mini dashboard ───────────────────────────────────────────────

export function AiDashboardCard({ dash, onOpen, onOpenRow, onAsk }: {
    dash: AiDashboard;
    onOpen?: (path: string) => void;
    onOpenRow?: (t: RowTarget) => void;
    /** Ask the same agent a follow-up (the widget shortcut chips). */
    onAsk?: (prompt: string) => void;
}) {
    const s = dash.subject;
    const [expandedKey, setExpandedKey] = useState<AiWidgetKey | null>(dash.widgets.length === 1 ? dash.widgets[0].key : null);
    const single = dash.widgets.length === 1;
    const SubjectIcon = s.kind === 'driver' ? User : Truck;

    return (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Subject header */}
            <div className="flex items-start gap-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-3">
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white', s.color)}>
                    {s.initials}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <p className="min-w-0 truncate text-[14px] font-bold text-slate-900">{s.name}</p>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-slate-500">
                            <SubjectIcon size={10} /> {s.kind}
                        </span>
                        {s.status && (
                            <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide', AI_TONE[s.statusTone ?? 'slate'].chip)}>{s.status}</span>
                        )}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{s.sub}</p>
                    {dash.headline && <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-600">{dash.headline}</p>}
                </div>
                <button type="button" onClick={() => onOpenRow?.({ path: s.path, recordId: s.recordId, label: s.name })}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-slate-700">
                    Open page <ArrowRight size={12} />
                </button>
            </div>

            {/* Widgets — an expanded one takes the full width (dynamic sizing) */}
            <div className={cn('gap-2.5 bg-slate-50/60 p-2.5', single ? 'flex flex-col' : 'grid grid-cols-1 sm:grid-cols-2')}>
                {dash.widgets.map(w => {
                    const isOpen = expandedKey === w.key;
                    return (
                        <div key={w.key} className={cn('min-w-0', !single && isOpen && 'sm:col-span-2')}>
                            <DashWidget
                                widget={w}
                                expanded={isOpen}
                                onExpand={() => setExpandedKey(isOpen ? null : w.key)}
                                onOpen={onOpen}
                                onOpenRow={onOpenRow}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Follow-ups — pull one widget on its own, full width */}
            {onAsk && (
                <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 px-3 py-2">
                    <span className="mr-0.5 text-[9.5px] font-bold uppercase tracking-wide text-slate-400">Zoom in</span>
                    {(['documents', 'monitoring', 'safety', 'tickets', 'dqfiles'] as AiWidgetKey[]).map(k => (
                        <button key={k} type="button"
                            onClick={() => onAsk(`${WIDGET_ASK_LABEL[k]} for ${s.name}`)}
                            className="rounded-full bg-slate-50 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-violet-50 hover:text-violet-700 hover:ring-violet-200">
                            {WIDGET_ASK_LABEL[k]}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

const WIDGET_ASK_LABEL: Record<AiWidgetKey, string> = {
    documents: 'Documents', monitoring: 'Monitoring', safety: 'Safety score',
    tickets: 'Tickets', dqfiles: 'DQ file', violations: 'Violations',
    accidents: 'Accidents', hos: 'Hours of service',
};
