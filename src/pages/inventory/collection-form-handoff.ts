// ─────────────────────────────────────────────────────────────────────────────
// "Open that receipt, for these items."
//
// The router here is a path string, and a receipt needs three things the path
// cannot carry: which collection, which form on it, and — the one that matters —
// exactly which items were ticked. A receipt listing what the office SENT rather
// than what the person took is not a receipt.
//
// So the same one-shot handover the driver app uses: the caller leaves the
// answer behind and navigates; the page picks it up once and clears it. Nothing
// subscribes to it, so a reload lands on a page with nothing to sign and says so
// rather than signing the wrong thing.
// ─────────────────────────────────────────────────────────────────────────────

export const COLLECTION_FORM_PATH = "/inventory/sign-form";

export interface CollectionFormRequest {
    collectionId: string;
    defId: string;
    /** Exactly what they ticked. */
    pickedItemIds: string[];
    /** Where to go when it is signed, or abandoned. */
    returnTo: string;
}

let pending: CollectionFormRequest | null = null;

export function openCollectionForm(req: CollectionFormRequest): void {
    pending = req;
}

/** The request, if somebody made one. Reading it consumes it. */
export function consumeCollectionForm(): CollectionFormRequest | null {
    const r = pending;
    pending = null;
    return r;
}
