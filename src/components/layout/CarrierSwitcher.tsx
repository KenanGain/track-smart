import * as React from "react";
import { Building2, Search, ChevronDown, Check, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type CarrierStatus = "Active" | "Inactive" | "Suspended" | "Pending";

export type CarrierOption = {
    id: string;
    legalName: string;
    dbaName?: string;
    dotNumber?: string;
    status?: CarrierStatus;
    city?: string;
    state?: string;
};

type Props = {
    selectedAccountId?: string;
    accounts: CarrierOption[];
    onSelect: (id: string) => void;
    /** Shown next to the selector to indicate the user's authority. */
    scopeLabel?: string;
    className?: string;
};

// Two-letter initials extracted from a legal name (first chars of first 2 words).
function initialsOf(name: string): string {
    return (
        name
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]!.toUpperCase())
            .join("") || "??"
    );
}

// Deterministic gradient per carrier id so the trigger / row avatars are
// recognisable and stable across reloads.
const AVATAR_GRADIENTS = [
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-violet-500 to-fuchsia-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-sky-500 to-cyan-600",
    "from-slate-500 to-slate-700",
];
function gradientFor(id: string): string {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]!;
}

const STATUS_DOT: Record<CarrierStatus, string> = {
    Active: "bg-emerald-500",
    Inactive: "bg-slate-400",
    Suspended: "bg-rose-500",
    Pending: "bg-amber-500",
};

const STATUS_BADGE: Record<CarrierStatus, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Inactive: "bg-slate-100 text-slate-600 border-slate-200",
    Suspended: "bg-rose-50 text-rose-700 border-rose-200",
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
};

/**
 * Top-bar carrier switcher. Trigger shows an initials avatar + legal name +
 * DBA hint. Dropdown has search, keyboard navigation (arrow keys / enter),
 * groups by status (Active first), and shows DOT + city per row. Collapses to
 * a read-only label when only one carrier is in scope.
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
    const [highlight, setHighlight] = React.useState(0);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
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
                (a.dotNumber ?? "").toLowerCase().includes(q) ||
                (a.city ?? "").toLowerCase().includes(q) ||
                (a.state ?? "").toLowerCase().includes(q)
        );
    }, [accounts, search]);

    // Group filtered carriers by status — Active first, others below.
    const grouped = React.useMemo(() => {
        const order: CarrierStatus[] = ["Active", "Pending", "Suspended", "Inactive"];
        const buckets: Record<string, CarrierOption[]> = {};
        for (const a of filtered) {
            const k = a.status ?? "Active";
            (buckets[k] ??= []).push(a);
        }
        return order
            .map((s) => ({ status: s, items: buckets[s] ?? [] }))
            .filter((g) => g.items.length > 0);
    }, [filtered]);

    // Flat order for keyboard navigation — match the visual order.
    const flatOrder = React.useMemo(
        () => grouped.flatMap((g) => g.items),
        [grouped]
    );

    React.useEffect(() => {
        if (!open) return;
        setHighlight(0);
        // Focus the search input when the dropdown opens.
        const t = setTimeout(() => inputRef.current?.focus(), 0);
        return () => clearTimeout(t);
    }, [open]);

    React.useEffect(() => {
        // Reset highlight when the filter shrinks the list.
        setHighlight((h) => Math.min(h, Math.max(0, flatOrder.length - 1)));
    }, [flatOrder.length]);

    const handleKeyDownOnInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, flatOrder.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const target = flatOrder[highlight];
            if (target) {
                onSelect(target.id);
                setOpen(false);
                setSearch("");
            }
        }
    };

    // Single-carrier mode → static read-only label (still styled like the
    // trigger button so the top bar reads consistently across roles).
    if (accounts.length <= 1) {
        return (
            <div className={cn(
                "inline-flex items-center gap-2 h-9 px-2.5 rounded-lg border border-slate-200 bg-white",
                className
            )}>
                {selected && (
                    <div className={cn(
                        "h-6 w-6 rounded-md bg-gradient-to-br flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                        gradientFor(selected.id)
                    )}>
                        {initialsOf(selected.legalName)}
                    </div>
                )}
                <span className="text-sm font-semibold text-slate-900 truncate max-w-[260px]">
                    {selected?.legalName ?? "—"}
                </span>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <button
                type="button"
                onClick={() => { setOpen((o) => !o); setSearch(""); }}
                className={cn(
                    "h-9 w-[240px] pl-1.5 pr-2 rounded-lg border bg-white shadow-sm transition-colors inline-flex items-center gap-2 cursor-pointer",
                    open ? "border-blue-500 ring-2 ring-blue-500/15" : "border-slate-200 hover:border-slate-300"
                )}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label="Switch carrier"
            >
                {selected ? (
                    <div className={cn(
                        "h-7 w-7 rounded-md bg-gradient-to-br flex items-center justify-center text-[11px] font-bold text-white shrink-0",
                        gradientFor(selected.id)
                    )}>
                        {initialsOf(selected.legalName)}
                    </div>
                ) : (
                    <Building2 size={14} className="text-slate-400 shrink-0 mx-1" />
                )}
                <div className="flex flex-col items-start min-w-0 leading-tight flex-1">
                    <span className="text-sm font-semibold text-slate-900 truncate w-full text-left">
                        {selected?.dbaName ?? selected?.legalName ?? "Select a carrier…"}
                    </span>
                </div>
                <ChevronDown
                    size={14}
                    className={cn("text-slate-400 transition-transform shrink-0", open && "rotate-180")}
                />
            </button>

            {open && (
                <div className="fixed sm:absolute right-3 sm:right-0 top-[60px] sm:top-full sm:mt-2 w-[min(calc(100vw-1.5rem),360px)] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-[100]">
                    {/* Header — scope label + total available */}
                    <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                        {scopeLabel ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                <ShieldCheck size={12} className="text-violet-500" /> {scopeLabel}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                <Building2 size={12} className="text-slate-400" /> Carriers
                            </span>
                        )}
                        <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                            {accounts.length} total
                        </span>
                    </div>

                    {/* Search */}
                    <div className="p-2 border-b border-slate-100">
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleKeyDownOnInput}
                                placeholder="Search by name, DBA, DOT, city…"
                                className="w-full h-9 pl-8 pr-8 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => { setSearch(""); inputRef.current?.focus(); }}
                                    aria-label="Clear search"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:bg-slate-100"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    <div ref={listRef} className="max-h-80 overflow-y-auto py-1" role="listbox">
                        {flatOrder.length === 0 ? (
                            <div className="py-10 text-center text-xs text-slate-400">
                                No carriers match "{search}"
                            </div>
                        ) : (
                            grouped.map((group, gi) => (
                                <div key={group.status}>
                                    {grouped.length > 1 && (
                                        <div className={cn(
                                            "px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 inline-flex items-center gap-1.5",
                                            gi === 0 && "pt-0"
                                        )}>
                                            <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[group.status])} />
                                            {group.status}
                                            <span className="text-slate-400 font-medium tabular-nums">· {group.items.length}</span>
                                        </div>
                                    )}
                                    {group.items.map((a) => {
                                        const flatIndex = flatOrder.indexOf(a);
                                        const isSelected = a.id === selectedAccountId;
                                        const isHighlighted = flatIndex === highlight;
                                        return (
                                            <button
                                                key={a.id}
                                                type="button"
                                                role="option"
                                                aria-selected={isSelected}
                                                onMouseEnter={() => setHighlight(flatIndex)}
                                                onClick={() => { onSelect(a.id); setOpen(false); setSearch(""); }}
                                                className={cn(
                                                    "w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors",
                                                    isSelected
                                                        ? "bg-blue-50"
                                                        : isHighlighted
                                                            ? "bg-slate-50"
                                                            : "hover:bg-slate-50"
                                                )}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={cn(
                                                        "h-9 w-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-[12px] font-bold text-white shrink-0",
                                                        gradientFor(a.id)
                                                    )}>
                                                        {initialsOf(a.legalName)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn(
                                                                "text-sm font-semibold truncate max-w-[220px]",
                                                                isSelected ? "text-blue-700" : "text-slate-900"
                                                            )}>
                                                                {a.legalName}
                                                            </span>
                                                            {a.status && (
                                                                <span className={cn(
                                                                    "inline-flex items-center px-1.5 py-0 rounded border text-[9px] font-bold uppercase tracking-wider shrink-0",
                                                                    STATUS_BADGE[a.status]
                                                                )}>
                                                                    {a.status}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                                                            {a.dbaName && a.dbaName !== a.legalName && <span>DBA {a.dbaName}</span>}
                                                            {a.dbaName && a.dbaName !== a.legalName && (a.city || a.state) && <span className="text-slate-300">·</span>}
                                                            {(a.city || a.state) && (
                                                                <span className="truncate">
                                                                    {[a.city, a.state].filter(Boolean).join(", ")}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isSelected && <Check size={15} className="text-blue-600 shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-3.5 py-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{filtered.length} of {accounts.length} shown</span>
                        <span className="text-slate-400">↑↓ navigate · ↵ select · esc close</span>
                    </div>
                </div>
            )}
        </div>
    );
}
