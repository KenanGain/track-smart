import { Filter, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResetFilters } from "@/components/ui/ListChrome";

// One status pill: coloured dot, label, count. Greyed (still pressable when on) at zero.
function StatusPill({ label, count, dot, on, onClick }: { label: string; count: number; dot?: string; on: boolean; onClick: () => void }) {
    const dead = count === 0 && !on;
    return (
        <button type="button" onClick={onClick} disabled={dead} aria-pressed={on}
            className={cn("inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[12px] font-semibold transition-colors",
                on ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                    : dead ? "cursor-not-allowed border-slate-100 bg-white text-slate-300"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50")}>
            {dot && <span className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-white" : dead ? "bg-slate-200" : dot)} />}
            {label}
            <span className={cn("rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                on ? "bg-white/20 text-white" : dead ? "text-slate-300" : "bg-slate-100 text-slate-500")}>{count}</span>
        </button>
    );
}

// The sticky header of the Hiring and Onboarding lists: the list's name and count, a
// search box that can be cleared in one click, and the status chips — each carrying the
// number it would show, so the row reads before it is pressed.
//
// Sticky at the top of the page scroll. z-20 so the stepper bubbles in the rows below
// (z-10) slide under it rather than over it.
export function ListHeader({ title, count, total, query, onQuery, placeholder, chips, chip, onChip, allCount, onReset, chipsLabel = "Status", extra }: {
    title: string;
    /** Rows after search + filter. */
    count: number;
    /** Rows after search only — shown as "of N" once a filter narrows it. */
    total: number;
    query: string; onQuery: (v: string) => void; placeholder: string;
    /** `dot` is the status colour the rows use (e.g. "bg-amber-500"), so a pill reads as that status. */
    chips: { id: string; label: string; count: number; dot?: string }[];
    chip: string; onChip: (id: string) => void;
    allCount: number;
    onReset?: () => void;
    /** What the pills filter by — "Status" unless the list is filtered by something else. */
    chipsLabel?: string;
    /** A control beside the search box — a second filter, an Add button. */
    extra?: React.ReactNode;
}) {
    return (
        <div className="sticky top-0 z-20 rounded-t-xl border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
            <div className="flex flex-col gap-3 px-5 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-slate-800">
                    {title}
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-500">
                        {count}{count !== total ? ` of ${total}` : ""}
                    </span>
                </p>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                {extra}
                <div className="relative w-full sm:w-80">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder={placeholder}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    {query && (
                        <button type="button" onClick={() => onQuery("")} aria-label="Clear search"
                            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200/70 hover:text-slate-600">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
                </div>
            </div>
            {/* Status filter — pills that wrap onto a second line rather than scroll, so the
                first one ("All") can never be cut off at the edge. */}
            <div className="flex flex-wrap items-center gap-1.5 px-5 py-3">
                <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400"><Filter className="h-3.5 w-3.5" /> {chipsLabel}</span>
                <StatusPill label="All" count={allCount} on={!chip} onClick={() => onChip("")} />
                {chips.map((c) => (
                    <StatusPill key={c.id} label={c.label} count={c.count} dot={c.dot} on={chip === c.id} onClick={() => onChip(chip === c.id ? "" : c.id)} />
                ))}
                {onReset && <span className="ml-auto"><ResetFilters on onReset={onReset} /></span>}
            </div>
        </div>
    );
}
