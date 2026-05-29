import { cn } from '@/lib/utils';

export interface DataChipItem {
    label: string;
    /** The entered/captured value, if any. */
    value?: string;
    /** When true and there's no value, the chip reads as a missing requirement. */
    required?: boolean;
}

/**
 * Compact labelled chips that surface the captured compliance data
 * (Value / Expiry / Issue date / State / Country) in a list row, so the end
 * user can see what's been entered at a glance. A chip with no value shows a
 * muted "Not set" (amber when it's a missing requirement).
 */
export function ComplianceDataChips({ items, className }: { items: DataChipItem[]; className?: string }) {
    if (items.length === 0) return null;
    return (
        <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
            {items.map(it => {
                const filled = !!it.value?.toString().trim();
                return (
                    <span
                        key={it.label}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] leading-none",
                            filled
                                ? "border-slate-200 bg-slate-50 text-slate-700"
                                : it.required
                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                    : "border-slate-200 bg-white text-slate-400",
                        )}
                    >
                        <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{it.label}</span>
                        <span className="font-medium">{filled ? it.value : 'Not set'}</span>
                    </span>
                );
            })}
        </div>
    );
}
