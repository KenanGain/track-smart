import { cn } from "@/lib/utils";

// KPI accents — shared with the carrier-compliance list style.
const ACCENT_CLS = {
    red:     { border: "border-l-red-500",     iconBg: "bg-red-50",     iconColor: "text-red-600" },
    orange:  { border: "border-l-orange-500",  iconBg: "bg-orange-50",  iconColor: "text-orange-600" },
    amber:   { border: "border-l-amber-500",   iconBg: "bg-amber-50",   iconColor: "text-amber-600" },
    blue:    { border: "border-l-blue-500",    iconBg: "bg-blue-50",    iconColor: "text-blue-600" },
    violet:  { border: "border-l-violet-500",  iconBg: "bg-violet-50",  iconColor: "text-violet-600" },
    emerald: { border: "border-l-emerald-500", iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    slate:   { border: "border-l-slate-400",   iconBg: "bg-slate-100",  iconColor: "text-slate-600" },
} as const;

export type KpiAccent = keyof typeof ACCENT_CLS;

/** KPI tile matching the carrier-compliance list: left accent bar, tinted icon
 *  chip, uppercase label, big value. Shared across the inventory pages. */
export function KpiTile({ label, value, Icon, accent, onClick, active }: {
    label: string;
    value: number | string;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    accent: KpiAccent;
    /** Given one, the tile becomes the filter for what it counts. */
    onClick?: () => void;
    active?: boolean;
}) {
    const cls = ACCENT_CLS[accent];
    // A div when it does nothing, a button when it does — rather than a div that happens to
    // have a click handler, which the keyboard cannot reach.
    const Tag = onClick ? "button" : "div";
    return (
        <Tag
            type={onClick ? "button" : undefined}
            onClick={onClick}
            aria-pressed={onClick ? !!active : undefined}
            className={cn(
                "bg-white border border-slate-200 border-l-4 rounded-xl p-3 shadow-sm flex items-center justify-between gap-3 text-left",
                cls.border,
                onClick && "transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
                active && "ring-2 ring-blue-500/40",
            )}
        >
            <div className="min-w-0">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-2", cls.iconBg)}>
                    <Icon size={14} className={cls.iconColor} />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">{label}</div>
            </div>
            <div className="text-2xl font-black tabular-nums text-slate-900 leading-none">{value}</div>
        </Tag>
    );
}
