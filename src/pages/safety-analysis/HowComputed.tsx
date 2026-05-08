/**
 * "How this is calculated" — small inline explainer block.
 *
 * Behavior:
 *   • If `collapsedByDefault` is false → the card starts open.
 *   • If `collapsedByDefault` is true → the card starts closed AND peeks open
 *     on hover (mouseover/focus). A click pins it open across mouseouts;
 *     a second click closes it again.
 *
 * Rationale: hover-to-peek + click-to-pin keeps methodology accessible
 * without adding visual clutter for users who don't need it.
 */

import { Sigma, ChevronDown, Pin } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface HowComputedProps {
    /** Short title shown next to the icon. */
    title?: string;
    /** Bullet-point steps describing the computation. */
    steps: Array<string | React.ReactNode>;
    /** Optional formula or pseudo-code shown in a monospace block. */
    formula?: string;
    /** Default-collapsed when true (still hover-peeks). */
    collapsedByDefault?: boolean;
    /** Tone — "neutral" (default blue), "muted" for unobtrusive sections. */
    tone?: 'neutral' | 'muted';
}

export function HowComputed({
    title = 'How this is calculated',
    steps,
    formula,
    collapsedByDefault = false,
    tone = 'neutral',
}: HowComputedProps) {
    // Two pieces of state:
    //   pinned — sticks open across hover-out (toggled by click).
    //   hover  — transient peek-open state.
    const [pinned, setPinned] = useState(!collapsedByDefault);
    const [hover, setHover] = useState(false);
    const open = pinned || hover;

    const toneClass = tone === 'muted'
        ? 'bg-slate-50 ring-slate-100'
        : 'bg-blue-50 ring-blue-100';
    const iconClass = tone === 'muted' ? 'text-slate-500' : 'text-blue-600';
    const titleClass = tone === 'muted' ? 'text-slate-700' : 'text-blue-900';
    const peekHint = tone === 'muted' ? 'text-slate-400' : 'text-blue-500';

    return (
        <div
            className={cn(
                'rounded-lg ring-1 px-4 py-3 transition-shadow',
                toneClass,
                open && 'shadow-sm',
            )}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onFocus={() => setHover(true)}
            onBlur={() => setHover(false)}
        >
            <button
                type="button"
                onClick={() => setPinned((p) => !p)}
                className="w-full flex items-center justify-between gap-2 text-left"
                aria-expanded={open}
                title={pinned ? 'Click to collapse' : 'Click to pin open'}
            >
                <div className="flex items-center gap-2">
                    <Sigma className={cn('w-4 h-4 shrink-0', iconClass)} />
                    <span className={cn('text-xs font-bold uppercase tracking-wider', titleClass)}>
                        {title}
                    </span>
                    {!pinned && !hover && (
                        <span className={cn('text-[10px] font-medium normal-case tracking-normal', peekHint)}>
                            (hover to preview · click to pin)
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    {pinned && (
                        <Pin
                            className={cn('w-3 h-3', iconClass)}
                            aria-label="Pinned"
                        />
                    )}
                    <ChevronDown
                        className={cn(
                            'w-4 h-4 transition-transform shrink-0',
                            iconClass,
                            open && 'rotate-180',
                        )}
                    />
                </div>
            </button>
            {open && (
                <div className="mt-2 space-y-1.5">
                    <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-700 leading-relaxed">
                        {steps.map((s, i) => (
                            <li key={i}>{s}</li>
                        ))}
                    </ol>
                    {formula && (
                        <pre className={cn(
                            'mt-2 p-2 rounded-md text-[11px] leading-relaxed font-mono whitespace-pre-wrap',
                            tone === 'muted' ? 'bg-white text-slate-700 ring-1 ring-slate-200'
                                : 'bg-white text-blue-900 ring-1 ring-blue-200',
                        )}>
                            {formula}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
}
