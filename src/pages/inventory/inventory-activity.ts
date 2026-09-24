// ─────────────────────────────────────────────────────────────────────────────
// The trace behind an inventory item — when it was created, who it went to, and
// what changed since.
//
// Two sources, deliberately kept apart:
//
//   · A DERIVED trail, worked out from the item and its hand-over record. The
//     seeded fleet was never edited through this app, so without it every item
//     would open onto an empty Activity tab — technically true and useless. What
//     is derived is only what the data already states: it was issued on its issue
//     date, it is assigned to this vehicle, it was handed over on that date.
//
//   · A RECORDED trail, appended as things actually happen in the app and kept in
//     localStorage. These are facts, not inferences, so they carry a real author
//     and a real timestamp.
//
// Derived entries are never written to storage. If they were, a later change to
// how we infer them would leave old guesses lying around as though someone had
// recorded them.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { activityMeta, ACTIVITY_BADGE_TONE, type ActivityKind } from "@/components/ui/activity-kinds";
import type { ActivityEntry } from "@/components/ui/ActivityTimeline";
import { VENDORS, itemName, type InventoryItem } from "./inventory.data";
import { handoverStatusOf, type DriverHandover } from "./handovers.data";
import { resolveAsset, resolveDriver, driverNameOf, parseCalendarDate } from "./inventory-assignment";

export type InventoryEvent = {
    id: string;
    itemId: string;
    accountId: string;
    kind: ActivityKind;
    /** Overrides the kind's default label when the event needs to be more specific. */
    title?: string;
    detail?: string;
    by?: string;
    /** Who they were acting as — drives the badge (Office / Driver / System). */
    role?: string;
    /** Epoch millis. */
    at: number;
};

const KEY = "inv_item_activity_v1";
const EVENT = "inv-item-activity-change";

type Store = Record<string, InventoryEvent[]>; // itemId -> events

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

/** Append one event to an item's trail. */
export function logInventoryEvent(e: Omit<InventoryEvent, "id" | "at"> & { at?: number }) {
    const all = loadAll();
    const at = e.at ?? Date.now();
    const entry: InventoryEvent = { ...e, at, id: `${e.itemId}-${at}-${Math.random().toString(36).slice(2, 7)}` };
    persist({ ...all, [e.itemId]: [...(all[e.itemId] ?? []), entry] });
}

/**
 * What changed between two versions of an item, in words.
 *
 * An "Updated" entry that does not say WHAT was updated is the reason audit trails get
 * ignored, so the fields are diffed and named. Only fields a person set are compared —
 * a derived status flipping because a date passed is not somebody's edit.
 */
const TRACKED: { key: keyof InventoryItem; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "serial", label: "Number" },
    { key: "pin", label: "PIN" },
    { key: "issueDate", label: "Issue date" },
    { key: "expiryDate", label: "Expiry date" },
    { key: "status", label: "Status" },
    { key: "vendorId", label: "Vendor" },
];

const vendorName = (id: string) => VENDORS.find((v) => v.id === id)?.name ?? id;

export function describeChanges(before: InventoryItem, after: InventoryItem): string[] {
    const out: string[] = [];
    for (const f of TRACKED) {
        const a = (before[f.key] ?? "") as string;
        const b = (after[f.key] ?? "") as string;
        if (a === b) continue;
        const show = (v: string) => (!v ? "empty" : f.key === "vendorId" ? vendorName(v) : v);
        out.push(`${f.label}: ${show(a)} → ${show(b)}`);
    }
    // Assignment is a shape, not a string, so it is compared on its own terms.
    const aa = before.assignedTo, bb = after.assignedTo;
    if (aa?.kind !== bb?.kind || aa?.targetId !== bb?.targetId) {
        out.push(`Assignment: ${aa ? `${aa.kind} ${aa.targetId}` : "none"} → ${bb ? `${bb.kind} ${bb.targetId}` : "none"}`);
    } else if (!!aa?.alsoDriverOfAsset !== !!bb?.alsoDriverOfAsset) {
        out.push(bb?.alsoDriverOfAsset ? "Now carried by the vehicle's driver" : "No longer carried by the vehicle's driver");
    }
    const am = before.monitoring, bm = after.monitoring;
    if (!!am?.enabled !== !!bm?.enabled) out.push(bm?.enabled ? "Alert turned on" : "Alert turned off");
    else if (am?.enabled && bm?.enabled && (am.basis !== bm.basis || am.reminders.join() !== bm.reminders.join())) {
        out.push("Alert schedule changed");
    }
    return out;
}

// ── Reading the trail ───────────────────────────────────────────────────────

const fmtAt = (ms: number) =>
    new Date(ms).toLocaleString("en-US", { year: "numeric", month: "short", day: "2-digit", hour: "numeric", minute: "2-digit" });

const fmtDay = (iso: string) => {
    const d = parseCalendarDate(iso);
    return d ? d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" }) : iso;
};

const toEntry = (e: InventoryEvent): ActivityEntry => {
    const meta = activityMeta(e.kind);
    return {
        id: e.id,
        icon: meta.icon,
        iconTone: meta.dot,
        title: e.title || meta.label,
        detail: e.detail,
        by: e.by,
        badge: e.role ? { label: e.role, tone: ACTIVITY_BADGE_TONE[e.role] ?? ACTIVITY_BADGE_TONE.System } : undefined,
        at: fmtAt(e.at),
    };
};

/** A synthetic entry built from what the record already says. Never persisted. */
function derived(
    id: string, kind: ActivityKind, at: string, title: string, detail?: string, by?: string,
): ActivityEntry & { sortAt: number } {
    const meta = activityMeta(kind);
    const ms = parseCalendarDate(at)?.getTime() ?? 0;
    return {
        id: `derived-${id}`,
        icon: meta.icon,
        iconTone: meta.dot,
        title,
        detail,
        by,
        badge: { label: "System", tone: ACTIVITY_BADGE_TONE.System },
        at: fmtDay(at),
        sortAt: ms,
    };
}

/**
 * The full trail for one item, newest first: what the record implies, plus everything
 * actually recorded against it.
 */
export function inventoryTrailSortable(
    item: InventoryItem,
    accountId: string | undefined,
    handover: DriverHandover | undefined,
    events: InventoryEvent[],
): (ActivityEntry & { sortAt: number })[] {
    const rows: (ActivityEntry & { sortAt: number })[] = [];
    const vendor = VENDORS.find((v) => v.id === item.vendorId);

    if (item.issueDate) {
        rows.push(derived(
            `${item.id}-created`, "created", item.issueDate,
            "Added to inventory",
            [vendor?.name && `From ${vendor.companyName || vendor.name}`, item.serial && `Number ${item.serial}`]
                .filter(Boolean).join(" · ") || undefined,
        ));
    }

    // Where it went. Dated to the issue date because that is the only date the record
    // carries for it — an assignment changed later leaves a recorded "Updated" entry.
    const onAsset = resolveAsset(item.assignedTo, accountId);
    const withDriver = resolveDriver(item.assignedTo, accountId, undefined);
    if (onAsset || withDriver) {
        const where = [
            onAsset && `${onAsset.kindLabel} ${onAsset.label}`,
            withDriver && (withDriver.via === "drives" ? `carried by ${withDriver.label}` : withDriver.label),
        ].filter(Boolean).join(" · ");
        rows.push(derived(`${item.id}-assigned`, "assigned", item.issueDate, "Assigned", where));
    }

    if (handover) {
        const status = handoverStatusOf(handover);
        const who = driverNameOf(handover.driverId, accountId) ?? "a driver";
        if (handover.staffSignoff?.done && handover.staffSignoff.date) {
            rows.push(derived(
                `${item.id}-handed`, "signed", handover.staffSignoff.date,
                "Handed over to driver",
                `${who} · ${handover.checklistName || "Hand-over checklist"}`,
                handover.staffSignoff.name || handover.issuedByName,
            ));
        }
        if (status === "verified" && handover.driverSignoff?.date) {
            rows.push(derived(
                `${item.id}-verified`, "verified", handover.driverSignoff.date,
                "Receipt confirmed by driver", `${who} signed for the items`, who,
            ));
        }
        if ((handover.takeBackRequestedItemIds ?? []).includes(item.id)) {
            rows.push(derived(
                `${item.id}-takeback`, "requested", fmtIsoOf(handover.updatedAt),
                "Return requested", `${who} has been asked to hand this back`,
            ));
        }
    }

    if (item.expiryDate) {
        const due = parseCalendarDate(item.expiryDate);
        if (due && due.getTime() < Date.now()) {
            rows.push(derived(`${item.id}-expired`, "alert", item.expiryDate, "Expired", `Ran out on ${fmtDay(item.expiryDate)}`));
        }
    }

    const recorded = events.map((e) => ({ ...toEntry(e), sortAt: e.at }));
    return [...rows, ...recorded].sort((a, b) => b.sortAt - a.sortAt);
}

/**
 * One item's trail, ready to read.
 *
 * `at` on an entry is a formatted date for DISPLAY, so two trails cannot be merged by it
 * without parsing our own output back. `inventoryTrailSortable` keeps the number the sort
 * actually used; this drops it, which is all any single-item view needs.
 */
export function inventoryTrail(
    item: InventoryItem,
    accountId: string | undefined,
    handover: DriverHandover | undefined,
    events: InventoryEvent[],
): ActivityEntry[] {
    return inventoryTrailSortable(item, accountId, handover, events)
        .map(({ sortAt: _sortAt, ...rest }) => rest);
}

const fmtIsoOf = (ms: number) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Live view of one item's recorded events. */
export function useInventoryActivity(itemId: string) {
    const [all, setAll] = useState<Store>(loadAll);
    useEffect(() => {
        const h = () => setAll(loadAll());
        window.addEventListener(EVENT, h);
        return () => window.removeEventListener(EVENT, h);
    }, []);
    return all[itemId] ?? [];
}

/** How many things have been recorded against an item — for the tab badge. */
export function inventoryEventCount(itemId: string): number {
    return (loadAll()[itemId] ?? []).length;
}

export { itemName };
