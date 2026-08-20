import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Shared KPI stat card — the "New / Default Compliance & Documents" tile look:
 * label + big number on the left, a rounded icon square on the right, on a clean
 * white bordered card. Optionally clickable (used as a status filter) with an
 * active ring, so a page can keep its filter-on-click behaviour while matching
 * the catalog page's visual style.
 */

type AccentTone = { icon: string; ring: string };

const ACCENT: Record<string, AccentTone> = {
    slate:   { icon: "text-slate-500 bg-slate-100",   ring: "ring-slate-400/40" },
    blue:    { icon: "text-blue-600 bg-blue-50",      ring: "ring-blue-500/40" },
    emerald: { icon: "text-emerald-600 bg-emerald-50", ring: "ring-emerald-500/40" },
    rose:    { icon: "text-rose-600 bg-rose-50",      ring: "ring-rose-500/40" },
    amber:   { icon: "text-amber-600 bg-amber-50",    ring: "ring-amber-500/40" },
    sky:     { icon: "text-sky-600 bg-sky-50",        ring: "ring-sky-500/40" },
    red:     { icon: "text-red-600 bg-red-50",        ring: "ring-red-500/40" },
    violet:  { icon: "text-violet-600 bg-violet-50",  ring: "ring-violet-500/40" },
};

export function KpiStatCard({
    label,
    value,
    Icon,
    accent = "slate",
    active,
    onClick,
    className,
}: {
    label: string;
    value: string | number;
    Icon: React.ElementType;
    accent?: string;
    /** When set, the card highlights with an accent ring (e.g. selected filter). */
    active?: boolean;
    /** When provided the card renders as a button (used as a status filter). */
    onClick?: () => void;
    className?: string;
}) {
    const t = ACCENT[accent] ?? ACCENT.slate;
    const cls = cn(
        "bg-white border rounded-xl shadow-sm px-4 py-3.5 flex items-center justify-between gap-3 text-left transition-all",
        onClick && "hover:shadow hover:border-slate-300",
        active ? cn("ring-2 border-transparent", t.ring) : "border-slate-200",
        className,
    );
    const body = (
        <>
            <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">{label}</div>
                <div className="mt-0.5 text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
            </div>
            <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", t.icon)}>
                <Icon size={18} />
            </div>
        </>
    );
    return onClick ? (
        <button type="button" onClick={onClick} className={cls} aria-pressed={active}>
            {body}
        </button>
    ) : (
        <div className={cls}>{body}</div>
    );
}
