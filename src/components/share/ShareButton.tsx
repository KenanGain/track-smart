import { Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// ShareButton — the one "Share to chat" button every record page wears.
//
// Tickets, drivers, assets, accidents, inspections and safety events each had their
// own share button: a different height, a different label ("Share", "Share to chat"),
// a different weight, and on one page it was blue. The dialog behind them is the same
// `ShareToChat`, so the button in front of it is now the same too. Pages pass only the
// click; the look is not theirs to vary.
// ─────────────────────────────────────────────────────────────────────────────

export function ShareButton({ onClick, className, compact, label = 'Share to chat' }: {
    onClick: () => void;
    className?: string;
    /** The condensed-header height. */
    compact?: boolean;
    label?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            aria-label={label}
            className={cn(
                'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]',
                compact ? 'h-8' : 'h-9',
                className,
            )}
        >
            <Share2 className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}
