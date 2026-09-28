// ─────────────────────────────────────────────────────────────────────────────
// What a signature on a collection card actually does.
//
// Three things, and they have to happen together:
//
//   · the signed copy is filed as a version on the driver's record, where a
//     receipt gets looked up months later;
//   · the card is marked signed at both ends of the thread, so the office sees
//     the answer without opening a record;
//   · once the last form is signed, the collection settles — because signing the
//     receipt IS confirming the collection. Two separate answers to "what did
//     you take" can disagree, and then the record says both.
//
// It lives here rather than in the card because two surfaces draw that card (the
// chat and the driver app) and a copy of this in each is a copy that drifts. It
// is not in `inventory-forms` because settling needs the collection module,
// which already needs `inventory-forms` — and a cycle between the two is a bug
// waiting for the day somebody adds a top-level constant.
// ─────────────────────────────────────────────────────────────────────────────

import { signCollectionForm, type InventoryCollection } from "@/pages/messages/messages-store";
import { confirmCollection } from "./inventory-collection";
import { commitInventoryForm } from "./inventory-forms";

/** What is left to sign on a card, in the order it is asked for. */
export const pendingForms = (c: InventoryCollection) =>
    (c.forms ?? []).filter((f) => f.status !== "signed");

/**
 * File one signed form, and settle the collection if it was the last one.
 *
 * Returns whether the collection settled, so the surface drawing the card knows whether
 * there is another form to put in front of the person.
 */
export function signAndSettle(input: {
    collection: InventoryCollection;
    defId: string;
    /** Exactly what they ticked. The receipt lists these and nothing else. */
    pickedItemIds: string[];
    /**
     * What they typed and signed.
     *
     * Kept on the filed copy so it can be read back — a receipt you cannot open is a
     * filename. Optional only because a surface that cannot show a form still has to be
     * able to settle a collection.
     */
    filled?: { values: Record<string, string>; sigs: Record<string, string> };
}): { settled: boolean; remaining: number } {
    const { collection, defId, pickedItemIds } = input;
    const picked = new Set(pickedItemIds);
    const lines = collection.lines.filter((l) => picked.has(l.itemId));

    commitInventoryForm({
        accountId: collection.accountId,
        driverId: collection.driverId,
        driverName: collection.driverName,
        defId,
        lines,
        holderLabel: collection.holderLabel,
        issuedBy: collection.issuedBy,
        signedBy: collection.driverName,
        context: collection.holderLabel ? `Collected for ${collection.holderLabel}.` : undefined,
        filled: input.filled,
    });
    signCollectionForm(collection.id, defId, collection.driverName);

    // Everything except the one just signed. Read off the card as it stood rather than
    // re-reading the store: the store has already been written, and asking it again here
    // would make the answer depend on whether the re-render has landed yet.
    const remaining = pendingForms(collection).filter((f) => f.defId !== defId).length;
    if (remaining > 0) return { settled: false, remaining };

    confirmCollection(collection.id, pickedItemIds);
    return { settled: true, remaining: 0 };
}
