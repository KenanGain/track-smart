import * as React from "react";
import { Building2, Search, ChevronDown, Check, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type CarrierOption = {
    id: string;
    legalName: string;
    dbaName?: string;
    dotNumber?: string;
};

type Props = {
    selectedAccountId?: string;
    accounts: CarrierOption[];
    onSelect: (id: string) => void;
    /** Shown next to the selector to indicate the user's authority. */
    scopeLabel?: string;
    className?: string;
};

/**
 * Dropdown carrier switcher with search. Renders as a static label when only
 * a single account is available (e.g. a regular user scoped to one carrier).
 */
export function CarrierSwitcher({
    selectedAccountId,
    accounts,
    onSelect,
    scopeLabel,
    className,
}: Props) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const selected = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0];
    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return accounts;
        return accounts.filter(
            (a) =>
                a.legalName.toLowerCase().includes(q) ||
                (a.dbaName ?? "").toLowerCase().includes(q) ||
                (a.dotNumber ?? "").toLowerCase().includes(q)
        );
    }, [accounts, search]);

    // Single-carrier mode → static read-only label
    if (accounts.length <= 1) {
        return (
            <div className={cn(
                "inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white",
                className
            )}>
                <Building2 size={14} className="text-slate-400 shrink-0" />
                <span className="text-sm font-semibold text-slate-900 truncate max-w-[260px]">
                    {selected?.legalName ?? "—"}
                </span>
            </div>
        );
    }

    return (
        <div ref={ref} className={cn("relative", className)}>
            <button
                type="button"
                onClick={() => { setOpen((o) => !o); setSearch(""); }}
                className={cn(
                    "h-9 max-w-[320px] px-3 rounded-lg border bg-white shadow-sm transition-colors inline-flex items-center gap-2 cursor-pointer",
                    open ? "border-blue-500 ring-2 ring-blue-500/15" : "border-slate-200 hover:border-slate-300"
                )}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <Building2 size={14} className="text-slate-400 shrink-0" />
                <span className="text-sm font-semibold text-slate-900 truncate">
                    {selected?.legalName ?? "Select a carrier…"}
                </span>
                <ChevronDown
                    size={14}
                    className={cn("text-slate-400 transition-transform shrink-0 ml-auto", open && "rotate-180")}
                />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-[360px] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
                    {scopeLabel && (
                        <div className="px-3 py-2 border-b border-slate-100 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            <ShieldCheck size={12} className="text-violet-500" /> {scopeLabel}
                        </div>
                    )}
                    <div className="p-2 border-b border-slate-100">
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name, DBA, or DOT…"
                                autoFocus
                                className="w-full h-9 pl-8 pr-2 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    </div>
                    <div className="max-h-72 overflow-y-auto py-1" role="listbox">
                        {filtered.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-400">
                                No carriers match "{search}"
                            </div>
                        ) : (
                            filtered.map((a) => {
                                const isSelected = a.id === selectedAccountId;
                                const initials = a.legalName
                                    .replace(/[^a-zA-Z0-9\s]/g, "")
                                    .split(/\s+/)
                                    .filter(Boolean)
                                    .slice(0, 2)
                                    .map((p) => p[0]!.toUpperCase())
                                    .join("");
                                return (
                                    <button
                                        key={a.id}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => { onSelect(a.id); setOpen(false); setSearch(""); }}
                                        className={cn(
                                            "w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors",
                                            isSelected ? "bg-blue-50" : "hover:bg-slate-50"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={cn(
                                                "h-8 w-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0",
                                                isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                                            )}>
                                                {initials}
                                            </div>
                                            <div className="min-w-0">
                                                <div className={cn(
                                                    "text-sm font-semibold truncate",
                                                    isSelected ? "text-blue-700" : "text-slate-900"
                                                )}>
                                                    {a.legalName}
                                                </div>
                                                <div className="text-[11px] text-slate-500 truncate">
                                                    {a.dbaName && a.dbaName !== a.legalName && <span>DBA {a.dbaName}</span>}
                                                    {a.dbaName && a.dotNumber && <span className="mx-1">·</span>}
                                                    {a.dotNumber && <span>DOT {a.dotNumber}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        {isSelected && <Check size={15} className="text-blue-600 shrink-0" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                    <div className="px-3 py-2 border-t border-slate-100 text-[11px] text-slate-400">
                        {accounts.length} carrier{accounts.length === 1 ? "" : "s"} available
                    </div>
                </div>
            )}
        </div>
    );
}
