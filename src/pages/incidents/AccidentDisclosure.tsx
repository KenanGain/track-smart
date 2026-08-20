import { useState } from "react";
import { ShieldAlert, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DRIVER_ACCIDENT_DISCLOSURE as D } from "@/data/accident-records.data";

/**
 * "Driver Accident Report" disclosure — the at-the-scene instructions shown on
 * the accident report form (driver mobile app, default open) and the office
 * Add-accident modal (default collapsed). Content lives in accident-records.data.
 */
export function AccidentDisclosure({ defaultOpen = false, className }: { defaultOpen?: boolean; className?: string }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className={cn("overflow-hidden rounded-xl border border-amber-200 bg-amber-50/60", className)}>
            <button type="button" onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-2.5 px-4 py-3 text-left">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white"><ShieldAlert size={16} /></span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-amber-900">{D.title}</span>
                    <span className="block text-[11px] leading-snug text-amber-700/80">{D.intro}</span>
                </span>
                <ChevronDown size={16} className={cn("shrink-0 text-amber-600 transition-transform", open && "rotate-180")} />
            </button>
            {open && (
                <div className="space-y-3 border-t border-amber-200/70 px-4 py-3">
                    <p className="text-xs leading-relaxed text-amber-800">{D.note}</p>
                    <div>
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">{D.stepsTitle}</p>
                        <ol className="space-y-1.5">
                            {D.steps.map((s, i) => (
                                <li key={i} className="flex gap-2 text-xs leading-snug text-slate-700">
                                    <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">{i + 1}</span>
                                    <span>{s}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            )}
        </div>
    );
}
