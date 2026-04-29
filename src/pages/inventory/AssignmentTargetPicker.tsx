import * as React from "react";
import {
    Search, ChevronDown, Truck, IdCard, Check, X, MapPin, Calendar, Hash,
    BadgeCheck, Phone, Mail,
} from "lucide-react";
import { ACME_TRUCKS, ACME_NON_CMV_ASSETS, ACME_ACTIVE_DRIVERS, type AssignmentKind } from "./inventory.data";
import { cn } from "@/lib/utils";

type Option = {
    id: string;
    primary: string;
    secondary: string;
    /** Up to 3 tertiary metadata chips like "Active", "TX", "DOT 1234567". */
    chips?: { label: string; tone?: "slate" | "emerald" | "amber" | "red" | "indigo" | "orange" }[];
    /** Optional extra detail line shown below the chips. */
    extra?: string;
};

type Props = {
    kind: AssignmentKind;
    selectedId: string;
    onSelect: (id: string) => void;
    placeholder?: string;
};

/**
 * Searchable, single-select target picker for inventory assignment.
 * Replaces a plain <select> with a richer dropdown that lets you search and
 * see more context (VIN, plate, driver license, status…) per option.
 */
export function AssignmentTargetPicker({ kind, selectedId, onSelect, placeholder }: Props) {
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

    // Build options for the active kind
    const options: Option[] = React.useMemo(() => {
        if (kind === "cmv" || kind === "non-cmv") {
            const list = kind === "cmv" ? ACME_TRUCKS : ACME_NON_CMV_ASSETS;
            return list.map((a) => ({
                id: a.id,
                primary: a.unitNumber,
                secondary: `${a.year} ${a.make} ${a.model}`,
                chips: [
                    { label: a.assetCategory, tone: a.assetCategory === "CMV" ? "indigo" : "orange" },
                    { label: a.operationalStatus, tone: assetStatusTone(a.operationalStatus) },
                    a.color ? { label: a.color, tone: "slate" as const } : null,
                ].filter(Boolean) as Option["chips"],
                extra: [
                    `VIN •••${a.vin.slice(-4)}`,
                    a.plateNumber ? `Plate ${a.plateNumber}${a.plateJurisdiction ? ` · ${a.plateJurisdiction}` : ""}` : null,
                    a.odometer ? `${a.odometer.toLocaleString()} ${a.odometerUnit ?? "mi"}` : null,
                ].filter(Boolean).join(" · "),
            }));
        }
        return ACME_ACTIVE_DRIVERS.map((d) => ({
            id: d.id,
            primary: d.name,
            secondary: d.driverType ?? "Driver",
            chips: [
                { label: d.status, tone: d.status === "Active" ? "emerald" as const : "slate" as const },
                d.licenseState ? { label: d.licenseState, tone: "indigo" as const } : null,
                d.terminal ? { label: d.terminal, tone: "slate" as const } : null,
            ].filter(Boolean) as Option["chips"],
            extra: [
                d.licenseNumber ? `License ${d.licenseNumber}` : null,
                d.licenseExpiry ? `Exp ${d.licenseExpiry}` : null,
                d.phone ? d.phone : null,
            ].filter(Boolean).join(" · "),
        }));
    }, [kind]);

    const selected = options.find((o) => o.id === selectedId);

    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) =>
            o.primary.toLowerCase().includes(q) ||
            o.secondary.toLowerCase().includes(q) ||
            (o.extra ?? "").toLowerCase().includes(q) ||
            (o.chips ?? []).some((c) => c.label.toLowerCase().includes(q))
        );
    }, [options, search]);

    const KindIcon = kind === "driver" ? IdCard : Truck;
    const kindLabel = kind === "cmv" ? "CMV" : kind === "non-cmv" ? "Non-CMV" : "Driver";

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => { setOpen((o) => !o); setSearch(""); }}
                className={cn(
                    "w-full min-h-[48px] px-3 py-2 rounded-md border bg-white text-left transition-colors flex items-center gap-3",
                    open ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200 hover:border-slate-300"
                )}
            >
                <div className={cn(
                    "h-9 w-9 rounded-md flex items-center justify-center shrink-0",
                    selected ? (kind === "driver" ? "bg-emerald-50 text-emerald-700" : kind === "cmv" ? "bg-indigo-50 text-indigo-700" : "bg-orange-50 text-orange-700") : "bg-slate-100 text-slate-400"
                )}>
                    <KindIcon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    {selected ? (
                        <>
                            <div className="text-sm font-semibold text-slate-900 truncate">{selected.primary}</div>
                            <div className="text-xs text-slate-500 truncate">{selected.secondary}</div>
                        </>
                    ) : (
                        <div className="text-sm text-slate-400">
                            {placeholder ?? `Select a ${kindLabel.toLowerCase()}…`}
                        </div>
                    )}
                </div>
                {selected && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onSelect(""); }}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                        aria-label="Clear assignment"
                    >
                        <X size={14} />
                    </button>
                )}
                <ChevronDown size={16} className={cn("text-slate-400 transition-transform shrink-0", open && "rotate-180")} />
            </button>

            {open && (
                <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={
                                    kind === "driver"
                                        ? "Search by name, license, terminal, status…"
                                        : "Search by unit #, VIN, make/model, plate…"
                                }
                                autoFocus
                                className="w-full h-9 pl-9 pr-2 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto p-1">
                        {filtered.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-400">
                                No {kindLabel.toLowerCase()}{kind === "driver" ? "s" : " assets"} match "{search}"
                            </div>
                        ) : filtered.map((opt) => {
                            const isSelected = opt.id === selectedId;
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => { onSelect(opt.id); setOpen(false); setSearch(""); }}
                                    className={cn(
                                        "w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-start gap-3",
                                        isSelected ? "bg-blue-50" : "hover:bg-slate-50"
                                    )}
                                >
                                    {/* Radio dot */}
                                    <span className={cn(
                                        "mt-1 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                                        isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
                                    )}>
                                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                    </span>

                                    {/* Avatar */}
                                    <div className={cn(
                                        "h-9 w-9 rounded-md flex items-center justify-center shrink-0",
                                        kind === "driver" ? "bg-emerald-50 text-emerald-700"
                                            : kind === "cmv" ? "bg-indigo-50 text-indigo-700"
                                            : "bg-orange-50 text-orange-700"
                                    )}>
                                        <KindIcon size={15} />
                                    </div>

                                    {/* Body */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={cn(
                                                "text-sm font-bold truncate",
                                                isSelected ? "text-blue-700" : "text-slate-900"
                                            )}>
                                                {opt.primary}
                                            </span>
                                            {opt.chips?.map((chip, i) => (
                                                <span
                                                    key={i}
                                                    className={cn(
                                                        "inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider",
                                                        TONE_CLASS[chip.tone ?? "slate"]
                                                    )}
                                                >
                                                    {chip.label}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="text-xs text-slate-600 mt-0.5 truncate">{opt.secondary}</div>
                                        {opt.extra && (
                                            <div className="text-[11px] text-slate-500 mt-0.5 truncate inline-flex items-center gap-1">
                                                {kind === "driver"
                                                    ? <BadgeCheck size={10} className="text-slate-400" />
                                                    : <Hash size={10} className="text-slate-400" />}
                                                {opt.extra}
                                            </div>
                                        )}
                                    </div>

                                    {isSelected && <Check size={14} className="text-blue-600 mt-1 shrink-0" />}
                                </button>
                            );
                        })}
                    </div>

                    <div className="px-3 py-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                        <span>{filtered.length} of {options.length}</span>
                        <span className="inline-flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[10px]">Esc</kbd>
                            to close
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

const TONE_CLASS: Record<string, string> = {
    slate:   "bg-slate-50 text-slate-600 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber:   "bg-amber-50 text-amber-700 border-amber-200",
    red:     "bg-red-50 text-red-700 border-red-200",
    indigo:  "bg-indigo-50 text-indigo-700 border-indigo-200",
    orange:  "bg-orange-50 text-orange-700 border-orange-200",
};

function assetStatusTone(status: string): "emerald" | "amber" | "slate" | "red" {
    if (status === "Active") return "emerald";
    if (status === "Maintenance") return "amber";
    if (status === "OutOfService") return "red";
    return "slate";
}

// Suppress unused-import warnings for icons we re-exported as cosmetic JSDoc helpers
void MapPin; void Calendar; void Phone; void Mail;
