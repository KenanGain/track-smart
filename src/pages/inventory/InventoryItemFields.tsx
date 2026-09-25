// ─────────────────────────────────────────────────────────────────────────────
// The inventory item form — ONE definition, in three sections.
//
// It is asked for in two places: adding an item, and opening one from the list to
// edit. They were two forms with two copies of the same fields, and the copies had
// already drifted — one required an expiry the other did not, one offered a driver
// the other silently dropped. A form that can be filled in one way and edited
// another loses whatever the second one does not know about.
//
// The sections are what the left-hand rail navigates, and they are the order the
// questions are asked in:
//   1. Item        — the vendor settles what this is; then its status and its name
//   2. Details     — the number and PIN printed on it, its two dates, and the alert
//                    that counts back from them — the same block the records use
//
// Where the item GOES is not asked here. The draft still carries an assignment and the save
// still writes it, so editing an item cannot strip the vehicle it is on — but choosing
// that vehicle happens elsewhere.
// ─────────────────────────────────────────────────────────────────────────────

import * as React from "react";
import { Bell, Boxes, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonitoringToggle } from "@/pages/compliance/MonitoringToggle";
import type { MonitoringConfig } from "@/pages/compliance/compliance-data-store";
import {
    VENDORS, VENDOR_CATEGORIES, ITEM_HANDLING, defaultItemName, isAutoItemName,
    defaultInventoryMonitoring, INVENTORY_MONITOR_RECORD,
    type Assignment, type AssignmentKind, type InventoryStatus, type ItemHandling, type Vendor,
} from "./inventory.data";

export const INVENTORY_STATUS_OPTIONS: InventoryStatus[] = ["Active", "Expiring Soon", "Expired"];

/** Everything the form holds. One object, so both callers read and write the same shape. */
export interface InventoryItemDraft {
    vendorId: string;
    /** What kind of thing it is. Starts from the vendor's category, then it is the item's. */
    categoryId: string;
    /** Who it follows off the asset — the driver, or the asset itself. */
    handling: ItemHandling;
    name: string;
    serial: string;
    pin: string;
    issueDate: string;
    expiryDate: string;
    status: InventoryStatus;
    monitoring: MonitoringConfig;
    /**
     * Where the item goes. Carried, not asked — the form has no assignment card, and these
     * come in from the item being edited (or from the page it was opened on) and go back out
     * unchanged, so a save cannot strip an assignment the form never showed.
     */
    assignmentKind: AssignmentKind | "";
    targetId: string;
    /** Only meaningful on a vehicle: the item is carried by whoever drives it. */
    alsoDriverOfAsset: boolean;
}

/** The sections, in order — the rail's steps and the cards on the page. */
export const INVENTORY_SECTIONS = [
    { id: "item", label: "Item", icon: Boxes, title: "Item", subtitle: "Who it is from, and what to call it." },
    // The alert lives with the dates it counts back from. Split into a section of its own it
    // asked you to scroll away from the expiry date to say what should happen on it.
    { id: "details", label: "Details", icon: Hash, title: "Numbers, Dates & Monitoring", subtitle: "What is printed on it, how long it runs, and when to be told." },
] as const;

export type InventorySectionId = typeof INVENTORY_SECTIONS[number]["id"];

/** A blank draft, named after whichever vendor the list opens on. */
export function emptyInventoryDraft(vendor?: Vendor): InventoryItemDraft {
    return {
        vendorId: vendor?.id ?? "",
        categoryId: vendor?.categoryId ?? "",
        // The commoner of the two by a distance: most of what a carrier issues is signed
        // out to a person. Something fitted to a truck says so.
        handling: "driver-returnable",
        name: defaultItemName(vendor),
        serial: "",
        pin: "",
        issueDate: "",
        expiryDate: "",
        status: "Active",
        monitoring: defaultInventoryMonitoring(),
        assignmentKind: "cmv",
        targetId: "",
        alsoDriverOfAsset: false,
    };
}

/** The assignment a draft describes, or nothing while no target has been picked. */
export function draftAssignment(d: InventoryItemDraft): Assignment | undefined {
    if (!d.assignmentKind || !d.targetId) return undefined;
    return {
        kind: d.assignmentKind,
        targetId: d.targetId,
        // Only ever true of a vehicle: a driver holding it directly IS the driver.
        ...(d.assignmentKind !== "driver" && d.alsoDriverOfAsset ? { alsoDriverOfAsset: true } : {}),
    };
}

/** Enough to file: who it is from, what its number is, and when it was issued. */
export const draftIsValid = (d: InventoryItemDraft): boolean =>
    !!d.vendorId && d.serial.trim().length > 0 && !!d.issueDate;

/** How many of a section's questions are answered — the count beside its step in the rail. */
export function sectionFilled(id: InventorySectionId, d: InventoryItemDraft): number {
    const count = (...vals: unknown[]) => vals.filter(Boolean).length;
    switch (id) {
        case "item": return count(d.vendorId, d.categoryId, d.handling, d.status, d.name.trim());
        case "details": return count(d.serial.trim(), d.pin.trim(), d.issueDate, d.expiryDate, d.monitoring.enabled);
    }
}

export interface InventorySectionProps {
    draft: InventoryItemDraft;
    onChange: (next: InventoryItemDraft) => void;
    accountId?: string;
    /** Pre-scoped vendor list; falls back to this carrier's, then to all of them. */
    vendors?: Vendor[];
}

/** One section of the form. The page wraps each in a card; the rail navigates them. */
export function InventoryItemSection({ id, draft, onChange, accountId, vendors: vendorsProp }: InventorySectionProps & { id: InventorySectionId }) {
    const vendors = React.useMemo(() => {
        if (vendorsProp) return vendorsProp;
        if (!accountId) return VENDORS;
        const scoped = VENDORS.filter((v) => v.accountId === accountId);
        return scoped.length > 0 ? scoped : VENDORS;
    }, [vendorsProp, accountId]);

    const set = (patch: Partial<InventoryItemDraft>) => onChange({ ...draft, ...patch });
    const vendor = vendors.find((v) => v.id === draft.vendorId);

    /**
     * Picking a vendor renames the item — but only while the name is still the one the last
     * vendor gave it. A name somebody typed is theirs and survives a change of vendor.
     */
    const pickVendor = (value: string) => {
        const next = vendors.find((v) => v.id === value);
        // The new vendor's category is the new guess — unless the item has been given one
        // that vendor does not sell, which is a decision and not a leftover.
        const category = draft.categoryId && draft.categoryId !== vendor?.categoryId
            ? draft.categoryId
            : next?.categoryId ?? '';
        set({
            vendorId: value,
            categoryId: category,
            ...(isAutoItemName(draft.name, vendor, draft.categoryId)
                ? { name: defaultItemName(next, VENDOR_CATEGORIES, category) } : {}),
        });
    };

    /** Recategorising renames the item too, while the name is still the one we chose. */
    const pickCategory = (value: string) => set({
        categoryId: value,
        ...(isAutoItemName(draft.name, vendor, draft.categoryId)
            ? { name: defaultItemName(vendor, VENDOR_CATEGORIES, value) } : {}),
    });

    if (id === "item") {
        return (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Vendor" required>
                    <Select value={draft.vendorId} onChange={pickVendor}>
                        {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </Select>
                </Field>
                {/* The category is the ITEM's, not the vendor's — a repair shop that also cuts
                    keys sells two kinds of thing, and the vendor can only say one. It starts
                    from the vendor's, which is a good guess and nothing more. */}
                <Field label="Category" required hint="What kind of thing this is.">
                    <Select value={draft.categoryId} onChange={pickCategory}>
                        <option value="">Select a category…</option>
                        {VENDOR_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                </Field>
                {/* Straight under the two fields that write it: vendor and category settle
                    what the thing is, and the name follows from them. A carrier holding four
                    cards from one vendor tells them apart by this, so it is editable. */}
                <Field label="Record name" required hint="Defaults to the vendor and its category.">
                    <Text value={draft.name} onChange={(v) => set({ name: v })} placeholder={defaultItemName(vendor, VENDOR_CATEGORIES, draft.categoryId) || "e.g. Comdata — Fuel Card"} />
                </Field>
                {/* A different kind of question — the thing's condition, not its identity — so
                    it comes after the three that say what it is. */}
                <Field label="Status" required>
                    <Select value={draft.status} onChange={(v) => set({ status: v as InventoryStatus })}>
                        {INVENTORY_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                </Field>

                {/* Who the item follows. Either way it is filed against the asset — what
                    this settles is who it leaves with: a fuel card goes wherever the driver
                    goes, a transponder stays screwed to the cab. It is the difference
                    between asking somebody for it and going to fetch it. */}
                <div className="sm:col-span-2">
                    <Field label="Assigned to" required>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {ITEM_HANDLING.map((h) => {
                                const on = draft.handling === h.id;
                                return (
                                    <label key={h.id} className={cn(
                                        "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
                                        on ? "border-blue-300 bg-blue-50/60" : "border-slate-200 bg-white hover:bg-slate-50",
                                    )}>
                                        <input
                                            type="radio" name="item-handling" value={h.id} checked={on}
                                            onChange={() => set({ handling: h.id })}
                                            className="mt-0.5 h-4 w-4 shrink-0 border-slate-300 text-blue-600 focus:ring-blue-500/30"
                                        />
                                        <span className="min-w-0">
                                            <span className={cn("block text-[13px] font-semibold", on ? "text-blue-800" : "text-slate-800")}>{h.label}</span>
                                            <span className="block text-[11px] leading-snug text-slate-500">{h.blurb}</span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </Field>
                </div>
            </div>
        );
    }

    if (id === "details") {
        return (
            <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field label="Number" required>
                        <Text value={draft.serial} onChange={(v) => set({ serial: v })} placeholder="e.g. FC-558271" />
                    </Field>
                    <Field label="PIN">
                        <Text value={draft.pin} onChange={(v) => set({ pin: v })} placeholder="e.g. 4421" />
                    </Field>
                    <Field label="Issue date" required>
                        <Text value={draft.issueDate} onChange={(v) => set({ issueDate: v })} type="date" />
                    </Field>
                    <Field label="Expiry date" hint="Leave blank for something that never runs out — a yard key.">
                        <Text value={draft.expiryDate} onChange={(v) => set({ expiryDate: v })} type="date" />
                    </Field>
                </div>

                {/* The alert, directly under the dates it counts back from. The same control,
                    bases and reminder days as a compliance record: a fuel card running out is
                    the same kind of event as a permit running out, and nobody should have to
                    learn two of them. */}
                <div className="space-y-2 border-t border-slate-100 pt-5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        <Bell size={12} className="text-slate-400" /> Alert
                    </div>
                    <MonitoringToggle
                        record={INVENTORY_MONITOR_RECORD}
                        monitoring={draft.monitoring}
                        issueDate={draft.issueDate}
                        expiryDate={draft.expiryDate}
                        status={draft.status}
                        onChange={(m) => set({ monitoring: m })}
                    />
                    {draft.monitoring.enabled && !draft.expiryDate && draft.monitoring.basis === "expiry" && (
                        <p className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] text-amber-800">
                            There is no expiry date to count back from yet — add one above, or point the alert at the issue date or a custom one.
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return null;
}

// ── Form primitives ─────────────────────────────────────────────────────────

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {label}{required && <span className="text-red-500"> *</span>}
            </span>
            {children}
            {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
        </label>
    );
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
    return (
        <select value={value} onChange={(e) => onChange(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
            {children}
        </select>
    );
}

function Text({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
    return (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
    );
}
