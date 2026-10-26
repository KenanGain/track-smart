import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGE_LABEL, STAGE_TONE, inspectionStage, saveInspection, type InspectionStage, type RoadsideInspection } from "./roadside.data";

// ─────────────────────────────────────────────────────────────────────────────
// The stage, changed where it is read.
//
// The stage is worked out from the record — a Fail with no DVIR on file is "Awaiting
// DVIR" whether or not anybody says so. But the office sometimes knows better than the
// paperwork: the bill was paid in cash and there is no invoice to file, or the unit was
// sold and nothing more will be done. So the pill is a control. Picking the stage the
// record would have worked out on its own takes the override off again, so a record only
// carries an override while a person is actually disagreeing with it.
// ─────────────────────────────────────────────────────────────────────────────

export const STAGES: InspectionStage[] = ["clean", "awaiting-report", "awaiting-repair", "closed"];

/** The stage the record works out on its own, ignoring any override. */
export const derivedStage = (i: RoadsideInspection): InspectionStage =>
    inspectionStage({ ...i, stageOverride: undefined });

export function setStage(i: RoadsideInspection, next: InspectionStage): void {
    const auto = derivedStage(i);
    saveInspection({ ...i, stageOverride: next === auto ? undefined : next });
}

export function StageSelect({ inspection, size = "sm", className }: {
    inspection: RoadsideInspection; size?: "sm" | "md"; className?: string;
}) {
    const value = inspectionStage(inspection);
    const auto = derivedStage(inspection);
    const tone = STAGE_TONE[value];
    const dot = value === "clean" ? "bg-emerald-500" : value === "awaiting-report" ? "bg-rose-500" : value === "awaiting-repair" ? "bg-amber-500" : "bg-slate-400";
    return (
        <span className={cn("relative inline-flex max-w-full items-center", className)} onClick={(e) => e.stopPropagation()}>
            <span className={cn("pointer-events-none absolute left-2.5 rounded-full", size === "md" ? "h-2 w-2" : "h-1.5 w-1.5", dot)} />
            <select
                value={value}
                onChange={(e) => setStage(inspection, e.target.value as InspectionStage)}
                aria-label="Inspection stage"
                title={inspection.stageOverride ? `Set by hand — the record itself reads ${STAGE_LABEL[auto]}` : "Change stage"}
                className={cn(
                    "min-w-0 max-w-full cursor-pointer appearance-none truncate rounded-full border font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-blue-500/30",
                    size === "md" ? "h-8 pl-6 pr-8 text-[11px]" : "h-6 pl-5 pr-6 text-[10px]",
                    tone,
                )}
            >
                {STAGES.map((s) => (
                    <option key={s} value={s}>{STAGE_LABEL[s]}</option>
                ))}
            </select>
            <ChevronDown size={size === "md" ? 13 : 11} className="pointer-events-none absolute right-2 opacity-60" />
        </span>
    );
}
