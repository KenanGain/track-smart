// ─────────────────────────────────────────────────────────────────────────────
// Who holds an inventory item — the vehicle, and the person.
//
// Lives apart from any one page because two of them ask the same question: the List
// shows Asset and Driver as columns, and Monitoring shows who is holding the thing
// that is about to expire. Answering it twice would let the two drift, and the
// "three ways a driver holds an item" rule below is exactly the kind of thing that
// gets updated in one place and forgotten in the other.
// ─────────────────────────────────────────────────────────────────────────────

import {
    ACME_ASSETS, ACME_DRIVERS, itemAssetAssignment, itemDriverId,
    type Assignment, type InventoryItem,
} from "./inventory.data";
import { CARRIER_ASSETS } from "@/pages/accounts/carrier-assets.data";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-drivers.data";

// Carrier-scoped lookup: prefer the active carrier's drivers / assets, falling back to
// Acme's so the display continues to work for the legacy hand-curated INVENTORY_ITEMS
// that are seeded against Acme ids.
export const driversFor = (accountId: string | undefined) => (accountId && CARRIER_DRIVERS[accountId]) || ACME_DRIVERS;
export const assetsFor = (accountId: string | undefined) => (accountId && CARRIER_ASSETS[accountId]) || ACME_ASSETS;

export const driverNameOf = (driverId: string, accountId: string | undefined): string | null => {
    const d = driversFor(accountId).find((x: any) => x.id === driverId)
        ?? ACME_DRIVERS.find((x) => x.id === driverId);
    if (!d) return null;
    const name = (d as any).name ?? `${(d as any).firstName ?? ""} ${(d as any).lastName ?? ""}`.trim();
    return name || null;
};

/** Is this item filed against a unit? */
export const itemOnAsset = (a: Assignment | undefined): boolean =>
    !!a && (a.kind === "cmv" || a.kind === "non-cmv");

/** The item, for the two questions below. */
type Filed = Pick<InventoryItem, "assignedTo" | "assignedDriverId">;

/** Is a unit answerable for it. */
export const assignedToAsset = (it: Filed): boolean => !!itemAssetAssignment(it);
/** Is a person answerable for it. */
export const assignedToDriver = (it: Filed): boolean => !!itemDriverId(it);

/**
 * Is this item on ANYTHING — a unit, a person, or both.
 *
 * The question the Assigned / Available chips ask. An item can now be on a truck AND on
 * the driver of that truck, and a list that answered "Available" for something already in
 * somebody’s cab would send the office looking for it on a shelf.
 */
export const itemAssigned = (it: Filed): boolean => assignedToAsset(it) || assignedToDriver(it);

/**
 * The VEHICLE an item is assigned to, or null when it is not on one.
 *
 * Split out of the old combined "Assigned To" cell: a truck and a driver are two different
 * facts about an item, and folding them into one column meant an item on a truck showed no
 * driver and an item on a driver showed no truck, in the same space, with nothing to say
 * which you were looking at.
 */
export function resolveAsset(a: Assignment | undefined, accountId: string | undefined) {
    if (!a || a.kind === "driver") return null;
    const kindLabel = a.kind === "cmv" ? "CMV" : "Non-CMV";
    const tone = a.kind === "cmv" ? ("indigo" as const) : ("orange" as const);
    const asset = assetsFor(accountId).find((x: any) => x.id === a.targetId)
        ?? ACME_ASSETS.find((x) => x.id === a.targetId);
    if (!asset) return { id: a.targetId, label: "—", sub: "Unknown asset", kindLabel, tone: "slate" as const };
    return { id: asset.id, label: asset.unitNumber, sub: `${asset.year} ${asset.make} ${asset.model}`, kindLabel, tone };
}

/**
 * The PERSON holding an item. One route, and it is a record rather than an inference:
 * somebody put this item on this driver.
 *
 * There used to be two more. An item could reach a driver by riding along with a unit they
 * happened to drive, or by sitting on a signed hand-over checklist — so the same fuel card
 * could be "on" three people at once depending on which list you were reading, and taking it
 * off one of them did nothing, because the next render read it straight back off the other.
 * An item is on a unit, on a person, or on both, and each of those is a field somebody set.
 */
export function resolveDriver(
    item: Pick<InventoryItem, "assignedTo" | "assignedDriverId">,
    accountId: string | undefined,
) {
    const named = itemDriverId(item);
    if (!named) return null;
    const drivers = driversFor(accountId);
    const d = drivers.find((x: any) => x.id === named) ?? ACME_DRIVERS.find((x) => x.id === named);
    if (!d) return { id: named, label: "—", sub: "Unknown driver", via: "assigned" as const };
    const name = (d as any).name ?? `${(d as any).firstName ?? ""} ${(d as any).lastName ?? ""}`.trim();
    return {
        id: (d as any).id as string,
        label: name || "—",
        sub: (d as any).licenseNumber ? `License ${(d as any).licenseNumber}` : "Assigned directly",
        via: "assigned" as const,
    };
}

export const KIND_TONE: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
};

/**
 * A plain calendar date, read as one.
 *
 * `new Date("2024-05-18")` is UTC midnight, and rendering that in any timezone west of UTC
 * prints the 17th. These dates are typed into a form as days, not instants.
 */
export function parseCalendarDate(d: string): Date | null {
    if (!d) return null;
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
    const dt = iso ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : new Date(d);
    return Number.isNaN(dt.getTime()) ? null : dt;
}

export function fmtDate(d: string): string {
    const dt = parseCalendarDate(d);
    if (!dt) return d || "—";
    return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

/** Whole days from today to `d`; negative once it is in the past. Null when there is no date. */
export function daysUntil(d: string): number | null {
    const dt = parseCalendarDate(d);
    if (!dt) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dt.setHours(0, 0, 0, 0);
    return Math.round((dt.getTime() - today.getTime()) / 86_400_000);
}
