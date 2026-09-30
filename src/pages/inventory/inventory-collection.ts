// ─────────────────────────────────────────────────────────────────────────────
// "You've been assigned this — please collect it from the office."
//
// One round trip, in two halves:
//
//   OUT  the office assigns or hands kit to a driver and sends a checklist into
//        their chat. Sent with the assignment, not after it: a driver cannot
//        collect what nobody told them about, and a second step to remember is a
//        step that gets forgotten.
//
//   BACK the driver ticks what they actually walked away with and confirms. That
//        writes the receipt onto the hand-over record and onto each item's trail,
//        so the office learns the answer without anyone re-keying it.
//
// The two halves live here rather than in the chat, because what a confirmation
// MEANS is an inventory fact: a handed item becomes a verified line on a signed
// checklist, and an assigned one becomes a note that the person has it in hand.
// ─────────────────────────────────────────────────────────────────────────────

import {
    sendInventoryCollection, settleInventoryCollection,
    type CollectionForm, type CollectionLine, type Conversation, type InventoryCollection,
} from "@/pages/messages/messages-store";
import { itemName, VENDORS, type InventoryItem } from "./inventory.data";
import { logInventoryEvent } from "./inventory-activity";
import { logFormsRequested } from "./inventory-forms";
import { updateInventoryItem } from "./inventory-store";

let seq = 0;
const newId = () => `col-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const collectionLineFor = (item: InventoryItem, route: CollectionLine["route"]): CollectionLine => ({
    itemId: item.id,
    name: itemName(item),
    serial: item.serial || undefined,
    route,
});

/** Where the other end of the trip is. The office unless somebody else has it. */
export type Counterparty = { kind: "office" | "person"; name?: string };
export const OFFICE: Counterparty = { kind: "office" };

/** "2026-09-18T09:00" — "Fri 18 Sep, 09:00". Blank rather than wrong on junk input. */
export function formatDue(dueAt?: string): string {
    if (!dueAt) return "";
    const [date, time] = dueAt.split("T");
    const d = new Date(`${date}T00:00:00`);
    if (isNaN(d.getTime())) return "";
    const day = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    return time ? `${day}, ${time}` : day;
}

/**
 * The default wording for anything moving between a person and somewhere else.
 *
 * One drafter rather than one per surface: the same request worded two ways reads to a
 * driver like two different requests. Editable everywhere it is offered — the office
 * knows its own yard.
 */
export function draftMovementNote(input: {
    driverName: string;
    direction: "collect" | "return";
    lines: CollectionLine[];
    counterparty?: Counterparty;
    dueAt?: string;
    /** The vehicle this kit belongs to, named in the message. */
    holderLabel?: string;
}): string {
    const who = input.driverName.trim().split(/\s+/)[0] || "there";
    const n = input.lines.length;
    const what = n === 1 ? "an item" : `${n} items`;
    const it = n === 1 ? "it" : "them";
    const list = input.lines.map((l) => `• ${l.name}${l.serial ? ` (${l.serial})` : ""}`).join("\n");
    const person = input.counterparty?.kind === "person" ? input.counterparty.name?.trim() : "";
    const by = input.dueAt ? ` by ${formatDue(input.dueAt)}` : "";

    // Which vehicle it is for. A driver who runs three units this month cannot act on
    // "collect two items" without being told which truck they belong to.
    const unit = input.holderLabel?.trim();
    const forUnit = unit ? ` for ${unit}` : "";

    if (input.direction === "collect") {
        return `Hi ${who} — you’ve been assigned ${what}${forUnit}. Please collect ${it} from ${person || "the office"}${by}:\n${list}\n\n`
            + "Tick them off below once you have them.";
    }
    const drop = person ? `hand ${it} to ${person}` : `drop ${it} back to the office`;
    return `Hi ${who} — could you ${drop}${by}${unit ? `, ${what} from ${unit}` : ""}:\n${list}\n\n`
        + "Tick them off below once you have handed them in.";
}

/** "Please collect these." A named shortcut for the collect half of the drafter. */
export function draftCollectionNote(driverName: string, lines: CollectionLine[], _anyHanded?: boolean): string {
    return draftMovementNote({ driverName, direction: "collect", lines });
}

/** "Could you drop these back." The return half, with an optional reason. */
export function draftReturnNote(driverName: string, lines: CollectionLine[], reason?: string): string {
    const base = draftMovementNote({ driverName, direction: "return", lines });
    return reason ? base.replace("could you", `could you`).replace(":\n", `, ${reason}:\n`) : base;
}

/** Send the checklist. Returns the conversation it landed in. */
export function requestCollection(input: {
    accountId: string;
    driverId: string;
    driverName: string;
    holderLabel?: string;
    lines: CollectionLine[];
    issuedBy: string;
    note?: string;
    /** Which way it is going. Collecting from the office unless said otherwise. */
    direction?: "collect" | "return";
    /** Who has it, or who is to receive it. The office unless said otherwise. */
    counterparty?: { kind: "office" | "person"; name?: string };
    /** When it has to have happened by. */
    dueAt?: string;
    /** What they sign for it. Collections only — see `withForms`. */
    forms?: CollectionForm[];
}): string {
    const back = input.direction === "return";
    const where = input.counterparty?.kind === "person" && input.counterparty.name
        ? input.counterparty.name
        : "the office";
    const collection: InventoryCollection = {
        id: newId(),
        accountId: input.accountId,
        driverId: input.driverId,
        driverName: input.driverName,
        holderLabel: input.holderLabel,
        lines: input.lines,
        issuedBy: input.issuedBy,
        note: input.note,
        forms: back ? undefined : input.forms,
        direction: back ? "return" : "collect",
        counterparty: input.counterparty,
        dueAt: input.dueAt,
        status: "pending",
    };
    const convId = sendInventoryCollection(collection, input.note);
    for (const line of input.lines) {
        logInventoryEvent({
            itemId: line.itemId, accountId: input.accountId, kind: "message",
            title: back ? "Asked to hand it in" : "Asked to collect it",
            detail: (back
                ? `${input.driverName} was asked to hand this to ${where}`
                : `${input.driverName} was asked to collect this from ${where}`)
                + (input.dueAt ? ` by ${input.dueAt.replace("T", " ")}` : ""),
            by: input.issuedBy, role: "Office",
        });
    }
    // The ask for a signature is its own fact on the trail. Somebody standing in front of a
    // missing fuel card looks at the ITEM, and "a receipt was asked for and never came back"
    // is the answer they need — it is not on the item unless it is written there.
    if (!back && input.forms?.length) {
        logFormsRequested({
            accountId: input.accountId, lines: input.lines, forms: input.forms,
            driverName: input.driverName, issuedBy: input.issuedBy,
        });
    }
    return convId;
}

/** Ask a driver to bring kit back to the office. The same card, pointed the other way. */
export function requestReturn(input: {
    accountId: string;
    driverId: string;
    driverName: string;
    holderLabel?: string;
    lines: CollectionLine[];
    issuedBy: string;
    note?: string;
    counterparty?: { kind: "office" | "person"; name?: string };
    dueAt?: string;
}): string {
    return requestCollection({ ...input, direction: "return" });
}

/**
 * The driver confirmed. Writes what that means back into inventory.
 *
 * A handed item becomes a VERIFIED line on the signed checklist — the same field the
 * office ticks by hand on the assign page, so the two routes cannot disagree about who
 * has confirmed what. An assigned item has no checklist to verify against, so it gets a
 * trail entry instead of a silently dropped confirmation.
 *
 * Items the driver did NOT tick are left exactly as they were: not collecting something
 * is an answer, and overwriting it with "fine" is how a record starts lying.
 */
export function confirmCollection(collectionId: string, collectedItemIds: string[]): InventoryCollection | null {
    const settled = settleInventoryCollection(collectionId, collectedItemIds);
    if (!settled) return null;
    if (settled.direction === "return") return confirmReturn(settled, collectedItemIds);

    const got = new Set(collectedItemIds);

    // Picking it up does not change where it is filed. It was already assigned to this
    // person — that is why they were asked to come and get it — so all that is recorded
    // here is that they now physically have it.
    for (const l of settled.lines) {
        if (!got.has(l.itemId)) continue;
        logInventoryEvent({
            itemId: l.itemId, accountId: settled.accountId, kind: "verified",
            title: "Collected by driver",
            detail: `${settled.driverName} confirmed they picked this up`,
            by: settled.driverName, role: "Driver",
        });
    }

    // A partial collection is worth saying out loud on the items that did NOT come, so the
    // office can see which ones are still sitting on the shelf.
    for (const l of settled.lines) {
        if (got.has(l.itemId)) continue;
        logInventoryEvent({
            itemId: l.itemId, accountId: settled.accountId, kind: "note",
            title: "Not collected",
            detail: `${settled.driverName} did not pick this up`,
            by: settled.driverName, role: "Driver",
        });
    }

    return settled;
}

/**
 * Every checklist sent to one driver, newest first.
 *
 * Takes the conversations rather than reading the store itself, so the driver app can hand
 * it `useConversations()` and re-render the moment a new list arrives — and so the office
 * chat and the driver app are looking at one set of records, not two.
 */
export function collectionsForDriver(convs: Conversation[], driverId: string): InventoryCollection[] {
    const out: InventoryCollection[] = [];
    for (const c of convs) {
        for (const m of c.messages) {
            if (m.collection && m.collection.driverId === driverId) out.push(m.collection);
        }
    }
    return out.reverse();
}

/**
 * The driver handed kit in. Writes what that means back into inventory.
 *
 * Each route gives it back to a different place, because each one came from a different
 * place:
 *
 *   carried  — it rides in the cab of a vehicle it is filed against, so the vehicle keeps it
 *              and nobody carries it. That gap is the truth while it sits on a shelf between
 *              two drivers, and the list says so: on the vehicle, no driver.
 *   assigned — it was filed against the person, so it goes back to being on nobody.
 *   handed   — it came off a signed checklist, so it comes off that checklist.
 *
 * Items the driver did NOT tick are left exactly as they are. Still having something is an
 * answer, and the office would rather read it than a tidy record of a hand-back that did
 * not happen.
 */
function confirmReturn(settled: InventoryCollection, returnedItemIds: string[]): InventoryCollection {
    const back = new Set(returnedItemIds);

    for (const l of settled.lines) {
        if (!back.has(l.itemId)) continue;
        // The PERSON lets go of it. Any unit it is also filed against keeps it: a fuel card
        // handed in at the office still belongs to the truck it was issued for, and clearing
        // that here would take a second thing off the record nobody asked to change.
        updateInventoryItem(l.itemId, { assignedDriverId: undefined });
        logInventoryEvent({
            itemId: l.itemId, accountId: settled.accountId, kind: "updated",
            title: "Handed back to the office",
            detail: `${settled.driverName} dropped this in`,
            by: settled.driverName, role: "Driver",
        });
    }

    for (const l of settled.lines) {
        if (back.has(l.itemId)) continue;
        logInventoryEvent({
            itemId: l.itemId, accountId: settled.accountId, kind: "note",
            title: "Not handed back",
            detail: `${settled.driverName} still has this`,
            by: settled.driverName, role: "Driver",
        });
    }

    return settled;
}

/** What a vendor is called, for the card's second line. */
export const vendorLabelOf = (item: InventoryItem) => {
    const v = VENDORS.find((x) => x.id === item.vendorId);
    return v?.companyName || v?.name || "—";
};
