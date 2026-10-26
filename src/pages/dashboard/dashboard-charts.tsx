import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import {
    Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart,
    ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import { HEX, TONE, type Tone } from './dashboard-types';

// ─────────────────────────────────────────────────────────────────────────────
// The widget kit — the pieces every widget is drawn from, in the app's chart style.
//
// recharts, the way the Fuel and Beta Safety Analysis pages use it: no axis lines, muted
// ticks, a dashed grid, rounded bars, a white tooltip, thick donuts with the total in the
// hole; plus the small SVG pieces (rings, a dial, segment bars) a one-figure widget needs.
// The layouts are container queries — a card decides from its OWN width whether its halves
// sit side by side or stack, which is what lets a card be dragged to any shape.
// ─────────────────────────────────────────────────────────────────────────────

export const TT = { fontSize: 11, borderRadius: 8, borderColor: '#e2e8f0', boxShadow: '0 4px 12px rgba(15,23,42,.08)', padding: '6px 10px' } as const;
const TICK = { fontSize: 10, fill: '#94a3b8', fontWeight: 600 } as const;

// ── Formatting ──
export const fmtN = (v: number) => v.toLocaleString();
export const fmtMoney = (v: number, cur = 'USD') => `${cur === 'CAD' ? 'CA$' : '$'}${Math.round(v).toLocaleString()}`;
export const fmtK = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(Math.round(v)));
export const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
export const shortDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
export const monthLabel = (ym: string) => new Date(`${ym}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short' });
export const ago = (iso: string) => {
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return iso;
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.round(h / 24)}d`;
};
export const humanize = (s: string) => s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
/** The last `n` months as YYYY-MM, oldest first. */
export const lastMonths = (n: number): string[] => {
    const out: string[] = [];
    const d = new Date(); d.setDate(1);
    for (let i = n - 1; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`); }
    return out;
};
export const toneForScore = (score: number): Tone => (score >= 80 ? 'emerald' : score >= 65 ? 'amber' : 'red');
/** High / moderate / low risk, the Beta page's three. */
export const riskTone = (label: string): Tone => (/high/i.test(label) ? 'red' : /moderate|medium/i.test(label) ? 'amber' : 'emerald');

// ── Layouts ──

/** Small: one big figure, something glanceable beside it, one line under. */
export function Glance({ big, aside, foot, className }: { big: ReactNode; aside?: ReactNode; foot?: ReactNode; className?: string }) {
    return (
        <div className={cn('flex h-full min-h-0 flex-col px-3 py-2.5', className)}>
            <div className="flex min-h-0 flex-1 items-center gap-3">
                <div className="min-w-0 flex-1">{big}</div>
                {aside && <div className="shrink-0">{aside}</div>}
            </div>
            {foot && <div className="shrink-0 pt-1">{foot}</div>}
        </div>
    );
}
/** Medium: the figure on the left, a chart or short list on the right — stacked when the card is narrow. */
export function Split({ left, right, leftWidth = '9rem', className }: { left: ReactNode; right: ReactNode; leftWidth?: string; className?: string }) {
    return (
        <div className={cn('grid h-full min-h-0 grid-cols-1 grid-rows-[auto_1fr] gap-3 px-3 py-2.5 @md:grid-cols-[var(--lw)_1fr] @md:grid-rows-1', className)} style={{ ['--lw' as string]: leftWidth }}>
            <div className="flex min-h-0 flex-col">{left}</div>
            <div className="flex min-h-0 flex-col">{right}</div>
        </div>
    );
}
/** Large: a figures strip, then two blocks side by side — stacked when the card is narrow. */
export function Stack({ strip, main, side, foot }: { strip?: ReactNode; main: ReactNode; side?: ReactNode; foot?: ReactNode }) {
    return (
        <div className="flex h-full min-h-0 flex-col gap-2 px-3 py-2.5">
            {strip}
            <div className={cn('grid min-h-0 flex-1 gap-3', side ? 'grid-cols-1 @md:grid-cols-2' : 'grid-cols-1')}>
                {main}
                {side}
            </div>
            {foot}
        </div>
    );
}
/** Wide: a figures strip, then up to three blocks; the third shows once the card is wide enough for it. */
export function Wide({ strip, blocks, foot }: { strip?: ReactNode; blocks: ReactNode[]; foot?: ReactNode }) {
    return (
        <div className="flex h-full min-h-0 flex-col gap-2 px-3 py-2.5">
            {strip}
            <div className={cn('grid min-h-0 flex-1 gap-3', blocks.length >= 3 ? 'grid-cols-1 @md:grid-cols-2 @2xl:grid-cols-3' : blocks.length === 2 ? 'grid-cols-1 @md:grid-cols-2' : 'grid-cols-1')}>
                {blocks.map((b, i) => <div key={i} className={cn('flex min-h-0 flex-col', i === 2 && 'hidden @2xl:flex')}>{b}</div>)}
            </div>
            {foot}
        </div>
    );
}
/** A labelled block inside a layout. */
export function Block({ title, children, className, right }: { title?: ReactNode; children: ReactNode; className?: string; right?: ReactNode }) {
    return (
        <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
            {(title || right) && (
                <div className="mb-1 flex shrink-0 items-center justify-between gap-2">
                    <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
                    {right}
                </div>
            )}
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
    );
}

// ── Figures ──

export function Big({ value, label, tone = 'slate', sub, size = 'md', color }: { value: ReactNode; label: string; tone?: Tone; sub?: ReactNode; size?: 'md' | 'lg'; color?: string }) {
    return (
        <div className="min-w-0">
            <p className="truncate text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className={cn('truncate font-bold leading-none tabular-nums', size === 'lg' ? 'text-[34px]' : 'text-[28px]', !color && TONE[tone].text)} style={color ? { color } : undefined}>{value}</p>
            {sub && <p className="mt-1 truncate text-[11px] text-slate-500">{sub}</p>}
        </div>
    );
}
export function Mini({ value, label, tone = 'slate' }: { value: ReactNode; label: string; tone?: Tone }) {
    return (
        <div className="min-w-0">
            <p className="truncate text-[10px] text-slate-500">{label}</p>
            <p className={cn('truncate text-[13px] font-bold tabular-nums', TONE[tone].text)}>{value}</p>
        </div>
    );
}
export interface StripFigure { label: string; value: ReactNode; tone?: Tone; sub?: string }
export function Strip({ figures, cols }: { figures: StripFigure[]; cols?: number }) {
    const n = cols ?? Math.min(6, figures.length);
    return (
        <div className="grid shrink-0 grid-cols-3 gap-2 @md:grid-cols-[repeat(var(--n),minmax(0,1fr))]" style={{ ['--n' as string]: String(n) }}>
            {figures.map((f) => (
                <div key={f.label} className="min-w-0 rounded-lg bg-slate-50 px-2.5 py-1.5" title={f.sub}>
                    <p className="truncate text-[9.5px] font-semibold uppercase tracking-wider text-slate-500">{f.label}</p>
                    <p className={cn('truncate text-[17px] font-bold leading-tight tabular-nums', TONE[f.tone ?? 'slate'].text)}>{f.value}</p>
                    {f.sub && <p className="truncate text-[10px] text-slate-400">{f.sub}</p>}
                </div>
            ))}
        </div>
    );
}
export function Pill({ children, tone = 'slate', className }: { children: ReactNode; tone?: Tone; className?: string }) {
    return <span className={cn('inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide', TONE[tone].soft, className)}>{children}</span>;
}
export function Note({ children }: { children: ReactNode }) {
    return <p className="shrink-0 truncate text-[10.5px] text-slate-400">{children}</p>;
}
export function Empty({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('flex min-h-[3rem] flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 px-3 text-center text-[11.5px] text-slate-400', className)}>{children}</div>;
}
/** Chips that pick one of a few — a filter inside a block. */
export function Chips<T extends string>({ value, onChange, choices, size = 'sm' }: { value: T; onChange: (v: T) => void; choices: { id: T; label: string; count?: number }[]; size?: 'sm' | 'xs' }) {
    return (
        <div className="flex flex-wrap items-center gap-1">
            {choices.map((c) => (
                <button key={c.id} type="button" onClick={() => onChange(c.id)}
                    className={cn('inline-flex items-center gap-1 rounded-full border font-semibold transition-colors', size === 'xs' ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-[11px]',
                        value === c.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
                    {c.label}{c.count !== undefined && <span className={cn('tabular-nums', value === c.id ? 'text-slate-300' : 'text-slate-400')}>{c.count}</span>}
                </button>
            ))}
        </div>
    );
}

// ── SVG pieces ──

/** A progress ring with the figure in the middle. */
export function Ring({ value, max, tone = 'blue', size = 64, stroke = 6, label, sub, color }: { value: number; max: number; tone?: Tone; size?: number; stroke?: number; label?: ReactNode; sub?: ReactNode; color?: string }) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const frac = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
    const col = color ?? HEX[tone];
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c * frac} ${c}`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                <span className={cn('font-bold tabular-nums', size >= 80 ? 'text-lg' : 'text-[13px]')} style={{ color: col }}>{label ?? `${Math.round(frac * 100)}%`}</span>
                {sub && <span className="mt-0.5 text-[9px] text-slate-400">{sub}</span>}
            </div>
        </div>
    );
}
/** A half-dial gauge for a score, coloured by its band. */
export function Gauge({ value, max = 100, tone, color, width = 120, label, caption }: { value: number; max?: number; tone?: Tone; color?: string; width?: number; label?: ReactNode; caption?: ReactNode }) {
    const col = color ?? HEX[tone ?? 'blue'];
    const stroke = Math.max(8, Math.round(width / 11));
    const r = width / 2 - stroke;
    const c = Math.PI * r;
    const frac = Math.max(0, Math.min(1, value / max));
    const h = width / 2 + stroke / 2 + 4;
    return (
        <div className="flex shrink-0 flex-col items-center" style={{ width }}>
            <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
                <path d={`M ${stroke} ${h - 4} A ${r} ${r} 0 0 1 ${width - stroke} ${h - 4}`} fill="none" stroke="#f1f5f9" strokeWidth={stroke} strokeLinecap="round" />
                <path d={`M ${stroke} ${h - 4} A ${r} ${r} 0 0 1 ${width - stroke} ${h - 4}`} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c * frac} ${c}`} />
            </svg>
            <div className="-mt-7 text-center leading-none">
                <span className={cn('block font-bold tabular-nums', width >= 140 ? 'text-3xl' : 'text-2xl')} style={{ color: col }}>{label ?? value}</span>
                {caption && <span className="mt-1 block text-[10px] font-semibold" style={{ color: col }}>{caption}</span>}
            </div>
        </div>
    );
}
export interface Part { label: string; value: number; tone: Tone }
/** One bar split into its parts, with a legend. */
export function Segments({ parts, legend = true, height = 8, className }: { parts: Part[]; legend?: boolean; height?: number; className?: string }) {
    const total = parts.reduce((s, p) => s + p.value, 0);
    return (
        <div className={cn('min-w-0', className)}>
            <div className="flex w-full overflow-hidden rounded-full bg-slate-100" style={{ height }}>
                {total > 0 && parts.filter((p) => p.value > 0).map((p) => (
                    <div key={p.label} className={TONE[p.tone].bg} style={{ width: `${(p.value / total) * 100}%` }} title={`${p.label}: ${p.value}`} />
                ))}
            </div>
            {legend && (
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    {parts.map((p) => (
                        <span key={p.label} className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                            <span className={cn('h-1.5 w-1.5 rounded-full', TONE[p.tone].bg)} />{p.label} <span className="font-bold tabular-nums text-slate-700">{p.value}</span>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
/** Horizontal bars, label left, figure right. */
export function HBars({ rows, max, format = fmtN, dense }: { rows: { label: string; value: number; tone?: Tone; sub?: string }[]; max?: number; format?: (v: number) => string; dense?: boolean }) {
    const top = max ?? Math.max(1, ...rows.map((r) => r.value));
    return (
        <div className={cn('flex min-h-0 flex-col overflow-hidden', dense ? 'gap-0.5' : 'gap-1')}>
            {rows.map((r) => (
                <div key={r.label} className="flex items-center gap-2 text-[11px]">
                    <span className="w-[5.5rem] shrink-0 truncate text-slate-600" title={r.sub ? `${r.label} · ${r.sub}` : r.label}>{r.label}</span>
                    <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <span className={cn('block h-full rounded-full', TONE[r.tone ?? 'blue'].bg)} style={{ width: `${Math.max(r.value > 0 ? 3 : 0, (r.value / top) * 100)}%` }} />
                    </span>
                    <span className="w-10 shrink-0 text-right font-semibold tabular-nums text-slate-700">{format(r.value)}</span>
                </div>
            ))}
        </div>
    );
}
/** A thin progress bar. */
export function Progress({ value, max, tone = 'blue', className }: { value: number; max: number; tone?: Tone; className?: string }) {
    return (
        <span className={cn('block h-1.5 w-full overflow-hidden rounded-full bg-slate-100', className)}>
            <span className={cn('block h-full rounded-full', TONE[tone].bg)} style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }} />
        </span>
    );
}
/** A funnel — each stage a centred bar, narrowing. */
export function Funnel({ stages }: { stages: Part[] }) {
    const top = Math.max(1, ...stages.map((s) => s.value));
    return (
        <div className="flex min-h-0 flex-col justify-center gap-1 overflow-hidden">
            {stages.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-[11px]">
                    <span className="w-[5.5rem] shrink-0 truncate text-slate-600">{s.label}</span>
                    <span className="flex min-w-0 flex-1 justify-center">
                        <span className={cn('block h-3.5 rounded', TONE[s.tone].bg)} style={{ width: `${Math.max(s.value > 0 ? 8 : 2, (s.value / top) * 100)}%`, opacity: s.value > 0 ? 1 : 0.25 }} />
                    </span>
                    <span className="w-6 shrink-0 text-right font-bold tabular-nums text-slate-700">{s.value}</span>
                </div>
            ))}
        </div>
    );
}
export function Dots({ parts, size = 10 }: { parts: Part[]; size?: number }) {
    return (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {parts.map((p) => (
                <span key={p.label} className="inline-flex items-center gap-1 text-[10px] text-slate-500" title={p.label}>
                    <span className={cn('rounded-full', TONE[p.tone].bg)} style={{ width: size, height: size }} />
                    <span className="font-bold tabular-nums text-slate-700">{p.value}</span>
                </span>
            ))}
        </div>
    );
}

// ── recharts pieces ──

/** A thick donut, the total in the hole, a legend with shares beside it — the Beta page's look. */
export function Donut({ parts, size = 110, label, sub = 'Total', legend = true, thickness, onPick, active }: { parts: Part[]; size?: number; label?: ReactNode; sub?: string; legend?: boolean; thickness?: number; onPick?: (label: string) => void; active?: string }) {
    const data = parts.filter((p) => p.value > 0);
    const total = parts.reduce((s, p) => s + p.value, 0);
    const th = thickness ?? Math.round(size * 0.17);
    return (
        <div className="flex min-h-0 items-center gap-3">
            <div className="relative shrink-0" style={{ width: size, height: size }}>
                {total > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={size / 2 - th} outerRadius={size / 2} paddingAngle={data.length > 1 ? 2 : 0} stroke="none" isAnimationActive={false}
                                onClick={onPick ? (d: { label?: string }) => d.label && onPick(d.label) : undefined} style={onPick ? { cursor: 'pointer' } : undefined}>
                                {data.map((p) => <Cell key={p.label} fill={HEX[p.tone]} opacity={active && active !== p.label ? 0.35 : 1} />)}
                            </Pie>
                            <Tooltip contentStyle={TT} formatter={(v) => [`${fmtN(Number(v))} · ${pct(Number(v), total)}%`, '']} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <svg width={size} height={size}><circle cx={size / 2} cy={size / 2} r={size / 2 - th / 2} fill="none" stroke="#f1f5f9" strokeWidth={th} /></svg>
                )}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center leading-none">
                    <span className={cn('font-black tabular-nums text-slate-900', size >= 120 ? 'text-2xl' : size >= 100 ? 'text-xl' : 'text-[15px]')}>{label ?? fmtN(total)}</span>
                    {sub && <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">{sub}</span>}
                </div>
            </div>
            {legend && (
                <ul className="min-w-0 flex-1 space-y-0.5">
                    {parts.map((p) => (
                        <li key={p.label} className={cn('flex items-center gap-1.5 text-[11px]', onPick && 'cursor-pointer', active && active !== p.label && 'opacity-50')} onClick={onPick ? () => onPick(p.label) : undefined}>
                            <span className={cn('h-2 w-2 shrink-0 rounded-sm', TONE[p.tone].bg)} />
                            <span className="min-w-0 flex-1 truncate text-slate-600">{p.label}</span>
                            <span className="font-bold tabular-nums text-slate-800">{p.value}</span>
                            <span className="w-8 text-right text-[10px] tabular-nums text-slate-400">{total ? `${pct(p.value, total)}%` : ''}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
export interface Series { key: string; name: string; tone: Tone; stack?: string }
/** Vertical bars by category, one or more series. */
export function Columns({ data, series, height, format = fmtN, yFormat }: { data: Record<string, string | number>[]; series: Series[]; height: number; format?: (v: number) => string; yFormat?: (v: number) => string }) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={TICK} interval="preserveStartEnd" />
                <YAxis axisLine={false} tickLine={false} tick={TICK} allowDecimals={false} tickFormatter={yFormat ?? fmtK} width={38} />
                <Tooltip contentStyle={TT} cursor={{ fill: '#f8fafc' }} formatter={(v, name) => [format(Number(v)), String(name)]} />
                {series.map((s, i) => (
                    <Bar key={s.key} dataKey={s.key} name={s.name} stackId={s.stack} fill={HEX[s.tone]} radius={i === series.length - 1 || !s.stack ? [4, 4, 0, 0] : [0, 0, 0, 0]} isAnimationActive={false} maxBarSize={28} />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}
/** Horizontal bars by category (recharts), for long labels. */
export function Rows2({ data, series, height, format = fmtN }: { data: Record<string, string | number>[]; series: Series[]; height: number; format?: (v: number) => string }) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
                <CartesianGrid horizontal={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={TICK} allowDecimals={false} tickFormatter={fmtK} />
                <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} tick={{ ...TICK, fill: '#475569' }} width={78} />
                <Tooltip contentStyle={TT} cursor={{ fill: '#f8fafc' }} formatter={(v, name) => [format(Number(v)), String(name)]} />
                {series.map((s, i) => (
                    <Bar key={s.key} dataKey={s.key} name={s.name} stackId={s.stack} fill={HEX[s.tone]} radius={i === series.length - 1 || !s.stack ? [0, 4, 4, 0] : [0, 0, 0, 0]} isAnimationActive={false} maxBarSize={16} />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}
/** An area over time. */
export function Trend({ data, tone = 'blue', height, format = fmtN, name = 'Value', reference, color }: { data: { label: string; value: number }[]; tone?: Tone; height: number; format?: (v: number) => string; name?: string; reference?: number; color?: string }) {
    const col = color ?? HEX[tone];
    const id = `g-${col.replace('#', '')}`;
    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -18 }}>
                <defs>
                    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={col} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={col} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={TICK} interval="preserveStartEnd" />
                <YAxis axisLine={false} tickLine={false} tick={TICK} tickFormatter={fmtK} width={38} domain={reference !== undefined ? [0, 100] : undefined} />
                <Tooltip contentStyle={TT} formatter={(v) => [format(Number(v)), name]} />
                <Area type="monotone" dataKey="value" name={name} stroke={col} strokeWidth={2} fill={`url(#${id})`} dot={false} isAnimationActive={false} />
            </AreaChart>
        </ResponsiveContainer>
    );
}
/** A sparkline — no axes, no grid. */
export function Spark({ data, tone = 'blue', height = 36, width = 96 }: { data: number[]; tone?: Tone; height?: number; width?: number | string }) {
    const pts = data.map((v, i) => ({ i, v }));
    const id = `s-${tone}`;
    return (
        <div style={{ width, height }} className="shrink-0">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pts} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={HEX[tone]} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={HEX[tone]} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke={HEX[tone]} strokeWidth={1.5} fill={`url(#${id})`} dot={false} isAnimationActive={false} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
/** A radar — one value per axis, out of 100. */
export function RadarChartBlock({ data, tone = 'emerald', height, color }: { data: { axis: string; value: number }[]; tone?: Tone; height: number; color?: string }) {
    const col = color ?? HEX[tone];
    return (
        <ResponsiveContainer width="100%" height={height}>
            <RadarChart data={data} outerRadius="72%" margin={{ top: 6, right: 12, bottom: 2, left: 12 }}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 9.5, fill: '#64748b', fontWeight: 600 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke={col} fill={col} fillOpacity={0.22} strokeWidth={2} isAnimationActive={false} />
                <Tooltip contentStyle={TT} formatter={(v) => [`${v}`, 'Score']} />
            </RadarChart>
        </ResponsiveContainer>
    );
}

// ── Lists ──

export interface RowItem {
    id: string; label: ReactNode; sub?: ReactNode; right?: ReactNode; tone?: Tone; lead?: ReactNode; title?: string;
    /** Opens the record itself — drawn as the go-to arrow at the end of the row. */
    onOpen?: () => void;
    /** Further one-click actions (upload, ask in chat), drawn before the arrow. */
    actions?: { label: string; Icon: typeof ArrowUpRight; onClick: () => void; tone?: Tone }[];
}
/** A short list: a dot or a lead, two lines, something on the right, the go-to arrow. */
export function Rows({ items, dense, className }: { items: RowItem[]; dense?: boolean; className?: string }) {
    return (
        <ul className={cn('min-h-0 flex-1 divide-y divide-slate-50 overflow-hidden', className)}>
            {items.map((r) => (
                <li key={r.id} className={cn('group/row flex items-center gap-2', dense ? 'py-1' : 'py-1.5')} title={r.title}>
                    {r.lead ?? <span className={cn('mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full', TONE[r.tone ?? 'slate'].bg)} />}
                    <button type="button" onClick={r.onOpen} disabled={!r.onOpen} className="min-w-0 flex-1 text-left disabled:cursor-default">
                        <span className="block truncate text-[12px] font-semibold text-slate-800">{r.label}</span>
                        {r.sub && !dense && <span className="block truncate text-[10.5px] text-slate-500">{r.sub}</span>}
                    </button>
                    {r.right}
                    {r.actions?.map((a) => (
                        <button key={a.label} type="button" onClick={a.onClick} title={a.label} aria-label={a.label}
                            className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white hover:border-slate-300', TONE[a.tone ?? 'blue'].text)}>
                            <a.Icon size={12} />
                        </button>
                    ))}
                    {r.onOpen && (
                        <button type="button" onClick={r.onOpen} title="Go to" aria-label="Go to"
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-300 hover:bg-blue-50 hover:text-blue-600 group-hover/row:text-slate-500">
                            <ArrowUpRight size={13} />
                        </button>
                    )}
                </li>
            ))}
        </ul>
    );
}
/** A list with a rail — for things that happened, newest first. */
export function Timeline({ items }: { items: { id: string; label: ReactNode; sub?: ReactNode; when: string; tone?: Tone; onOpen?: () => void }[] }) {
    return (
        <ol className="relative min-h-0 flex-1 overflow-hidden border-l border-slate-100 pl-3">
            {items.map((e) => (
                <li key={e.id} className="relative py-1">
                    <span className={cn('absolute -left-[0.95rem] top-2 h-2 w-2 rounded-full ring-2 ring-white', TONE[e.tone ?? 'slate'].bg)} />
                    <button type="button" onClick={e.onOpen} className="group/row flex w-full items-start gap-2 text-left">
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] font-semibold text-slate-800">{e.label}</span>
                            {e.sub && <span className="block truncate text-[10.5px] text-slate-500">{e.sub}</span>}
                        </span>
                        <span className="shrink-0 text-[10px] tabular-nums text-slate-400">{e.when}</span>
                        {e.onOpen && <ArrowUpRight size={12} className="mt-0.5 shrink-0 text-slate-300 group-hover/row:text-blue-600" />}
                    </button>
                </li>
            ))}
        </ol>
    );
}
export function Avatar({ name, tone = 'blue', size = 24, className }: { name: string; tone?: Tone; size?: number; className?: string }) {
    return (
        <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white', TONE[tone].bg, className)} style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>
            {initials(name)}
        </span>
    );
}
export function AvatarStack({ names, max = 4, tone = 'blue' }: { names: string[]; max?: number; tone?: Tone }) {
    const shown = names.slice(0, max);
    return (
        <span className="inline-flex items-center">
            {shown.map((n, i) => <Avatar key={`${n}-${i}`} name={n} tone={tone} size={22} className={cn('ring-2 ring-white', i > 0 && '-ml-1.5')} />)}
            {names.length > max && <span className="-ml-1.5 inline-flex h-[22px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[9px] font-bold text-slate-600 ring-2 ring-white">+{names.length - max}</span>}
        </span>
    );
}

// ── A month of days ──
export type CalTone = 'red' | 'amber' | 'blue' | 'slate';
export const CAL_RANK: Record<CalTone, number> = { slate: 0, blue: 1, amber: 2, red: 3 };
export const CAL_CELL: Record<CalTone, string> = { red: 'bg-red-500 text-white', amber: 'bg-amber-400 text-white', blue: 'bg-blue-400 text-white', slate: 'bg-slate-300 text-slate-700' };
export const toneForDays = (d: number | null): CalTone => (d === null ? 'slate' : d < 0 ? 'red' : d <= 30 ? 'amber' : d <= 90 ? 'blue' : 'slate');
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** One month, seven across, each day coloured by the worst thing due on it. */
export function MonthGrid({ year, month, days, selected, onSelect, compact }: {
    year: number; month: number;
    /** YYYY-MM-DD → { tone, count } for the days that have something. */
    days: Map<string, { tone: CalTone; count: number }>;
    selected?: string | null; onSelect?: (key: string) => void; compact?: boolean;
}) {
    const first = new Date(year, month, 1);
    const lead = (first.getDay() + 6) % 7; // Monday first
    const count = new Date(year, month + 1, 0).getDate();
    const today = ymd(new Date());
    const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => ymd(new Date(year, month, i + 1)))];
    while (cells.length % 7) cells.push(null);
    return (
        <div className="min-w-0">
            <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] font-bold uppercase tracking-wider text-slate-400">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
            </div>
            <div className={cn('mt-0.5 grid grid-cols-7', compact ? 'gap-0.5' : 'gap-1')}>
                {cells.map((key, i) => {
                    if (!key) return <span key={`e${i}`} />;
                    const d = days.get(key);
                    const isToday = key === today;
                    const isSel = key === selected;
                    return (
                        <button key={key} type="button" onClick={onSelect ? () => onSelect(key) : undefined} title={d ? `${shortDate(key)} · ${d.count} due` : shortDate(key)}
                            className={cn('relative flex items-center justify-center rounded text-[10px] font-semibold tabular-nums transition-colors', compact ? 'h-5' : 'h-6',
                                d ? CAL_CELL[d.tone] : 'text-slate-500 hover:bg-slate-100', isToday && !d && 'ring-1 ring-blue-500', isSel && 'ring-2 ring-slate-900', !onSelect && 'cursor-default')}>
                            {Number(key.slice(8))}
                            {d && d.count > 1 && !compact && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-slate-900 px-1 text-[8px] font-bold leading-[12px] text-white">{d.count}</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
