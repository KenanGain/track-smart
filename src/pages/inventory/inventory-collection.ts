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
    type CollectionLine, type Conversation, type InventoryCollection,
} from "@/pages/messages/messages-store";
import { itemName, VENDORS, type InventoryItem } from "./inventory.data";
import {
    loadHandover, saveHandover, handoverStatusOf, removeLines, type DriverHandover,
} from "./handovers.data";
import { logInventoryEvent } from "./inventory-activity";
import { updateInventoryItem, currentInventoryItems } from "./inventory-store";

let seq = 0;
const newId = () => `col-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const collectionLineFor = (item: InventoryItem, route: CollectionLine["route"]): CollectionLine => ({
    itemId: item.id,
    name: itemName(item),
    serial: item.serial || undefined,
    route,
});

/** The default wording. Editable everywhere it is offered — the office knows its own yard. */
export function draftCollectionNote(driverName: string, lines: CollectionLine[], anyHanded: boolean): string {
    const who = driverName.trim().split(/\s+/)[0] || "there";
    const what = lines.length === 1 ? "an item" : `${lines.length} items`;
    const list = lines.map((l) => `• ${l.name}${l.serial ? ` (${l.serial})` : ""}`).join("\n");
    return `Hi ${who} — you've been assigned ${what}. Please collect ${lines.length === 1 ? "it" : "them"} from the office:\n${list}\n\n`
        + (anyHanded
            ? "You'll be asked to sign for these when you pick them up."
            : "Tick them off below once you have them.");
}

/**
 * The default wording when the office wants kit BACK.
 *
 * Usually because the vehicle is changing hands: what is in the cab has to come through the
 * office, or the next driver is chasing a fuel card that is in somebody else's pocket.
 */
export function draftReturnNote(driverName: string, lines: CollectionLine[], reason?: string): string {
    const who = driverName.trim().split(/\s+/)[0] || "there";
    const what = lines.length === 1 ? "an item" : `${lines.length} items`;
    const list = lines.map((l) => `• ${l.name}${l.serial ? ` (${l.serial})` : ""}`).join("\n");
    return `Hi ${who} — could you drop ${what} back to the office${reason ? `, ${reason}` : ""}:\n${list}\n\n`
        + "Tick them off below once you have handed them in.";
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
}): string {
    const back = input.direction === "return";
    const collection: InventoryCollection = {
        id: newId(),
        accountId: input.accountId,
        driverId: input.driverId,
        driverName: input.driverName,
        holderLabel: input.holderLabel,
        lines: input.lines,
        issuedBy: input.issuedBy,
        note: input.note,
        direction: back ? "return" : "collect",
        status: "pending",
    };
    const convId = sendInventoryCollection(collection, input.note);
    for (const line of input.lines) {
        logInventoryEvent({
            itemId: line.itemId, accountId: input.accountId, kind: "message",
            title: back ? "Asked to hand back to the office" : "Asked to collect from the office",
            detail: back
                ? `${input.driverName} was asked to bring this in`
                : `${input.driverName} was sent a collection list`,
            by: input.issuedBy, role: "Office",
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
    const handed = settled.lines.filter((l) => l.route === "handed" && got.has(l.itemId));

    if (handed.length) {
        const rec: DriverHandover | undefined = loadHandover(settled.accountId, settled.driverId);
        if (rec) {
            const verified = new Set(rec.verifiedItemIds ?? []);
            // Only lines still on the checklist can be verified — an item taken back while the
            // message sat unread must not come back as received.
            const onList = new Set(rec.lines.map((l) => l.itemId));
            for (const l of handed) if (onList.has(l.itemId)) verified.add(l.itemId);
            saveHandover({ ...rec, verifiedItemIds: [...verified], updatedAt: Date.now() });
        }
    }

    // A carried item that was waiting at the office is in a cab again. `alsoDriverOfAsset`
    // is what the whole app reads as "the driver of this vehicle has it", so it goes back on
    // — until it does, the list is right to show the vehicle holding it and nobody carrying it.
    const carriedBack = settled.lines.filter((l) => l.route === "carried" && got.has(l.itemId));
    if (carriedBack.length) {
        const items = currentInventoryItems(settled.accountId);
        for (const l of carriedBack) {
            const it = items.find((x) => x.id === l.itemId);
            if (it?.assignedTo && it.assignedTo.kind !== "driver") {
                updateInventoryItem(l.itemId, { assignedTo: { ...it.assignedTo, alsoDriverOfAsset: true } });
            }
        }
    }

    for (const l of settled.lines) {
        if (!got.has(l.itemId)) continue;
        logInventoryEvent({
            itemId: l.itemId, accountId: settled.accountId, kind: "verified",
            title: "Collected by driver",
            detail: `${settled.driverName} confirmed they picked this up`
                + (l.route === "handed" ? " — receipt recorded on the hand-over" : ""),
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
    const items = currentInventoryItems(settled.accountId);

    const handedBack = settled.lines.filter((l) => l.route === "handed" && back.has(l.itemId));
    if (handedBack.length) {
        const rec: DriverHandover | undefined = loadHandover(settled.accountId, settled.driverId);
        if (rec) saveHandover(removeLines(rec, handedBack.map((l) => l.itemId)));
    }

    for (const l of settled.lines) {
        if (!back.has(l.itemId)) continue;
        const it = items.find((x) => x.id === l.itemId);
        if (l.route === "carried" && it?.assignedTo && it.assignedTo.kind !== "driver") {
            const { alsoDriverOfAsset: _dropped, ...stays } = it.assignedTo;
            updateInventoryItem(l.itemId, { assignedTo: stays });
        } else if (l.route === "assigned") {
            updateInventoryItem(l.itemId, { assignedTo: undefined });
        }
        logInventoryEvent({
            itemId: l.itemId, accountId: settled.accountId, kind: "updated",
            title: "Handed back to the office",
            detail: `${settled.driverName} dropped this in`
                + (l.route === "carried" ? " — waiting for the next driver" : ""),
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

/** Whether a driver's hand-over now reads as fully verified — for the office-side badge. */
export function handoverStatusFor(accountId: string, driverId: string) {
    return handoverStatusOf(loadHandover(accountId, driverId));
}

/** What a vendor is called, for the card's second line. */
export const vendorLabelOf = (item: InventoryItem) => {
    const v = VENDORS.find((x) => x.id === item.vendorId);
    return v?.companyName || v?.name || "—";
};
