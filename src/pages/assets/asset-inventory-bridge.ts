// ─────────────────────────────────────────────────────────────────────────────
// Inventory picked on the Add / Edit Asset form → the inventory record.
//
// The same shape as ownership-docs-bridge, and for the same reason: the wizard can
// only capture the ANSWER, because on a new asset there is no id to file anything
// against until the list assigns one. So the section collects a draft and the save
// path commits it, once.
//
// What gets written is exactly what the Inventory ▸ Assets assign page writes —
// `assignedTo` on the item, plus `alsoDriverOfAsset` when it rides with whoever
// drives the vehicle. Two places that assign an item to a truck must not end up
// with two different ideas of what that means, so the shapes and the trail entries
// are the same on both.
//
// It also owns the half of a driver change that used to be a phone call: what is in
// the cab does not teleport from one driver to the next. The one getting out brings it
// to the office, the one getting in picks it up, and in between the item is on the
// vehicle with nobody carrying it — which is exactly where it is.
// ─────────────────────────────────────────────────────────────────────────────

import { updateInventoryItem, currentInventoryItems } from '@/pages/inventory/inventory-store';
import { logInventoryEvent } from '@/pages/inventory/inventory-activity';
import {
    requestCollection, requestReturn, collectionLineFor, draftReturnNote, draftCollectionNote,
} from '@/pages/inventory/inventory-collection';
import {
    loadHandover, saveHandover, appendLines, removeLines, HANDOVER_CATEGORIES,
} from '@/pages/inventory/handovers.data';
import { VENDORS } from '@/pages/inventory/inventory.data';
import { todayISO } from '@/pages/hiring-process/FormKit';
import { driverOfAsset, type Assignment, type InventoryItem } from '@/pages/inventory/inventory.data';

/**
 * What this carrier's inventory looks like right now, for the save path.
 *
 * Re-read at commit time rather than carried down from the form: the wizard may have been
 * open a while, and an item somebody else assigned in the meantime is no longer free.
 */
export const inventoryItemsForCarrier = currentInventoryItems;

/**
 * Who drives the vehicle, asked the one way the whole app asks it.
 *
 * Called after the asset has been registered into the fleet, so this reads the driver
 * assignment the form just saved — the same lookup the inventory list's Driver column and
 * the assign page use.
 */
export function currentDriverOf(accountId: string | undefined, assetId: string) {
    return driverOfAsset(assetId, accountId);
}

/** Whether something can be signed across a counter at all — the Hand Over page's rule. */
export function canBeHandedOver(item: InventoryItem): boolean {
    const v = VENDORS.find((x) => x.id === item.vendorId);
    return !!v && HANDOVER_CATEGORIES.includes(v.categoryId);
}

/** What the Inventory section of the asset wizard collects. */
export interface AssetInventoryDraft {
    /** Items to file against this vehicle. */
    itemIds: string[];
    /** Items to put on the driver's signed hand-over checklist instead. */
    handIds: string[];
    /**
     * Items already on this vehicle, being taken back off it.
     *
     * Only ones this vehicle's own record put there — see `removeActionFor`. A remove the
     * next render puts straight back is a lie.
     */
    removeIds: string[];
    /** Ask whoever is holding the removed kit to bring it in. */
    askBack: boolean;
    askBackNote: string;
    /** The assigned ones ride with whoever drives it, rather than staying with the vehicle. */
    carried: boolean;
    /** Message the driver to come and collect them. */
    notify: boolean;
    note: string;
    /**
     * The driver is changing, and what is in the cab has to move with them.
     *
     * Part of the same save because it is the same decision: nobody changes the driver on a
     * truck and separately remembers that its fuel card is in the old driver's pocket.
     */
    changeover: {
        /**
         * Who was driving it before this save.
         *
         * Carried here rather than worked out at commit time: by then the vehicle already
         * says who drives it now, and the person who has the fuel card in their pocket is
         * the one it no longer names.
         */
        outgoing: { id: string; name: string } | null;
        /** Items in the cab to move. Empty means there is nothing to move. */
        itemIds: string[];
        /** Ask the outgoing driver to bring them in. */
        askReturn: boolean;
        returnNote: string;
        /** Tell the incoming driver to pick them up. */
        tellIncoming: boolean;
        incomingNote: string;
    };
}

export const emptyAssetInventoryDraft = (): AssetInventoryDraft => ({
    itemIds: [],
    handIds: [],
    removeIds: [],
    askBack: true,
    askBackNote: '',
    carried: false,
    notify: true,
    note: '',
    changeover: {
        outgoing: null, itemIds: [], askReturn: true, returnNote: '',
        tellIncoming: true, incomingNote: '',
    },
});

export interface AssetInventoryResult {
    /** How many items were filed against the vehicle. */
    assigned: number;
    /** How many went onto the driver's signed hand-over checklist. */
    handedOver: number;
    /** Who was told to collect them, if anyone. */
    told: string | null;
    /** Who was asked to bring the cab's kit back, if anyone. */
    askedBack: string | null;
    /** How many items are sitting at the office between two drivers. */
    inTransit: number;
    /** How many came back off the vehicle. */
    removed: number;
}

/**
 * File the picked items against the asset, and tell the driver if asked.
 *
 * Called from the save path once the asset has an id — on Register Asset that is only
 * after the list assigns one, which is why this is not done inside the form.
 *
 * Nothing is sent to a driver for kit that merely LIVES on the vehicle: a spare key in a
 * yarded truck is nobody's to come and collect, so the message needs `carried` and a
 * driver, the same rule the Add Inventory form applies.
 */
export function commitAssetInventory(input: {
    accountId: string | undefined;
    assetId: string;
    assetLabel: string;
    assetKind: 'cmv' | 'non-cmv';
    items: InventoryItem[];
    draft: AssetInventoryDraft;
    driver: { id: string; name: string } | null;
    capturedBy: string;
}): AssetInventoryResult {
    const { accountId, assetId, assetLabel, assetKind, draft, driver, capturedBy } = input;
    const acct = accountId ?? 'acct-001';
    const byId = (id: string) => input.items.find((it) => it.id === id);
    const picked = draft.itemIds.map(byId).filter(Boolean) as InventoryItem[];
    const handed = draft.handIds.map(byId).filter(Boolean) as InventoryItem[];
    const moving = draft.changeover.itemIds.map(byId).filter(Boolean) as InventoryItem[];
    const removing = draft.removeIds.map(byId).filter(Boolean) as InventoryItem[];
    const nothingToDo = picked.length === 0 && handed.length === 0
        && moving.length === 0 && removing.length === 0;
    if (!assetId || nothingToDo) {
        return { assigned: 0, handedOver: 0, told: null, askedBack: null, inTransit: 0, removed: 0 };
    }

    // — 1. The cab empties
    // The outgoing driver is not carrying it the moment the office says they are handing it
    // in, so the flag comes off now rather than when they get round to confirming. Until
    // somebody picks it up the item is on the vehicle with nobody carrying it, which is
    // exactly where it is: a shelf in the office.
    for (const item of moving) {
        if (item.assignedTo && item.assignedTo.kind !== 'driver') {
            const { alsoDriverOfAsset: _wasCarried, ...staysWithVehicle } = item.assignedTo;
            updateInventoryItem(item.id, { assignedTo: staysWithVehicle });
        }
        logInventoryEvent({
            itemId: item.id, accountId: acct, kind: 'updated',
            title: 'Off the cab',
            detail: `${assetLabel} changed driver — waiting at the office`,
            by: capturedBy, role: 'Office',
        });
    }

    // — 1b. Coming back off the vehicle
    // Each route is undone where its record lives: a direct assignment is cleared, a signed
    // hand-over line comes off the checklist. `removedRoutes` remembers which was which, so
    // the message afterwards can say what it is actually asking for.
    // Which it is comes from the record itself, not from a flag the form passes down: the
    // form reads the same checklist, so both sides cannot disagree about what an item is.
    const checklist = driver ? loadHandover(acct, driver.id) : undefined;
    const onChecklist = new Set(checklist?.lines.map((l) => l.itemId) ?? []);
    const removedRoutes = new Map<string, "unassign" | "unhand">();
    if (removing.length) {
        const handedLines = removing.filter((it) => onChecklist.has(it.id));
        for (const item of removing) {
            const asHandover = onChecklist.has(item.id);
            removedRoutes.set(item.id, asHandover ? 'unhand' : 'unassign');
            if (!asHandover) updateInventoryItem(item.id, { assignedTo: undefined });
            logInventoryEvent({
                itemId: item.id, accountId: acct, kind: 'updated',
                title: asHandover ? 'Returned by driver' : 'Unassigned',
                detail: asHandover
                    ? `Taken off ${driver?.name ?? 'the driver'}'s hand-over checklist`
                    : `Taken back from ${assetLabel}`,
                by: capturedBy, role: 'Office',
            });
        }
        if (handedLines.length && driver) {
            const rec = loadHandover(acct, driver.id);
            if (rec) saveHandover(removeLines(rec, handedLines.map((it) => it.id)));
        }
    }

    // — 2. What is being given out
    const assignedTo: Assignment = {
        kind: assetKind,
        targetId: assetId,
        ...(draft.carried ? { alsoDriverOfAsset: true } : {}),
    };

    for (const item of picked) {
        updateInventoryItem(item.id, { assignedTo });
        logInventoryEvent({
            itemId: item.id, accountId: acct, kind: 'assigned',
            title: 'Assigned to vehicle',
            detail: draft.carried && driver ? `${assetLabel} · carried by ${driver.name}` : assetLabel,
            by: capturedBy, role: 'Office',
        });
    }

    // A hand-over is a signed checklist, so it writes the same record the Hand Over page
    // writes — staff sign-off and all — rather than a second kind of hand-over that only
    // this form knows about. Signed by whoever is doing it, not typed.
    if (handed.length && driver) {
        const stamp = Date.now();
        const sign = { name: capturedBy, role: 'Fleet Manager', date: todayISO(), sig: '', done: true };
        const existing = loadHandover(acct, driver.id);
        let rec = existing ?? {
            driverId: driver.id, accountId: acct, checklistName: 'Hand-over',
            lines: [], issuedByName: sign.name, issuedByTitle: 'Fleet Manager',
            verifiedItemIds: [], updatedAt: stamp,
        };
        rec = appendLines(rec, handed.map((it) => ({ itemId: it.id, qty: '1' })));
        saveHandover({ ...rec, staffSignoff: sign, recordedAt: rec.recordedAt ?? stamp, issuedByName: sign.name });
        for (const item of handed) {
            logInventoryEvent({
                itemId: item.id, accountId: acct, kind: 'signed',
                title: 'Handed over to driver',
                detail: `${driver.name} · signed for by ${capturedBy} · drives ${assetLabel}`,
                by: capturedBy, role: 'Office',
            });
        }
    }

    // — 3. Telling people
    // Nothing goes to anyone about kit that never leaves the yard: a spare key in a parked
    // truck is nobody's to come and collect.
    const outgoing = draft.changeover.outgoing;
    const askedBack = draft.changeover.askReturn && outgoing && moving.length > 0;
    if (askedBack) {
        const lines = moving.map((it) => collectionLineFor(it, 'carried'));
        requestReturn({
            accountId: acct,
            driverId: outgoing!.id, driverName: outgoing!.name,
            holderLabel: assetLabel,
            lines,
            issuedBy: capturedBy,
            note: draft.changeover.returnNote.trim()
                || draftReturnNote(outgoing!.name, lines, `${assetLabel} is changing driver`),
        });
    }

    // Something that was in the cab or signed across is in somebody's pocket. Taking it off
    // the vehicle does not move it, so the person holding it is asked to bring it in — the
    // same card, pointed the other way.
    const physical = removing.filter((it) => (
        removedRoutes.get(it.id) === 'unhand' || it.assignedTo?.alsoDriverOfAsset
    ));
    const askedBackHolder = draft.askBack && driver && physical.length > 0 ? driver : null;
    if (askedBackHolder) {
        const lines = physical.map((it) => collectionLineFor(
            it, removedRoutes.get(it.id) === 'unhand' ? 'handed' : 'carried',
        ));
        requestReturn({
            accountId: acct,
            driverId: askedBackHolder.id, driverName: askedBackHolder.name,
            holderLabel: assetLabel,
            lines,
            issuedBy: capturedBy,
            note: draft.askBackNote.trim()
                || draftReturnNote(askedBackHolder.name, lines, `it is coming off ${assetLabel}`),
        });
    }

    // What the driver is being asked to pick up: the cab's kit coming the other way, plus
    // anything given out in this same save. One message, because it is one trip to the office.
    const toCollect: InventoryItem[] = [
        ...(draft.changeover.tellIncoming ? moving : []),
        ...(draft.carried ? picked : []),
        ...handed,
    ];
    const deduped = toCollect.filter((it, i) => toCollect.findIndex((x) => x.id === it.id) === i);
    const canTell = draft.notify && !!driver && deduped.length > 0;
    if (canTell) {
        const handedIds = new Set(handed.map((it) => it.id));
        const movingIds = new Set(moving.map((it) => it.id));
        const lines = deduped.map((it) => collectionLineFor(
            it,
            handedIds.has(it.id) ? 'handed' : movingIds.has(it.id) ? 'carried' : 'assigned',
        ));
        requestCollection({
            accountId: acct,
            driverId: driver!.id, driverName: driver!.name,
            holderLabel: assetLabel,
            lines,
            issuedBy: capturedBy,
            note: draft.note.trim() || draftCollectionNote(driver!.name, lines, handed.length > 0),
        });
    }

    return {
        assigned: picked.length,
        handedOver: handed.length,
        told: canTell ? driver!.name : null,
        askedBack: askedBack ? outgoing!.name : askedBackHolder ? askedBackHolder.name : null,
        inTransit: moving.length,
        removed: removing.length,
    };
}

