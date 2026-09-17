// ─────────────────────────────────────────────────────────────────────────────
// "Tell them" — the same block, wherever kit changes hands.
//
// Three forms ask this question: Add Inventory, the assign / hand-over page, and
// the Register Asset wizard. Each had grown its own version — a checkbox over a
// textarea here, two checkboxes and two textareas there — so the same decision
// looked like three different decisions, and only one of them could say where to
// collect from or by when.
//
// The block renders the messages a save would actually send, one card each, off
// the movement planner. Nothing here decides WHETHER to tell anybody: that is the
// planner's rule, and a form that second-guessed it would be the fourth copy of it.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { Info, MessageSquare, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { summarise, type Movement, type MovementPlan } from "./inventory-movements";
import { plansFor, planKey, type NotifyState } from "./notify-state";

// The state and its helpers live in a plain module: the asset wizard's save path reads
// them outside React, and pure logic should not have to import a component to do it.
export {
    emptyNotifyState, planKey, counterpartyOf, sendablePlans, type NotifyState,
} from "./notify-state";

/** The messages a set of changes would send, memoised for the form that shows them. */
export function useMovementPlans(movements: Movement[], state: NotifyState): MovementPlan[] {
    return useMemo(() => plansFor(movements, state), [movements, state]);
}

export function MovementNotify({ plans, state, onChange, emptyHint, onOpenChat }: {
    plans: MovementPlan[];
    state: NotifyState;
    onChange: (next: Partial<NotifyState>) => void;
    /** Why there is nothing to send — each reason is a different thing to go and fix. */
    emptyHint?: React.ReactNode;
    onOpenChat?: (driverName: string) => void;
}) {
    const initials = (name: string) => {
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return "?";
        return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
    };

    if (plans.length === 0) {
        return (
            <p className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-[12px] leading-snug text-slate-500">
                <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
                {emptyHint ?? "Nothing here has to move, so there is nobody to tell."}
            </p>
        );
    }

    const collects = plans.filter((p) => p.direction === "collect").length;

    return (
        <div className="space-y-3">
            {collects > 0 && (
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2.5">
                    <input
                        type="checkbox" checked={state.notify}
                        onChange={(e) => onChange({ notify: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                    />
                    <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
                            <MessageSquare size={13} className="text-blue-600" />
                            Send {plans.length === 1 ? "this message" : `these ${plans.length} messages`} when you save
                        </span>
                        {/* Nobody can collect what they were never told about, which is why this
                            goes with the save rather than being a thing to remember afterwards. */}
                        <span className="block text-[11px] leading-snug text-slate-500">
                            Each one lands in their chat as a checklist they tick off in the driver app.
                            What they confirm comes back onto the item.
                        </span>
                    </span>
                </label>
            )}

            {/* Where and when, once for the whole save: somebody making one trip does not
                want two different deadlines. */}
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-2">
                <div>
                    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Collected from / handed to
                    </span>
                    <div className="flex gap-1.5">
                        {([["office", "The office"], ["person", "Somebody else"]] as const).map(([k, label]) => (
                            <button key={k} type="button" onClick={() => onChange({ counterKind: k })}
                                className={cn(
                                    "flex-1 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors",
                                    state.counterKind === k ? "border-blue-500 bg-blue-50 text-blue-700"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                                )}>
                                {label}
                            </button>
                        ))}
                    </div>
                    {state.counterKind === "person" && (
                        <input
                            value={state.counterName}
                            onChange={(e) => onChange({ counterName: e.target.value })}
                            placeholder="Who has it — e.g. Mike Johnson, yard office"
                            className="mt-1.5 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    )}
                    <p className="mt-1 text-[11px] leading-snug text-slate-500">
                        {state.counterKind === "office"
                            ? "The usual answer, and where the checklist points."
                            : "For kit going hand to hand rather than through the counter."}
                    </p>
                </div>
                <div>
                    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        By when <span className="font-medium normal-case text-slate-400">(optional)</span>
                    </span>
                    <input
                        type="datetime-local"
                        value={state.dueAt}
                        onChange={(e) => onChange({ dueAt: e.target.value })}
                        className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <p className="mt-1 text-[11px] leading-snug text-slate-500">
                        {state.dueAt
                            ? "Shown on the card, so “when by” is not a second conversation."
                            : "Leave blank for “next time you are at the yard”."}
                    </p>
                </div>
            </div>

            {/* One card per message. Two of them is the normal shape of a driver change:
                one person drops off, the other picks up. */}
            {plans.map((p) => {
                const key = planKey(p);
                const edited = state.notes[key] !== undefined;
                const back = p.direction === "return";
                const muted = !back && !state.notify;
                return (
                    <div key={key} className={cn(
                        "overflow-hidden rounded-xl border transition-opacity",
                        back ? "border-amber-200" : "border-blue-200",
                        muted && "opacity-50",
                    )}>
                        <div className={cn(
                            "flex flex-wrap items-center gap-2 border-b px-3 py-2",
                            back ? "border-amber-100 bg-amber-50/60" : "border-blue-100 bg-blue-50/60",
                        )}>
                            <span className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                                back ? "bg-amber-600" : "bg-blue-600",
                            )}>
                                {initials(p.driverName)}
                            </span>
                            <span className="min-w-0">
                                <span className="block truncate text-[12px] font-bold text-slate-800">{p.driverName}</span>
                                <span className="block text-[11px] text-slate-500">{summarise(p)}</span>
                            </span>
                            <span className={cn(
                                "ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                back ? "border-amber-200 bg-white text-amber-700" : "border-blue-200 bg-white text-blue-700",
                            )}>
                                {back ? "Hands in" : "Collects"} {p.lines.length}
                            </span>
                        </div>
                        <textarea
                            value={p.note}
                            onChange={(e) => onChange({ notes: { ...state.notes, [key]: e.target.value } })}
                            rows={6}
                            className="w-full border-0 p-3 text-[13px] leading-relaxed text-slate-800 outline-none focus:ring-0"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-3 py-2">
                            <p className="text-[11px] text-slate-500">
                                {/* An edit somebody made is theirs; the draft stops rewriting
                                    itself once they have typed. */}
                                {muted ? "Not being sent — tick the box above to send it."
                                    : edited ? "Your wording — it will not be rewritten if the list changes."
                                    : "Drafted from what is moving. Type to make it yours."}
                            </p>
                            <div className="flex gap-1.5">
                                {edited && (
                                    <button type="button"
                                        onClick={() => {
                                            const next = { ...state.notes };
                                            delete next[key];
                                            onChange({ notes: next });
                                        }}
                                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50">
                                        Reset to draft
                                    </button>
                                )}
                                {onOpenChat && (
                                    <button type="button"
                                        onClick={() => onOpenChat(p.driverName)}
                                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50">
                                        <Send size={11} /> Open chat
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
