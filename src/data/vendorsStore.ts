// Module-level live store for vendors (carrier-scoped).
//
// Vendors live globally with an accountId; helpers below provide carrier-scoped
// views so each page (Settings/Maintenance, CreateOrderModal, etc.) sees only
// the active carrier's records. Mutations here are visible to every consumer
// on the next render — same useSyncExternalStore pattern as serviceTypesStore.

import { useMemo } from "react";
import { useSyncExternalStore } from "react";
import { VENDORS } from "@/pages/inventory/inventory.data";
import type { Vendor } from "@/pages/inventory/inventory.data";

let vendors: Vendor[] = [...VENDORS];
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};
const getSnapshot = () => vendors;
const notify = () => {
    for (const l of listeners) l();
};

/** Subscribe to ALL vendors (every carrier). Useful for super-admin tools. */
export function useAllVendors(): Vendor[] {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Subscribe to vendors filtered by accountId. Returns full list if no id. */
export function useVendorsForAccount(accountId?: string): Vendor[] {
    const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    return useMemo(
        () => (accountId ? all.filter((v) => v.accountId === accountId) : all),
        [all, accountId]
    );
}

/** Imperative API for non-render callers (handlers, effects). */
export const vendorsStore = {
    getAll: (): Vendor[] => vendors,
    getForAccount: (accountId: string): Vendor[] =>
        vendors.filter((v) => v.accountId === accountId),
    add(v: Vendor): void {
        vendors = [...vendors, v];
        notify();
    },
    update(v: Vendor): void {
        vendors = vendors.map((x) => (x.id === v.id ? v : x));
        notify();
    },
    remove(id: string): void {
        vendors = vendors.filter((x) => x.id !== id);
        notify();
    },
};
