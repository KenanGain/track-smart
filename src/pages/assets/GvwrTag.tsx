import React from 'react';
import { Scale } from 'lucide-react';
import { getGVWRClass, getGVWRCategory, type WeightUnit } from './gvwr.utils';

const cn = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');

interface GvwrTagProps {
    weight: number | null | undefined;
    unit: WeightUnit | null | undefined;
    /** Render the textual range (e.g. "26,001 – 33,000 lb") next to the pill. */
    showRange?: boolean;
    /** "sm" for inline form hints, "md" for detail rows. */
    size?: 'sm' | 'md';
    /** Text shown when no class can be resolved. */
    emptyLabel?: string;
    className?: string;
}

interface TierStyle {
    pill: string;
    dot: string;
    rangeText: string;
    category: string;
}

const TIERS: Record<'Light Duty' | 'Medium Duty' | 'Heavy Duty', TierStyle> = {
    'Light Duty': {
        pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        rangeText: 'text-emerald-700/70',
        category: 'Light Duty',
    },
    'Medium Duty': {
        pill: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        rangeText: 'text-amber-700/70',
        category: 'Medium Duty',
    },
    'Heavy Duty': {
        pill: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
        rangeText: 'text-rose-700/70',
        category: 'Heavy Duty',
    },
};

const SIZE_STYLES = {
    sm: {
        pill: 'px-2 py-0.5 text-[10px] gap-1.5',
        dot: 'h-1 w-1',
        icon: 10,
        range: 'text-[10px]',
    },
    md: {
        pill: 'px-2.5 py-1 text-[11px] gap-1.5',
        dot: 'h-1.5 w-1.5',
        icon: 11,
        range: 'text-[11px]',
    },
} as const;

export const GvwrTag: React.FC<GvwrTagProps> = ({
    weight,
    unit,
    showRange = true,
    size = 'md',
    emptyLabel = '—',
    className,
}) => {
    const cls = getGVWRClass(weight, unit);
    const tierKey = getGVWRCategory(weight, unit);
    const sizes = SIZE_STYLES[size];

    if (!cls || !tierKey) {
        return (
            <span className={cn('inline-flex items-center text-slate-400 font-semibold', sizes.range, className)}>
                {emptyLabel}
            </span>
        );
    }

    const tier = TIERS[tierKey];
    const range = unit === 'kg' ? cls.rangeKg : cls.rangeLb;

    return (
        <div className={cn('inline-flex items-center flex-wrap gap-2', className)}>
            <span
                className={cn(
                    'inline-flex items-center rounded-full border font-bold uppercase tracking-tight',
                    tier.pill,
                    sizes.pill,
                )}
                title={`${cls.label} · ${tier.category} · ${range}`}
            >
                <span className={cn('rounded-full', tier.dot, sizes.dot)} aria-hidden />
                <Scale size={sizes.icon} strokeWidth={2.5} className="opacity-80" />
                {cls.label}
            </span>
            {showRange && (
                <span className={cn('font-medium', tier.rangeText, sizes.range)}>
                    {range} <span className="text-slate-400 font-normal">·</span>{' '}
                    <span className="text-slate-500 font-semibold">{tier.category}</span>
                </span>
            )}
        </div>
    );
};

export default GvwrTag;
