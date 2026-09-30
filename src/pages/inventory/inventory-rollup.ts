// ─────────────────────────────────────────────────────────────────────────────
// Inventory counted the other way round: per driver, and per asset.
//
// The List answers "where is this item"; these answer "what is this person / this
// truck holding". Same facts, pivoted — which is why the pivot is done here rather
// than in either page, so a change to how an item reaches a holder lands in both.
//
// Two decisions worth knowing about:
//
//   · Holders with NOTHING still appear. "How many items is this driver holding"
//     has zero as a real answer, and a roster that silently drops its empty rows
//     cannot be used to find the driver nobody has issued anything to.
//
//   · An item counts for exactly ONE driver and ONE asset. A fuel card on a truck
//     carried by its driver is one card, not two; it is counted against the truck
//     under Assets and against the driver under Drivers, and the `via` breakdown
//     says which route put it there.
// ─────────────────────────────────────────────────────────────────────────────

import {
    goesToAsset, goesToDriver, inventoryMonitoring, itemAssetAssignment,
    itemDriverId, itemTravelsWithDriver, type InventoryItem,
} from "./inventory.data";
import { driversFor, assetsFor, resolveAsset, resolveDriver, daysUntil } from "./inventory-assignment";

export type HolderKind = "driver" | "asset";

/**
 * The two things an item can be, which is the item's own answer:
 *
 *   returnable — travels with whoever drives the vehicle. Somebody has it, and it has to
 *                come back when they stop driving it.
 *   removable  — fitted to the vehicle. Nobody carries it; it comes off with a spanner.
 *
 * This replaced "direct / carried / handed", which described how an item REACHED a holder
 * and needed three words because inventory could be filed against a person, against a
 * vehicle, or onto a signed checklist. It is filed against a vehicle now, always, so how it
 * got there was never a question worth a column.
 */
export type HeldVia = "returnable" | "removable";
export type ViaCounts = Record<HeldVia, number>;

/** One item on a holder's pile. */
export type HeldItem = { item: InventoryItem; via: HeldVia };

export const VIA_LABEL: Record<HolderKind, Record<HeldVia, string>> = {
    driver: { returnable: "Returnable", removable: "On the vehicle" },
    asset: { returnable: "Driver returnable", removable: "Asset removable" },
};

export const VIA_TONE: Record<HeldVia, { chip: string; bar: string; text: string }> = {
    returnable: { chip: "border-blue-200 bg-blue-50 text-blue-700", bar: "bg-blue-400", text: "text-blue-700" },
    removable: { chip: "border-slate-200 bg-slate-50 text-slate-600", bar: "bg-slate-400", text: "text-slate-600" },
};

/** Which of the two an item is. One resolver, so every list agrees. */
export const viaOf = (item: InventoryItem): HeldVia =>
    itemTravelsWithDriver(item) ? "returnable" : "removable";

const NO_COUNTS = (): ViaCounts => ({ returnable: 0, removable: 0 });

export type HolderRow = {
    id: string;
    label: string;
    sub: string;
    status: string;
    statusTone: "emerald" | "amber" | "rose" | "slate";
    /** Assets only — CMV / Non-CMV. */
    kindLabel?: string;
    items: HeldItem[];
    via: ViaCounts;
    /** Items running out within 30 days, and items already past their date. */
    expiring: number;
    expired: number;
    /** Items with an expiry date and no alert armed — the ones that lapse quietly. */
    unwatched: number;
};

const DRIVER_TONE: Record<string, HolderRow["statusTone"]> = {
    Active: "emerald", "On Leave": "amber", Inactive: "slate", Terminated: "rose",
};
const ASSET_TONE: Record<string, HolderRow["statusTone"]> = {
    Active: "emerald", Maintenance: "amber", OutOfService: "rose", Deactivated: "slate", Drafted: "slate",
};

const ASSET_STATUS_LABEL: Record<string, string> = {
    Active: "Active", Maintenance: "Maintenance", OutOfService: "Out of service",
    Deactivated: "Deactivated", Drafted: "Draft",
};

/** The health of one holder's pile, counted once so the table does not recount per cell. */
function tally(held: HeldItem[]) {
    let expiring = 0, expired = 0, unwatched = 0;
    for (const { item: it } of held) {
        if (!it.expiryDate) continue;
        const days = daysUntil(it.expiryDate);
        if (days === null) continue;
        if (days < 0) expired++;
        else if (days <= 30) expiring++;
        // An expiry nobody is alerted about is a gap, not a state — counted whether or
        // not the date is close, because the point is that nothing will announce it.
        if (!inventoryMonitoring(it).enabled) unwatched++;
    }
    return { expiring, expired, unwatched };
}

export function rollupByDriver(
    items: InventoryItem[],
    accountId: string | undefined,
): HolderRow[] {
    const byId = new Map<string, HeldItem[]>();
    const via = new Map<string, ViaCounts>();

    // Three ways a driver comes to hold something, all three decided by `resolveDriver`:
    // filed against them, riding along with the unit they drive, or signed for on a
    // hand-over. The "rides along" route already checks the item’s own ticks, so there is
    // nothing left for this loop to second-guess.
    for (const item of items) {
        // Ticked for a driver, or it does not belong on a driver’s page at all. A reefer
        // sensor reaches a person only by accident — a stale field, a hand-over somebody
        // filed wrong — and listing it under their name asks them to hand back something
        // that is bolted to a trailer.
        if (!goesToDriver(item)) continue;
        const held = resolveDriver(item, accountId);
        if (!held) continue;
        if (!byId.has(held.id)) { byId.set(held.id, []); via.set(held.id, NO_COUNTS()); }
        byId.get(held.id)!.push({ item, via: "returnable" });
        via.get(held.id)!.returnable++;
    }

    const rows: HolderRow[] = driversFor(accountId).map((d: any) => {
        const mine = byId.get(d.id) ?? [];
        const name = d.name ?? `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim();
        return {
            id: d.id,
            label: name || "—",
            sub: d.driverType || d.terminal || "—",
            status: d.status ?? "Active",
            statusTone: DRIVER_TONE[d.status] ?? "slate",
            items: mine,
            via: via.get(d.id) ?? NO_COUNTS(),
            ...tally(mine),
        };
    });

    // A holder the roster does not know about still holds things — an item pointing at a
    // driver who has left is exactly what somebody needs to find, not something to hide.
    for (const [id, mine] of byId) {
        if (rows.some((r) => r.id === id)) continue;
        rows.push({
            id, label: "Unknown driver", sub: `id ${id}`, status: "Off roster", statusTone: "rose",
            items: mine, via: via.get(id)!, ...tally(mine),
        });
    }
    return sortRows(rows);
}

export function rollupByAsset(
    items: InventoryItem[],
    accountId: string | undefined,
): HolderRow[] {
    const byId = new Map<string, HeldItem[]>();
    const via = new Map<string, ViaCounts>();

    for (const item of items) {
        // Same rule, the other way round: a unit’s page lists what is ticked for a unit.
        // A hi-vis vest sized to a person is not the truck’s to hand back.
        if (!goesToAsset(item)) continue;
        const on = resolveAsset(itemAssetAssignment(item), accountId);
        if (!on) continue;
        if (!byId.has(on.id)) { byId.set(on.id, []); via.set(on.id, NO_COUNTS()); }
        // What it IS, not how it arrived: the item answers this on its own form.
        const route = viaOf(item);
        byId.get(on.id)!.push({ item, via: route });
        via.get(on.id)![route]++;
    }

    const rows: HolderRow[] = assetsFor(accountId).map((a: any) => {
        const mine = byId.get(a.id) ?? [];
        return {
            id: a.id,
            label: a.unitNumber,
            sub: [a.year, a.make, a.model].filter(Boolean).join(" "),
            status: ASSET_STATUS_LABEL[a.operationalStatus] ?? a.operationalStatus ?? "—",
            statusTone: ASSET_TONE[a.operationalStatus] ?? "slate",
            kindLabel: a.assetCategory === "Non-CMV" ? "Non-CMV" : "CMV",
            items: mine,
            via: via.get(a.id) ?? NO_COUNTS(),
            ...tally(mine),
        };
    });

    for (const [id, mine] of byId) {
        if (rows.some((r) => r.id === id)) continue;
        rows.push({
            id, label: "Unknown asset", sub: `id ${id}`, status: "Off roster", statusTone: "rose",
            kindLabel: "—", items: mine, via: via.get(id)!, ...tally(mine),
        });
    }
    return sortRows(rows);
}

/**
 * Most-loaded first, then alphabetical.
 *
 * Sorting by name alone buries the answer: on a roster of forty drivers the two carrying
 * fifteen items each are the reason the page was opened, and they should not be somewhere
 * in the middle of the alphabet.
 */
function sortRows(rows: HolderRow[]): HolderRow[] {
    return rows.sort((a, b) =>
        b.items.length - a.items.length || a.label.localeCompare(b.label));
}

/**
 * Items on nobody at all — the only ones the assignment picker offers.
 *
 * "Not assigned" has to mean not on a vehicle, not on a person, AND not out on a signed
 * hand-over. An item already in somebody's hands is not free to give away, and offering it
 * would let two holders be told they have the same thing.
 */
/**
 * How a held item can be taken back from this holder, if at all.
 *
 * Only what is filed against THIS holder can be let go of here. A row that got onto this
 * page some other way cannot be undone from it — there is no such row any more, but the
 * null is kept so a stale record cannot grow a button that does nothing.
 */
export type RemoveAction = "unassign" | null;

export function removeActionFor(h: HeldItem, kind: HolderKind, holderId: string): RemoveAction {
    // Each holder can let go of what is filed against IT. A driver carrying the fuel card
    // of a truck they happen to drive is not one of those: that line is the truck’s record,
    // the next render reads it straight back, and a button here would undo nothing.
    if (kind === "driver") return itemDriverId(h.item) === holderId ? "unassign" : null;
    return itemAssetAssignment(h.item)?.targetId === holderId ? "unassign" : null;
}

/**
 * What this holder can still be given.
 *
 * Free FOR THIS KIND of holder, which is not the same as free altogether: a fuel card on a
 * truck and on its driver is fully filed, while the same card on the truck alone is still
 * waiting for somebody to be made answerable for it. And the item has to be ticked for this
 * kind at all — offering a reefer sensor on a driver’s page is offering nonsense.
 */
export function assignableTo(items: InventoryItem[], kind: HolderKind): InventoryItem[] {
    return items.filter((it) => kind === "driver"
        ? goesToDriver(it) && !itemDriverId(it)
        : goesToAsset(it) && !itemAssetAssignment(it));
}

export function unassignedItems(items: InventoryItem[]): InventoryItem[] {
    return items.filter((it) => !itemAssetAssignment(it) && !itemDriverId(it));
}

export function rollupTotals(rows: HolderRow[]) {
    let assigned = 0, expiring = 0, expired = 0, unwatched = 0, withItems = 0;
    for (const r of rows) {
        assigned += r.items.length;
        expiring += r.expiring;
        expired += r.expired;
        unwatched += r.unwatched;
        if (r.items.length) withItems++;
    }
    return { holders: rows.length, withItems, none: rows.length - withItems, assigned, expiring, expired, unwatched };
}
