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
                {/* One flex item. A hint with a bold word in it is several nodes, and left
                    loose in a flex row each one becomes its own column — the sentence
                    then reads across in the wrong order. */}
                <span className="min-w-0">
                    {emptyHint ?? "Nothing here has to move, so there is nobody to tell."}
                </span>
            </p>
        );
    }

    // Two different messages, and the switch only governs one of them.
    const collects = plans.filter((p) => p.direction === "collect");
    const returns = plans.filter((p) => p.direction === "return");
    /** What is left on screen once the switch is off. */
    const shown = state.notify ? plans : returns;

    return (
        <div className="space-y-3">
            {/* The switch, at the top, and the form below is what it switches. It used to be
                a tick in the MIDDLE of the step, under a message and a deadline that were on
                screen whether or not anything was going to be sent.

                Only where there is a collection for it to govern: a switch beside a lone
                hand-back would claim to turn off something it does not control. */}
            {collects.length > 0 && (
            <div className={cn(
                "flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                state.notify ? "border-blue-200 bg-blue-50/50" : "border-slate-200 bg-slate-50",
            )}>
                <span className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    state.notify ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-500",
                )}>
                    <MessageSquare size={15} />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-slate-800">
                        {collects.length === 1
                            ? "Ask them to collect it"
                            : `Ask them to collect these ${collects.length} times`} when you save
                    </span>
                    {/* Nobody can collect what they were never told about, which is why this
                        goes with the save rather than being a thing to remember afterwards. */}
                    <span className="block text-[11px] leading-snug text-slate-500">
                        {state.notify
                            ? "It lands in their chat as a checklist they tick off in the driver app. What they confirm comes back onto the item."
                            : "The kit still goes onto the vehicle. Nobody is asked to come for it."}
                    </span>
                </span>
                <button
                    type="button"
                    role="switch"
                    aria-checked={state.notify}
                    aria-label="Send these messages when you save"
                    onClick={() => onChange({ notify: !state.notify })}
                    className={cn(
                        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                        state.notify ? "bg-blue-600" : "bg-slate-300",
                    )}
                >
                    <span className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                        state.notify ? "left-[22px]" : "left-0.5",
                    )} />
                </button>
            </div>
            )}

            {/* What the switch does NOT govern, said where somebody might assume it did.
                Taking kit off the record does not take it out of a pocket, so the hand-back
                goes either way — and it is still on screen below to be worded. */}
            {!state.notify && returns.length > 0 && (
                <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-[12px] leading-snug text-amber-800">
                    <Info size={14} className="mt-0.5 shrink-0 text-amber-600" />
                    <span className="min-w-0">
                        {returns.length === 1 ? "One hand-back is" : `${returns.length} hand-backs are`} still
                        going out. Somebody is carrying kit this save takes off the record, and not
                        asking for it is how it stays in a pocket.
                    </span>
                </p>
            )}

            {shown.length > 0 && (<>

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
            {shown.map((p) => {
                const key = planKey(p);
                const edited = state.notes[key] !== undefined;
                const back = p.direction === "return";
                return (
                    <div key={key} className={cn(
                        "overflow-hidden rounded-xl border transition-opacity",
                        back ? "border-amber-200" : "border-blue-200",
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
                                {edited ? "Your wording — it will not be rewritten if the list changes."
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
            </>)}
        </div>
    );
}
