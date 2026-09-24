// ─────────────────────────────────────────────────────────────────────────────
// Who holds an inventory item — the vehicle, and the person.
//
// Lives apart from any one page because two of them ask the same question: the List
// shows Asset and Driver as columns, and Monitoring shows who is holding the thing
// that is about to expire. Answering it twice would let the two drift, and the
// "three ways a driver holds an item" rule below is exactly the kind of thing that
// gets updated in one place and forgotten in the other.
// ─────────────────────────────────────────────────────────────────────────────

import { ACME_ASSETS, ACME_DRIVERS, driverOfAsset, type Assignment } from "./inventory.data";
import { CARRIER_ASSETS } from "@/pages/accounts/carrier-assets.data";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-drivers.data";
import type { HandoverStatus } from "./handovers.data";

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

/**
 * Is this item assigned — that is, is it on a vehicle?
 *
 * The only question assignment answers. An item filed against a person is left over from
 * before inventory moved onto the vehicle, and a hand-over is a separate fact about who is
 * carrying something, not about what it is assigned to. Counting either as "assigned" is
 * how the Assigned chip and the Unassigned tile ended up disagreeing about the same item.
 */
export const itemOnAsset = (a: Assignment | undefined): boolean =>
    !!a && (a.kind === "cmv" || a.kind === "non-cmv");

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
 * The PERSON holding an item, and how they came to hold it. Three routes, in order:
 *
 *   assigned  — the item is filed against the driver directly.
 *   drives    — the item goes with a vehicle and is carried by whoever drives it. The driver is
 *               read off the vehicle NOW, so a change of driver cannot leave the item pointing
 *               at the one who handed it back.
 *   handed    — the item is on a driver's signed hand-over checklist.
 *
 * A direct assignment outranks a hand-over because it is the item's own record of where it
 * belongs; the hand-over says who physically took it, which is shown as the sub-line when it
 * is the only thing we know.
 */
export function resolveDriver(
    a: Assignment | undefined,
    accountId: string | undefined,
    handedTo: { driverId: string; status: HandoverStatus } | undefined,
) {
    if (a?.kind === "driver") {
        const drivers = driversFor(accountId);
        const d = drivers.find((x: any) => x.id === a.targetId) ?? ACME_DRIVERS.find((x) => x.id === a.targetId);
        if (!d) return { id: a.targetId, label: "—", sub: "Unknown driver", via: "assigned" as const };
        const name = (d as any).name ?? `${(d as any).firstName ?? ""} ${(d as any).lastName ?? ""}`.trim();
        return {
            id: (d as any).id as string,
            label: name || "—",
            sub: (d as any).licenseNumber ? `License ${(d as any).licenseNumber}` : "Assigned directly",
            via: "assigned" as const,
        };
    }
    if (a && a.alsoDriverOfAsset) {
        const held = driverOfAsset(a.targetId, accountId);
        if (held) return { id: held.id, label: held.name, sub: "Drives this vehicle", via: "drives" as const };
    }
    if (handedTo) {
        const name = driverNameOf(handedTo.driverId, accountId);
        if (name) {
            return {
                id: handedTo.driverId,
                label: name,
                sub: handedTo.status === "verified" ? "Hand-over verified" : "Handed over",
                via: "handed" as const,
            };
        }
    }
    return null;
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
