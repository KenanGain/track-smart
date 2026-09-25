// ─────────────────────────────────────────────────────────────────────────────
// The "tell them" answer, without the block that asks for it.
//
// Three forms hold this state and two save paths read it, and one of those save
// paths is not React — the asset wizard commits after the form has closed. Keeping
// the shape here rather than in the component means the bridge does not have to
// import a .tsx to know what a draft looks like.
// ─────────────────────────────────────────────────────────────────────────────

import { planMovements, OFFICE, type Counterparty, type Movement, type MovementPlan } from "./inventory-movements";

export interface NotifyState {
    /**
     * The "tell them to come and get it" switch.
     *
     * COLLECTIONS only, and deliberately. A hand-back is a different fact: somebody is
     * holding kit the office has just taken off the record, and not asking for it is how a
     * fuel card stays in a pocket with the record saying otherwise. The asset wizard has a
     * separate `askBack` answer for exactly that, and folding the two together would make
     * one switch silently override the other.
     *
     * The form says which of the two it is hiding, so "off" never reads as "nothing will
     * be sent" while a hand-back is on its way.
     */
    notify: boolean;
    counterKind: Counterparty["kind"];
    counterName: string;
    dueAt: string;
    /** Wording somebody typed, keyed by who it is to and which way it goes. */
    notes: Record<string, string>;
}

export const emptyNotifyState = (): NotifyState => ({
    notify: true,
    counterKind: "office",
    counterName: "",
    dueAt: "",
    notes: {},
});

export const planKey = (p: MovementPlan) => `${p.driverId}::${p.direction}`;

export const counterpartyOf = (s: NotifyState): Counterparty =>
    (s.counterKind === "person" && s.counterName.trim()
        ? { kind: "person", name: s.counterName.trim() }
        : OFFICE);

/** The messages a set of changes would send, with any wording somebody has typed. */
export const plansFor = (movements: Movement[], state: NotifyState): MovementPlan[] =>
    planMovements(movements, { counterparty: counterpartyOf(state), dueAt: state.dueAt || undefined })
        .map((p) => ({ ...p, note: state.notes[planKey(p)] ?? p.note }));

/** Only the ones that will actually go out, for the save path. */
export const sendablePlans = (plans: MovementPlan[], state: NotifyState) =>
    plans.filter((p) => (p.direction === "collect" ? state.notify : true));
