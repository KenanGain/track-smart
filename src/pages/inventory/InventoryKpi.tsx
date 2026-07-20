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
export function KpiTile({ label, value, Icon, accent }: {
    label: string;
    value: number | string;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    accent: KpiAccent;
}) {
    const cls = ACCENT_CLS[accent];
    return (
        <div className={cn(
            "bg-white border border-slate-200 border-l-4 rounded-xl p-3 shadow-sm flex items-center justify-between gap-3",
            cls.border,
        )}>
            <div className="min-w-0">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-2", cls.iconBg)}>
                    <Icon size={14} className={cls.iconColor} />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">{label}</div>
            </div>
            <div className="text-2xl font-black tabular-nums text-slate-900 leading-none">{value}</div>
        </div>
    );
}
