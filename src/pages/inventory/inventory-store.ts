import { useEffect, useState } from "react";
import type { InventoryItem } from "./inventory.data";

// Inventory items shipped in inventory.data.ts are static seed data. New items
// added from the inline "Add Inventory" pop-up are layered on top here and
// persisted to localStorage (same pattern as the driver hand-over store) so
// they show up in the List immediately and survive a reload.

const KEY = "inv_item_additions_v1";
const EVENT = "inv-item-additions-change";

type Store = Record<string, InventoryItem[]>; // accountId -> added items

function loadAll(): Store {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) return JSON.parse(raw) as Store;
    } catch { /* ignore */ }
    return {};
}
function persist(all: Store) {
    localStorage.setItem(KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent(EVENT));
}

export function useInventoryAdditions(accountId?: string) {
    const acct = accountId ?? "acct-001";
    const [all, setAll] = useState<Store>(loadAll);
    useEffect(() => {
        const h = () => setAll(loadAll());
        window.addEventListener(EVENT, h);
        return () => window.removeEventListener(EVENT, h);
    }, []);

    const additions = all[acct] ?? [];
    const add = (item: InventoryItem) => {
        const cur = loadAll();
        persist({ ...cur, [acct]: [...(cur[acct] ?? []), item] });
    };

    return { additions, add };
}
