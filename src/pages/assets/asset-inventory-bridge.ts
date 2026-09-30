// ─────────────────────────────────────────────────────────────────────────────
// Inventory picked on the Add / Edit Asset form → the inventory record.
//
// The same shape as ownership-docs-bridge, and for the same reason: the wizard can
// only capture the ANSWER, because on a new asset there is no id to file anything
// against until the list assigns one. So the section collects a draft and the save
// path commits it, once.
//
// What gets written is exactly what the Inventory ▸ Assets assign page writes, and no
// more: `assignedTo` on the item, naming this unit. Whether a person is also answerable
// for that item is a separate field, set on the driver's own page — so registering a
// truck cannot put something in somebody's pocket, and changing a truck's driver cannot
// quietly take it out again.
//
// This file used to own the other half of that: a driver changeover, a signed hand-over
// checklist, and messages asking people to bring kit to the office. All three rested on
// the same assumption — that what is on a truck is in the hands of whoever drives it —
// and that assumption is gone. An item is on a unit, on a person, or on both, and each
// one is a field somebody set.
// ─────────────────────────────────────────────────────────────────────────────

import { updateInventoryItem, currentInventoryItems } from '@/pages/inventory/inventory-store';
import { logInventoryEvent } from '@/pages/inventory/inventory-activity';
import { type Assignment, type InventoryItem } from '@/pages/inventory/inventory.data';

/**
 * What this carrier's inventory looks like right now, for the save path.
 *
 * Re-read at commit time rather than carried down from the form: the wizard may have been
 * open a while, and an item somebody else assigned in the meantime is no longer free.
 */
export const inventoryItemsForCarrier = currentInventoryItems;

/** What the Inventory section of the asset wizard collects. */
export interface AssetInventoryDraft {
    /** Items to file against this vehicle. */
    itemIds: string[];
    /**
     * Items already on this vehicle, being taken back off it.
     *
     * Only ones this vehicle's own record put there — see `removeActionFor`. A remove the
     * next render puts straight back is a lie.
     */
    removeIds: string[];
}

export const emptyAssetInventoryDraft = (): AssetInventoryDraft => ({
    itemIds: [],
    removeIds: [],
});

export interface AssetInventoryResult {
    /** How many items were filed against the vehicle. */
    assigned: number;
    /** How many came back off it. */
    removed: number;
}

/**
 * File the picked items against the asset.
 *
 * Called from the save path once the asset has an id — on Register Asset that is only
 * after the list assigns one, which is why this is not done inside the form.
 *
 * Nobody is told anything. A unit is not a person, and the one message that would make
 * sense here — come and collect this — belongs on the page where a person is the subject.
 */
export function commitAssetInventory(input: {
    accountId: string | undefined;
    assetId: string;
    assetLabel: string;
    assetKind: 'cmv' | 'non-cmv';
    items: InventoryItem[];
    draft: AssetInventoryDraft;
    capturedBy: string;
}): AssetInventoryResult {
    const { accountId, assetId, assetLabel, assetKind, draft, capturedBy } = input;
    const acct = accountId ?? 'acct-001';
    const byId = (id: string) => input.items.find((it) => it.id === id);
    const picked = draft.itemIds.map(byId).filter(Boolean) as InventoryItem[];
    const removing = draft.removeIds.map(byId).filter(Boolean) as InventoryItem[];

    if (!assetId || (picked.length === 0 && removing.length === 0)) {
        return { assigned: 0, removed: 0 };
    }

    // — Coming back off the vehicle.
    // The UNIT lets go of it. Any person also answerable for it keeps it: they still have
    // the thing, and clearing that here would take a second fact off the record nobody
    // asked to change.
    for (const item of removing) {
        updateInventoryItem(item.id, { assignedTo: undefined });
        logInventoryEvent({
            itemId: item.id, accountId: acct, kind: 'updated',
            title: 'Unassigned', detail: `Taken back from ${assetLabel}`,
            by: capturedBy, role: 'Office',
        });
    }

    // — Going onto it.
    const filing: Assignment = { kind: assetKind, targetId: assetId };
    for (const item of picked) {
        updateInventoryItem(item.id, { assignedTo: filing });
        logInventoryEvent({
            itemId: item.id, accountId: acct, kind: 'assigned',
            title: 'Assigned to vehicle', detail: assetLabel,
            by: capturedBy, role: 'Office',
        });
    }

    return { assigned: picked.length, removed: removing.length };
}
