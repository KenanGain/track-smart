// ─────────────────────────────────────────────────────────────────────────────
// What a change to inventory means for the people holding it.
//
// Four surfaces can move kit — the Add Inventory form, the driver assign page, the
// vehicle assign page, and the Register Asset wizard — and every one of them was
// deciding for itself whether to message anybody and what to say. That is exactly
// the kind of rule that gets updated in three places and forgotten in the fourth,
// and the symptom is silent: nobody is told, and the office finds out when a driver
// turns up without a fuel card.
//
// So the surfaces describe what CHANGED, in the vocabulary below, and this decides
// what has to be said. One rule, four callers:
//
//   assign → driver      they collect it            (from the office, or from whoever has it)
//   unassign ← driver    they hand it back          (to the office, or to whoever is next)
//   hand over → driver   they collect it and sign
//   take back ← driver   they hand it back
//   assign → vehicle     nobody is told, UNLESS it rides with whoever drives it
//   unassign ← vehicle   whoever is carrying it is asked to take it out of the cab
//
// The rule underneath all six: a message goes to a PERSON about a thing that is, or
// is about to be, physically on them. Kit that sits in a parked truck moves on
// paper only, and messaging somebody about it is noise they learn to ignore.
// ─────────────────────────────────────────────────────────────────────────────

import { itemName, type InventoryItem } from "./inventory.data";
import {
    requestCollection, requestReturn, draftMovementNote,
    OFFICE, type Counterparty,
} from "./inventory-collection";
import type { CollectionForm, CollectionLine } from "@/pages/messages/messages-store";

/**
 * The two things that can happen to a person, and the two that can happen to a unit.
 *
 * There used to be six. `hand-over` and `take-back` were a signed checklist — a third way
 * for a driver to "have" something beside being assigned it — and they are gone: an item is
 * on a unit, on a person, or on both, and each of those is one field.
 */
export type MovementKind =
    | "assign-driver" | "unassign-driver"
    | "assign-vehicle" | "unassign-vehicle";

export { OFFICE, type Counterparty } from "./inventory-collection";

/** One thing moving, and who it is moving for. */
export interface Movement {
    kind: MovementKind;
    item: InventoryItem;
    /** The person it lands on, or comes off. Nothing when no one is holding it. */
    person?: { id: string; name: string } | null;
    /** The vehicle it is filed against, for the card's second line. */
    holderLabel?: string;
}

/** One message, to one person, in one direction. */
export interface MovementPlan {
    driverId: string;
    driverName: string;
    direction: "collect" | "return";
    lines: CollectionLine[];
    holderLabel?: string;
    counterparty: Counterparty;
    dueAt?: string;
    /**
     * What they sign for it, attached by the notification block rather than decided here.
     *
     * The planner's job is who has to move and which way; whether the office wants a receipt
     * for it is an office policy, not a rule about the kit.
     */
    forms?: CollectionForm[];
    /** The drafted wording. Editable before it is sent. */
    note: string;
}

// One route left. A line on a collection card is something the person is answerable for,
// which is the only way anything reaches them now.
const lineFor = (m: Movement): CollectionLine => ({
    itemId: m.item.id,
    name: itemName(m.item),
    serial: m.item.serial || undefined,
    route: "assigned",
});

/**
 * Which way a change pushes the kit, or nothing when nobody has to move.
 *
 * A vehicle assignment is the interesting case: filing a spare wheel chock against a truck
 * moves nothing, but filing a fuel card that rides with its driver does.
 */
function directionOf(m: Movement): "collect" | "return" | null {
    switch (m.kind) {
        case "assign-driver": return "collect";
        case "unassign-driver": return "return";
        // A unit is not told anything. Filing a transponder against a truck asks nobody to
        // do anything, and whether a person also has it is their own line.
        case "assign-vehicle":
        case "unassign-vehicle":
            return null;
    }
}

/** Who a movement concerns, or nothing when it concerns no one. */
const personOf = (m: Movement) => m.person ?? null;


/**
 * Group a batch of changes into the messages they produce.
 *
 * Grouped by person and direction, because a save that gives somebody two things and takes
 * a third back is two messages, not three: one trip to collect, one to drop off. Movements
 * that concern nobody drop out here rather than being filtered by every caller.
 */
export function planMovements(
    movements: Movement[],
    opts: { counterparty?: Counterparty; dueAt?: string } = {},
): MovementPlan[] {
    const byKey = new Map<string, MovementPlan>();

    for (const m of movements) {
        const direction = directionOf(m);
        const person = personOf(m);
        if (!direction || !person) continue;

        const key = `${person.id}::${direction}`;
        const existing = byKey.get(key);
        if (existing) {
            existing.lines.push(lineFor(m));
            continue;
        }
        byKey.set(key, {
            driverId: person.id,
            driverName: person.name,
            direction,
            lines: [lineFor(m)],
            holderLabel: m.holderLabel,
            counterparty: opts.counterparty ?? OFFICE,
            dueAt: opts.dueAt,
            note: "",
        });
    }

    // Drafted last, so the wording sees the whole list rather than the first line of it.
    return [...byKey.values()].map((p) => ({ ...p, note: draftMovementNote(p) }));
}

/** Send what was planned. Returns how many messages went out. */
export function sendMovements(
    plans: MovementPlan[],
    ctx: { accountId: string; issuedBy: string },
): number {
    for (const p of plans) {
        const input = {
            accountId: ctx.accountId,
            driverId: p.driverId,
            driverName: p.driverName,
            holderLabel: p.holderLabel,
            lines: p.lines,
            issuedBy: ctx.issuedBy,
            note: p.note.trim() || undefined,
            counterparty: p.counterparty,
            dueAt: p.dueAt || undefined,
            forms: p.forms,
        };
        if (p.direction === "return") requestReturn(input);
        else requestCollection(input);
    }
    return plans.length;
}

/** A one-line summary of a plan, for the confirmation the office reads before saving. */
export function summarise(plan: MovementPlan): string {
    const n = plan.lines.length;
    const where = plan.counterparty.kind === "person" && plan.counterparty.name
        ? plan.counterparty.name
        : "the office";
    // Said in the same sentence as the trip, because it is the same trip. A confirmation
    // that lists the items and leaves the signature to a second line invites the office to
    // read the first one and stop.
    const f = plan.forms?.length ?? 0;
    const signing = f > 0 ? ` and signs ${f === 1 ? "1 form" : `${f} forms`}` : "";
    return plan.direction === "collect"
        ? `${plan.driverName} collects ${n} item${n === 1 ? "" : "s"} from ${where}${signing}`
        : `${plan.driverName} hands ${n} item${n === 1 ? "" : "s"} to ${where}`;
}
