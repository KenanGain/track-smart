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
import { planMovements, sendMovements, type Movement } from '@/pages/inventory/inventory-movements';
import {
    counterpartyOf, planKey, sendablePlans, emptyNotifyState, type NotifyState,
} from '@/pages/inventory/notify-state';
import {
    loadHandover, saveHandover, appendLines, removeLines, HANDOVER_CATEGORIES,
} from '@/pages/inventory/handovers.data';
import { VENDORS } from '@/pages/inventory/inventory.data';
import { todayISO } from '@/pages/hiring-process/FormKit';
import { driverOfAsset, itemTravelsWithDriver, type Assignment, type InventoryItem } from '@/pages/inventory/inventory.data';

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
    /**
     * Items already on this vehicle, being taken back off it.
     *
     * Only ones this vehicle's own record put there — see `removeActionFor`. A remove the
     * next render puts straight back is a lie.
     */
    removeIds: string[];
    /** Ask whoever is holding the removed kit to bring it in. */
    askBack: boolean;
    /**
     * The "tell them" block, shared with the Add Inventory form and the assign page: whether
     * to send, where the other end of the trip is, when by, and any wording somebody typed.
     */
    notify: NotifyState;
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
        /** Tell the incoming driver to pick them up. */
        tellIncoming: boolean;
    };
}

export const emptyAssetInventoryDraft = (): AssetInventoryDraft => ({
    itemIds: [],
    removeIds: [],
    askBack: true,
    notify: emptyNotifyState(),
    changeover: { outgoing: null, itemIds: [], askReturn: true, tellIncoming: true },
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
    // Nothing is signed across from this form any more: the item says whether it travels
    // with the driver, so there is no per-assignment hand-over to create. Taking an
    // EXISTING one back is below, and reads the driver's real checklist rather than this.
    const handed: InventoryItem[] = [];
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
    //
    // Whether it rides with the driver is the ITEM's answer, given when it was added:
    // driver returnable travels with whoever drives the vehicle, asset removable stays on
    // it. The form used to ask again, once for the whole batch, which filed a spare key and
    // a fuel card identically.
    const ridesAlong = (item: InventoryItem) => itemTravelsWithDriver(item);
    const filingFor = (item: InventoryItem): Assignment => ({
        kind: assetKind,
        targetId: assetId,
        ...(ridesAlong(item) ? { alsoDriverOfAsset: true } : {}),
    });

    // Anything signed across is filed against the vehicle as well: a hand-over is about who
    // has it in their hands, not about who owns it. Filing only one of the two left a handed
    // item on no vehicle at all.
    const filing = [...picked, ...handed.filter((h) => !picked.some((pk) => pk.id === h.id))];
    for (const item of filing) {
        updateInventoryItem(item.id, { assignedTo: filingFor(item) });
        logInventoryEvent({
            itemId: item.id, accountId: acct, kind: 'assigned',
            title: 'Assigned to vehicle',
            detail: ridesAlong(item) && driver ? `${assetLabel} · carried by ${driver.name}` : assetLabel,
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

    // Everything this save moves, in the one vocabulary that decides who gets told. The
    // planner groups it: a driver taking two things and handing back a third is two
    // messages, not three.
    const physical = removing.filter((it) => (
        removedRoutes.get(it.id) === 'unhand' || it.assignedTo?.alsoDriverOfAsset
    ));
    const askedBackHolder = draft.askBack && driver && physical.length > 0 ? driver : null;

    const movements: Movement[] = [];
    if (askedBack) {
        for (const item of moving) {
            movements.push({ kind: 'unassign-vehicle', item, person: outgoing, holderLabel: assetLabel, carried: true });
        }
    }
    if (draft.changeover.tellIncoming) {
        for (const item of moving) {
            movements.push({ kind: 'assign-vehicle', item, person: driver, holderLabel: assetLabel, carried: true });
        }
    }
    for (const item of picked) {
        movements.push({ kind: 'assign-vehicle', item, person: driver, holderLabel: assetLabel, carried: ridesAlong(item) });
    }
    for (const item of handed) {
        movements.push({ kind: 'hand-over', item, person: driver, holderLabel: assetLabel });
    }
    if (askedBackHolder) {
        for (const item of physical) {
            movements.push({
                kind: removedRoutes.get(item.id) === 'unhand' ? 'take-back' : 'unassign-vehicle',
                item, person: askedBackHolder, holderLabel: assetLabel, carried: true,
            });
        }
    }

    // Nothing is sent about kit that never leaves the yard: a spare key in a parked truck
    // is nobody's to come and collect, which the planner knows rather than each caller.
    // `notify` is the "tell them to collect it" tick, so it silences collections only. A
    // hand-back has its own tick and its own reason to exist: somebody is holding something
    // the office has just taken off the record, and not asking for it back is how a fuel
    // card stays in a pocket with the record saying otherwise.
    const plans = sendablePlans(
        planMovements(movements, {
            counterparty: counterpartyOf(draft.notify),
            dueAt: draft.notify.dueAt || undefined,
        }).map((p) => ({ ...p, note: draft.notify.notes[planKey(p)] ?? p.note })),
        draft.notify,
    );
    sendMovements(plans, { accountId: acct, issuedBy: capturedBy });
    const canTell = plans.some((p) => p.direction === 'collect');

    return {
        assigned: picked.length,
        handedOver: handed.length,
        told: canTell ? driver!.name : null,
        askedBack: askedBack ? outgoing!.name : askedBackHolder ? askedBackHolder.name : null,
        inTransit: moving.length,
        removed: removing.length,
    };
}

