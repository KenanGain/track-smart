// Module-level live store for service types (the maintenance catalog).
//
// Why a store: settings/MaintenancePage edits the catalog, and CreateOrderModal,
// CreateScheduleForm, and AssetMaintenancePage all need to see those edits in
// real time without remounting. A static array import would freeze the catalog
// at module-load. Using `useSyncExternalStore` lets every consumer subscribe
// and re-render whenever the store mutates, with no provider plumbing.

import { useSyncExternalStore } from "react";
// Seed data lives in maintenance.data with a narrower ServiceType — but
// MaintenancePage edits use the broader ServiceType from src/types so the
// store types against the broader one. The narrow type is structurally a
// subtype of the broader one, so the seed array assigns cleanly.
import { INITIAL_SERVICE_TYPES } from "@/pages/assets/maintenance.data";
import type { ServiceType } from "@/types/service-types";

let serviceTypes: ServiceType[] = [...INITIAL_SERVICE_TYPES];
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};
const getSnapshot = () => serviceTypes;
const notify = () => {
    for (const l of listeners) l();
};

/** React hook — subscribes the calling component to the store. */
export function useServiceTypes(): ServiceType[] {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Imperative API for callers that aren't in render (handlers, effects). */
export const serviceTypesStore = {
    getAll: (): ServiceType[] => serviceTypes,
    add(s: ServiceType): void {
        serviceTypes = [...serviceTypes, s];
        notify();
    },
    update(s: ServiceType): void {
        serviceTypes = serviceTypes.map((x) => (x.id === s.id ? s : x));
        notify();
    },
    remove(id: string): void {
        serviceTypes = serviceTypes.filter((x) => x.id !== id);
        notify();
    },
    setAll(list: ServiceType[]): void {
        serviceTypes = [...list];
        notify();
    },
};
