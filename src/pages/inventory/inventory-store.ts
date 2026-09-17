import { useEffect, useMemo, useState } from "react";
import { getInventoryForCarrier, INVENTORY_ITEMS, type InventoryItem } from "./inventory.data";

// Inventory items shipped in inventory.data.ts are static seed data. Two overlays sit on
// top of it, both in localStorage:
//
//   additions — items created in the app.
//   edits     — changes made to ANY item, seeded ones included.
//
// The second exists because the seed is a frozen module: an edit to a seeded row had
// nowhere to go, so "Save" used to log to the console and the row came back unchanged.
// Storing the edit rather than the whole item keeps the seed as the source of truth for
// everything the user did not touch, so a later change to the seed still reaches them.

const KEY = "inv_item_additions_v1";
const EDITS_KEY = "inv_item_edits_v1";
const EVENT = "inv-item-additions-change";

type Store = Record<string, InventoryItem[]>;              // accountId -> added items
type EditStore = Record<string, Partial<InventoryItem>>;   // itemId    -> changed fields

function read<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (raw) return JSON.parse(raw) as T;
    } catch { /* ignore */ }
    return fallback;
}

const loadAll = (): Store => read<Store>(KEY, {});
const loadEdits = (): EditStore => read<EditStore>(EDITS_KEY, {});

function persist(all: Store, edits: EditStore) {
    localStorage.setItem(KEY, JSON.stringify(all));
    localStorage.setItem(EDITS_KEY, JSON.stringify(edits));
    window.dispatchEvent(new CustomEvent(EVENT));
}

/** The item as it stands now: the seeded row with any saved changes laid over it. */
export function applyEdit(item: InventoryItem, edits: EditStore): InventoryItem {
    const patch = edits[item.id];
    return patch ? { ...item, ...patch } : item;
}

/**
 * File a change against an item from outside React.
 *
 * The hook below makes the same call — this exists because the asset wizard's save path
 * runs after the form has closed, at the point the asset finally has an id, which is not a
 * place a hook can be called from.
 */
export function updateInventoryItem(itemId: string, patch: Partial<InventoryItem>): void {
    const cur = loadEdits();
    persist(loadAll(), { ...cur, [itemId]: { ...(cur[itemId] ?? {}), ...patch } });
}

/**
 * Every item this carrier has right now: the seeded rows with their saved edits laid
 * over them, plus anything created in the app. The same list the pages build through
 * the hook — kept here so a save path outside React cannot build a different one.
 */
export function currentInventoryItems(accountId: string | undefined): InventoryItem[] {
    const edits = loadEdits();
    const base = (accountId ? getInventoryForCarrier(accountId) : INVENTORY_ITEMS)
        .map((it) => applyEdit(it, edits));
    const added = (loadAll()[accountId ?? "acct-001"] ?? []).map((it) => applyEdit(it, edits));
    return added.length ? [...added, ...base] : base;
}

export function useInventoryAdditions(accountId?: string) {
    const acct = accountId ?? "acct-001";
    const [all, setAll] = useState<Store>(loadAll);
    const [edits, setEdits] = useState<EditStore>(loadEdits);
    useEffect(() => {
        const h = () => { setAll(loadAll()); setEdits(loadEdits()); };
        window.addEventListener(EVENT, h);
        return () => window.removeEventListener(EVENT, h);
    }, []);

    // Added items carry their own edits too, so an item created and then corrected in the
    // app reads the same way as a seeded one that was corrected.
    const additions = useMemo(
        () => (all[acct] ?? []).map((it) => applyEdit(it, edits)),
        [all, acct, edits],
    );

    const add = (item: InventoryItem) => {
        const cur = loadAll();
        persist({ ...cur, [acct]: [...(cur[acct] ?? []), item] }, loadEdits());
    };

    const update = updateInventoryItem;

    return { additions, edits, add, update, applyEdit: (it: InventoryItem) => applyEdit(it, edits) };
}
