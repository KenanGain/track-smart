import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DRIVER_TYPE_OPTIONS, normalizeDriverType, type DriverTypeId } from "./driver-types";

// The driver-type choice, the same three cards everywhere it is asked: inviting an
// applicant, building a hiring workflow, building an onboarding workflow.
//
// Three equal columns with the icon beside the text, so "Canada (Cross Border)" sits on
// one line instead of wrapping under its icon into a card taller than its neighbours.
export function DriverTypePicker({ value, onChange, className }: {
    value?: string; onChange: (id: DriverTypeId) => void; className?: string;
}) {
    const current = normalizeDriverType(value);
    return (
        <div className={cn("grid grid-cols-1 gap-2.5 sm:grid-cols-3", className)} role="radiogroup" aria-label="Driver type">
            {DRIVER_TYPE_OPTIONS.map(({ id, name, region, Icon, accent }) => {
                const on = current === id;
                return (
                    <button key={id} type="button" role="radio" aria-checked={on} onClick={() => onChange(id)}
                        className={cn("relative flex min-w-0 items-center gap-3 rounded-xl border px-3 py-3 text-left transition",
                            on ? "border-blue-500 bg-blue-50/70 ring-1 ring-blue-200" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50")}>
                        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", on ? "bg-blue-600 text-white" : accent)}><Icon className="h-4.5 w-4.5" /></span>
                        <span className="min-w-0 flex-1">
                            <span className={cn("block truncate text-sm font-semibold", on ? "text-blue-700" : "text-slate-800")} title={name}>{name}</span>
                            <span className="block truncate text-[11px] text-slate-400">{region}</span>
                        </span>
                        {on && <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white"><Check className="h-3 w-3" strokeWidth={3} /></span>}
                    </button>
                );
            })}
        </div>
    );
}
