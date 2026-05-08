import { cn } from '@/lib/utils';
import {
    type SafetySourceKey,
    getSourceLabel,
    getSourceTone,
} from '@/data/safety-records';

type SourceSubTabsProps = {
    /** All sourceKeys to render as chips, in order. */
    sourceKeys: SafetySourceKey[];
    /** Currently active key. */
    activeKey: SafetySourceKey;
    /** Counts keyed by sourceKey — drives the badge on each chip. */
    counts: Record<SafetySourceKey, number>;
    onChange: (key: SafetySourceKey) => void;
    className?: string;
};

/**
 * Sub-panel switcher used inside the safety tabs. Renders one chip per
 * sourceKey present in the current event set — so a carrier with NSC
 * enrolment in BC and AB sees `NSC · BC` and `NSC · AB` chips, not a
 * single ambiguous `NSC` chip.
 *
 * Chip tone follows the base source (CVOR → rose, NSC → blue, FMCSA →
 * amber), so per-jurisdiction NSC chips read as variations of the same
 * blue family.
 */
export function SourceSubTabs({ sourceKeys, activeKey, counts, onChange, className }: SourceSubTabsProps) {
    if (sourceKeys.length === 0) return null;
    return (
        <div className={cn('flex items-center gap-2 flex-wrap', className)}>
            {sourceKeys.map((key) => {
                const active = activeKey === key;
                const tone = getSourceTone(key);
                const count = counts[key] ?? 0;
                return (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onChange(key)}
                        className={cn(
                            'inline-flex items-center gap-2 h-8 px-3 rounded-full text-xs font-bold uppercase tracking-wider border transition-colors',
                            active ? tone.active : `bg-white ${tone.idle}`
                        )}
                        aria-pressed={active}
                    >
                        {getSourceLabel(key)}
                        <span
                            className={cn(
                                'inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-full text-[10px] font-bold tabular-nums',
                                active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                            )}
                        >
                            {count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
