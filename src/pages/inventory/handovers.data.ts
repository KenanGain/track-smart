import { useEffect, useState } from "react";
import { todayISO, type SignOffData } from "../hiring-process/FormKit";

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
