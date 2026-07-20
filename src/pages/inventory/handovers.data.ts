import { useEffect, useState } from "react";
import { todayISO, type SignOffData } from "../hiring-process/FormKit";
import {
    getInventoryForCarrier, INVENTORY_ITEMS, VENDORS, VENDOR_CATEGORIES,
    type InventoryItem,
} from "./inventory.data";

// Driver hand-over records — the inventory hand-over workflow, managed here in
// Inventory and modelled on the onboarding Accessories step:
//   1. A manager issues a hand-over checklist (which keys / devices / cards /
//      PPE / equipment a driver is being given) and assigns the task to a staff
//      member who physically hands the items over and signs.
//   2. The driver confirms they received the same items and signs.
// One record per driver (per carrier); it can be re-opened and edited. Persisted
// to localStorage with a change event so any open view stays in sync — the same
// pattern as the other inventory / accessory stores.

export type HandoverLine = { itemId: string; qty: string };

export type DriverHandover = {
    driverId: string;
    accountId: string;
    /** Name given to this hand-over checklist (e.g. "Standard driver kit"). */
    checklistName?: string;
    lines: HandoverLine[];
    issuedByName: string;
    issuedByTitle: string;
    vehicle?: string;
    employeeId?: string;
    /** Staff member (an app user) assigned to physically hand the items over. */
    assigneeId?: string;
    assigneeName?: string;
    /** Step 1 — the staff member confirms & signs the items were handed over. */
    staffSignoff?: SignOffData;
    /** Step 2 — the driver confirms & signs they received the items. */
    driverSignoff?: SignOffData;
    /** Item ids the driver ticked as received during verification. */
    verifiedItemIds?: string[];
    updatedAt: number;
    /** Set when the items are formally handed over (staff sign-off complete). */
    recordedAt?: number;
};

export type HandoverStatus = "not-issued" | "handed-over" | "verified";

/**
 * Where a record sits in the two-checklist workflow:
 *   not-issued  — no items handed over yet (staff hasn't assigned/signed).
 *   handed-over — assigned & handed over, but the driver hasn't confirmed the
 *                 full current list (incl. any items added after hand-over).
 *   verified    — handed over AND the driver signed AND every item on the
 *                 current list is ticked as received.
 */
export function handoverStatusOf(rec?: DriverHandover): HandoverStatus {
    if (!rec || !rec.staffSignoff?.done || rec.lines.length === 0) return "not-issued";
    const verified = new Set(rec.verifiedItemIds ?? []);
    const allVerified = rec.lines.length > 0 && rec.lines.every((l) => verified.has(l.itemId));
    if (rec.driverSignoff?.done && allVerified) return "verified";
    return "handed-over";
}

const HO_KEY = "inv_driver_handovers_v1";
const HO_EVENT = "inv-driver-handovers-change";

const keyOf = (accountId: string, driverId: string) => `${accountId}::${driverId}`;

function loadAll(): Record<string, DriverHandover> {
    try {
        const raw = localStorage.getItem(HO_KEY);
        if (raw) return JSON.parse(raw) as Record<string, DriverHandover>;
    } catch { /* ignore */ }
    return {};
}
function persist(all: Record<string, DriverHandover>) {
    localStorage.setItem(HO_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent(HO_EVENT));
}

/**
 * Item ids that are already on *another* driver's hand-over list. Once an item
 * has been picked for a driver it belongs to that driver's list, so it is no
 * longer offered when building any other driver's list.
 */
export function itemsHandedElsewhere(
    all: Record<string, DriverHandover>,
    accountId: string,
    exceptDriverId?: string,
): Set<string> {
    const set = new Set<string>();
    for (const rec of Object.values(all)) {
        if (rec.accountId !== accountId) continue;
        if (rec.driverId === exceptDriverId) continue;
        rec.lines.forEach((l) => set.add(l.itemId));
    }
    return set;
}

const signed = (name: string, role: string): SignOffData => ({ name, role, date: todayISO(), sig: "", done: true });

/**
 * A couple of example records so the list shows real "handed over" and
 * "verified" rows out of the box — the first driver is fully verified, the
 * second is handed over and awaiting the driver. Seeded once per carrier when
 * no records exist yet.
 */
export function buildDemoHandovers(
    accountId: string,
    drivers: { id: string; name: string }[],
    itemIds: string[],
    issuerName: string,
): DriverHandover[] {
    if (drivers.length < 2 || itemIds.length < 5) return [];
    const now = Date.now();
    const verified: DriverHandover = {
        driverId: drivers[0].id,
        accountId,
        checklistName: "Standard driver kit",
        lines: itemIds.slice(0, 3).map((id) => ({ itemId: id, qty: "1" })),
        issuedByName: issuerName, issuedByTitle: "Fleet Manager",
        assigneeName: issuerName,
        staffSignoff: signed(issuerName, "Fleet Manager"),
        driverSignoff: signed(drivers[0].name, "Driver"),
        verifiedItemIds: itemIds.slice(0, 3),
        updatedAt: now, recordedAt: now,
    };
    const handed: DriverHandover = {
        driverId: drivers[1].id,
        accountId,
        checklistName: "Standard driver kit",
        lines: itemIds.slice(3, 5).map((id) => ({ itemId: id, qty: "1" })),
        issuedByName: issuerName, issuedByTitle: "Fleet Manager",
        assigneeName: issuerName,
        staffSignoff: signed(issuerName, "Fleet Manager"),
        verifiedItemIds: [],
        updatedAt: now, recordedAt: now,
    };
    return [verified, handed];
}

export function useDriverHandovers(accountId: string) {
    const [all, setAll] = useState<Record<string, DriverHandover>>(loadAll);
    useEffect(() => {
        const h = () => setAll(loadAll());
        window.addEventListener(HO_EVENT, h);
        return () => window.removeEventListener(HO_EVENT, h);
    }, []);

    const get = (driverId: string): DriverHandover | undefined => all[keyOf(accountId, driverId)];

    const save = (rec: DriverHandover) => {
        const next = { ...loadAll(), [keyOf(rec.accountId, rec.driverId)]: rec };
        persist(next);
    };

    const remove = (driverId: string) => {
        const next = loadAll();
        delete next[keyOf(accountId, driverId)];
        persist(next);
    };

    return { records: all, get, save, remove };
}

// ── Shared driver-inventory helpers ─────────────────────────────────────────
// Only the company-issued physical accessories are handed over to a driver.
export const HANDOVER_CATEGORIES = ["cat-keys", "cat-safety-ppe", "cat-equipment", "cat-devices", "cat-cards-docs"];

export type ItemLine = { item: InventoryItem; qty: string; verified: boolean };
export type DriverGroup = { id: string; name: string; lines: ItemLine[] };

/** Group a driver's held items by inventory category, flagging verified ones. */
export function buildDriverGroups(rec: DriverHandover, itemById: Map<string, InventoryItem>): DriverGroup[] {
    const verifiedSet = new Set(rec.verifiedItemIds ?? []);
    const map = new Map<string, DriverGroup>();
    for (const catId of HANDOVER_CATEGORIES) {
        const cat = VENDOR_CATEGORIES.find((c) => c.id === catId);
        if (cat) map.set(catId, { id: catId, name: cat.name, lines: [] });
    }
    for (const line of rec.lines) {
        const item = itemById.get(line.itemId);
        if (!item) continue;
        const vendor = VENDORS.find((v) => v.id === item.vendorId);
        if (vendor && map.has(vendor.categoryId)) {
            map.get(vendor.categoryId)!.lines.push({ item, qty: line.qty, verified: verifiedSet.has(line.itemId) });
        }
    }
    return Array.from(map.values()).filter((g) => g.lines.length > 0);
}

/** Company inventory still available to add to a driver — not on this driver's
 *  list nor on any other driver's list. */
export function buildAddGroups(
    records: Record<string, DriverHandover>, acct: string, accountId: string | undefined, driverId: string,
): { id: string; name: string; items: InventoryItem[] }[] {
    const elsewhere = itemsHandedElsewhere(records, acct, driverId);
    const rec = records[`${acct}::${driverId}`];
    const own = new Set((rec?.lines ?? []).map((l) => l.itemId));
    const base = (accountId ? getInventoryForCarrier(accountId) : INVENTORY_ITEMS)
        .filter((it) => {
            const v = VENDORS.find((vv) => vv.id === it.vendorId);
            return v && HANDOVER_CATEGORIES.includes(v.categoryId) && !elsewhere.has(it.id) && !own.has(it.id);
        });
    const map = new Map<string, { id: string; name: string; items: InventoryItem[] }>();
    for (const catId of HANDOVER_CATEGORIES) {
        const cat = VENDOR_CATEGORIES.find((c) => c.id === catId);
        if (cat) map.set(catId, { id: catId, name: cat.name, items: [] });
    }
    for (const it of base) {
        const v = VENDORS.find((vv) => vv.id === it.vendorId);
        if (v && map.has(v.categoryId)) map.get(v.categoryId)!.items.push(it);
    }
    return Array.from(map.values()).filter((g) => g.items.length > 0);
}

/** Append items to a driver's list; a changed checklist re-opens verification. */
export function appendLines(rec: DriverHandover, newLines: { itemId: string; qty: string }[]): DriverHandover {
    const existing = new Set(rec.lines.map((l) => l.itemId));
    const merged = [...rec.lines, ...newLines.filter((l) => !existing.has(l.itemId))];
    const driverSignoff = rec.driverSignoff?.done ? { ...rec.driverSignoff, done: false } : rec.driverSignoff;
    return { ...rec, lines: merged, driverSignoff, updatedAt: Date.now() };
}

/** Take items back from a driver — remove them from the list (and from the
 *  verified set). The freed items are no longer reserved, so they can be handed
 *  over to another driver. When the last item is taken back the hand-over is
 *  reset so the driver shows as no longer holding anything. */
export function removeLines(rec: DriverHandover, itemIds: string[]): DriverHandover {
    const drop = new Set(itemIds);
    const lines = rec.lines.filter((l) => !drop.has(l.itemId));
    const verifiedItemIds = (rec.verifiedItemIds ?? []).filter((id) => !drop.has(id));
    if (lines.length === 0) {
        return { ...rec, lines, verifiedItemIds: [], staffSignoff: undefined, driverSignoff: undefined, recordedAt: undefined, updatedAt: Date.now() };
    }
    return { ...rec, lines, verifiedItemIds, updatedAt: Date.now() };
}
