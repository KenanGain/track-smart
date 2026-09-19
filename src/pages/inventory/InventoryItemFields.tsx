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
//   3. Assignment  — a vehicle (and optionally its driver), or a driver
// ─────────────────────────────────────────────────────────────────────────────

import * as React from "react";
import { Bell, Boxes, Check, Hash, IdCard, Truck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonitoringToggle } from "@/pages/compliance/MonitoringToggle";
import type { MonitoringConfig } from "@/pages/compliance/compliance-data-store";
import { AssignmentTargetPicker } from "./AssignmentTargetPicker";
import { CircleSlash, MessageSquare } from "lucide-react";
import { MovementNotify, useMovementPlans, emptyNotifyState, type NotifyState } from "./MovementNotify";
import type { Movement } from "./inventory-movements";
import { driverNameOf } from "./inventory-assignment";
import {
    VENDORS, VENDOR_CATEGORIES, ITEM_HANDLING, defaultItemName, isAutoItemName,
    driverOfAsset, defaultInventoryMonitoring, INVENTORY_MONITOR_RECORD,
    type Assignment, type AssignmentKind, type InventoryStatus, type ItemHandling, type Vendor,
} from "./inventory.data";

export const INVENTORY_STATUS_OPTIONS: InventoryStatus[] = ["Active", "Expiring Soon", "Expired"];

/** Everything the form holds. One object, so both callers read and write the same shape. */
export interface InventoryItemDraft {
    vendorId: string;
    /** What kind of thing it is. Starts from the vendor's category, then it is the item's. */
    categoryId: string;
    /** How it comes back — signed out to a person, or fitted to a truck. */
    handling: ItemHandling;
    name: string;
    serial: string;
    pin: string;
    issueDate: string;
    expiryDate: string;
    status: InventoryStatus;
    monitoring: MonitoringConfig;
    /** '' until someone is chosen — an item may sit in the office unassigned. */
    assignmentKind: AssignmentKind | "";
    targetId: string;
    /** Only meaningful on a vehicle: the item is carried by whoever drives it. */
    alsoDriverOfAsset: boolean;
    /**
     * Tell the driver to come and collect it.
     *
     * Part of the draft rather than a step afterwards: an assignment nobody is told about is
     * an assignment that surprises somebody later.
     */
    notify: NotifyState;
}

/** The sections, in order — the rail's steps and the cards on the page. */
export const INVENTORY_SECTIONS = [
    { id: "item", label: "Item", icon: Boxes, title: "Item", subtitle: "Who it is from, and what to call it." },
    // The alert lives with the dates it counts back from. Split into a section of its own it
    // asked you to scroll away from the expiry date to say what should happen on it.
    { id: "details", label: "Details", icon: Hash, title: "Numbers, Dates & Monitoring", subtitle: "What is printed on it, how long it runs, and when to be told." },
    { id: "assignment", label: "Assignment", icon: Truck, title: "Assignment", subtitle: "Who holds it — a vehicle, or a person." },
    // Last, because it can only be answered once the page knows who holds it.
    { id: "notify", label: "Tell them", icon: MessageSquare, title: "Tell them", subtitle: "Send the driver a list to collect from the office." },
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
        notify: emptyNotifyState(),
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
        // Deliberately unassigned is an answered question, not a blank one.
        case "assignment": return count(d.assignmentKind === "" || d.targetId, d.alsoDriverOfAsset);
        // One question, and "no, I'll hand it to them myself" answers it.
        case "notify": return d.notify.notify ? 1 : 0;
    }
}

/**
 * Where the item lives — a vehicle, a person, or nobody.
 *
 * "Nobody" is not a missing answer. Yard stock — spare load bars, a winter kit — belongs to the
 * company and to no unit, the list filters on it, and the assign dialog can put an item back
 * into it. The form was the only place that could not say it, so anything created here had to
 * be filed against a truck whether or not it was on one.
 */
const HOLDERS = [
    { id: "vehicle", label: "Vehicle", helper: "A truck or trailer carries it", Icon: Truck },
    { id: "driver", label: "Driver", helper: "Issued to a person directly", Icon: UserRound },
    { id: "none", label: "Nobody yet", helper: "Yard stock, held in the office", Icon: CircleSlash },
] as const;
type Holder = typeof HOLDERS[number]["id"];

const VEHICLE_KINDS: { value: AssignmentKind; label: string; helper: string }[] = [
    { value: "cmv", label: "CMV", helper: "Power units (trucks)" },
    { value: "non-cmv", label: "Non-CMV", helper: "Trailers / vans / other" },
];

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
    // An empty kind is the unassigned state; the draft has carried it all along and only
    // the UI insisted on one of the other two.
    const holder: Holder = draft.assignmentKind === "driver" ? "driver"
        : draft.assignmentKind === "" ? "none" : "vehicle";

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

    const pickHolder = (h: Holder) => {
        if (h === holder) return;
        // A target chosen for a vehicle means nothing against a driver, so it goes with the
        // switch rather than being filed against whoever happens to share the id.
        set({
            assignmentKind: h === "driver" ? "driver" : h === "none" ? "" : "cmv",
            targetId: "",
            alsoDriverOfAsset: false,
        });
    };

    // Who the "and its driver" toggle would actually hand it to. Read live off the vehicle —
    // and an honest blank where that vehicle has nobody assigned, rather than a switch that
    // silently records a hand-over to nobody.
    const assetDriver = draft.assignmentKind !== "driver" && draft.targetId
        ? driverOfAsset(draft.targetId, accountId) : null;

    /**
     * Who would be told, resolved the same way the list resolves the Driver column.
     *
     * A vehicle's driver only counts when the item actually travels with them — a spare key
     * in the yard is nobody's to collect.
     */
    const notifyTarget = draft.assignmentKind === "driver" && draft.targetId
        ? { id: draft.targetId, name: driverNameOf(draft.targetId, accountId) ?? "the driver" }
        : draft.alsoDriverOfAsset && assetDriver
            ? { id: assetDriver.id, name: assetDriver.name }
            : null;

    /**
     * The item as it stands, so the planner can draft a message about something that does
     * not exist yet. It gets its real id on save; nothing here is stored.
     */
    const previewMovements = React.useMemo<Movement[]>(() => {
        if (!notifyTarget) return [];
        const preview = {
            id: "preview", vendorId: draft.vendorId, name: draft.name.trim() || defaultItemName(vendor),
            serial: draft.serial.trim(), pin: draft.pin.trim(),
            issueDate: draft.issueDate, expiryDate: draft.expiryDate, status: draft.status,
        } as never;
        return [{
            kind: draft.assignmentKind === "driver" ? "assign-driver" : "assign-vehicle",
            item: preview,
            person: notifyTarget,
            carried: draft.assignmentKind !== "driver",
        }];
    }, [notifyTarget?.id, notifyTarget?.name, draft.vendorId, draft.name, draft.serial, draft.pin,
        draft.issueDate, draft.expiryDate, draft.status, draft.assignmentKind, vendor]);

    const notifyPlans = useMovementPlans(previewMovements, draft.notify);

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
                <Field label="Status" required>
                    <Select value={draft.status} onChange={(v) => set({ status: v as InventoryStatus })}>
                        {INVENTORY_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                </Field>
                {/* Filled in from the vendor, and editable: a carrier holding four cards from
                    one vendor tells them apart by this. */}
                <Field label="Record name" required hint="Defaults to the vendor and its category.">
                    <Text value={draft.name} onChange={(v) => set({ name: v })} placeholder={defaultItemName(vendor, VENDOR_CATEGORIES, draft.categoryId) || "e.g. Comdata — Fuel Card"} />
                </Field>

                {/* How it comes back. One or the other — a fuel card is handed back by the
                    person who signed for it, a transponder is unscrewed from the cab. It is
                    the difference between asking somebody for it and going to fetch it. */}
                <div className="sm:col-span-2">
                    <Field label="How it comes back" required>
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

    if (id === "notify") {
        return (
            <MovementNotify
                plans={notifyPlans}
                state={draft.notify}
                onChange={(next) => set({ notify: { ...draft.notify, ...next } })}
                emptyHint={
                    /* Why there is nobody to tell — each of these is a different thing to go
                       and fix, and a blank step would have made all four look the same. */
                    holder === "none"
                        ? <>This is yard stock, so there is nobody to tell. File it against a driver or a vehicle in <span className="font-semibold">Assignment</span> and the message can go out with it.</>
                        : !draft.targetId
                            ? <>Pick who holds it in <span className="font-semibold">Assignment</span> first — the message goes to whoever ends up carrying it.</>
                            : holder === "vehicle" && !draft.alsoDriverOfAsset
                                ? <>This sits with the vehicle rather than travelling with its driver, so nobody needs to collect it. Tick <span className="font-semibold">Carried by the driver of this vehicle</span> if it rides in the cab.</>
                                : <>Nobody drives this vehicle yet, so there is no one to tell. Assign a driver on the asset and the message can go to them.</>
                }
            />
        );
    }


    return (
        <div>
            <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {HOLDERS.map((h) => {
                    const active = holder === h.id;
                    return (
                        <button key={h.id} type="button" onClick={() => pickHolder(h.id)}
                            className={cn(
                                "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                                active ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300",
                            )}>
                            <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                                active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500")}>
                                <h.Icon size={14} />
                            </span>
                            <span className="min-w-0">
                                <span className={cn("block text-sm font-semibold", active ? "text-blue-700" : "text-slate-800")}>{h.label}</span>
                                <span className="block text-[11px] leading-snug text-slate-500">{h.helper}</span>
                            </span>
                            {active && <Check size={14} className="ml-auto mt-1 shrink-0 text-blue-600" strokeWidth={3} />}
                        </button>
                    );
                })}
            </div>

            {holder === "vehicle" && (
                <div className="space-y-2">
                    {/* Which kind of vehicle — the picker's list follows this. */}
                    <div className="grid grid-cols-2 gap-2">
                        {VEHICLE_KINDS.map((k) => {
                            const active = draft.assignmentKind === k.value;
                            return (
                                <button key={k.value} type="button"
                                    onClick={() => set({ assignmentKind: k.value, targetId: "", alsoDriverOfAsset: false })}
                                    className={cn(
                                        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
                                        active ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                                    )}
                                    title={k.helper}>
                                    <Truck size={15} className={active ? "text-blue-600" : "text-slate-400"} /> {k.label}
                                </button>
                            );
                        })}
                    </div>
                    <AssignmentTargetPicker
                        kind={draft.assignmentKind === "non-cmv" ? "non-cmv" : "cmv"}
                        selectedId={draft.targetId}
                        onSelect={(value) => set({ targetId: value })}
                        accountId={accountId}
                    />

                    {/* …and whether it is the vehicle's driver who actually carries it. Only
                        once a vehicle is chosen: until then there is no driver to name. */}
                    {draft.targetId && (
                        <label className={cn(
                            "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
                            draft.alsoDriverOfAsset ? "border-blue-200 bg-blue-50/60" : "border-slate-200 bg-slate-50/60 hover:bg-slate-50",
                        )}>
                            <input type="checkbox" checked={draft.alsoDriverOfAsset} disabled={!assetDriver}
                                onChange={(e) => set({ alsoDriverOfAsset: e.target.checked })}
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 disabled:opacity-40" />
                            <span className="min-w-0">
                                {/* "Handed" now means a signed hand-over checklist, which this is not.
                                    An item that rides in the cab is CARRIED, and the list, the rollup
                                    and the assign dialog all call it that. */}
                                <span className="block text-[13px] font-semibold text-slate-700">Carried by the driver of this vehicle</span>
                                <span className="block text-[11px] leading-snug text-slate-500">
                                    {assetDriver
                                        ? <>Currently <span className="font-semibold text-slate-700">{assetDriver.name}</span>. Read from the vehicle, so it follows a change of driver.</>
                                        : "No driver is assigned to this vehicle yet — assign one on the asset, and this follows."}
                                </span>
                            </span>
                        </label>
                    )}
                </div>
            )}

            {holder === "driver" && (
                <div className="space-y-2">
                    <AssignmentTargetPicker kind="driver" selectedId={draft.targetId} onSelect={(value) => set({ targetId: value })} accountId={accountId} />
                    <p className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                        <IdCard size={12} className="text-slate-400" /> Issued to this person, whichever vehicle they are in.
                    </p>
                </div>
            )}

            {holder === "none" && (
                <p className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-[12px] leading-snug text-slate-600">
                    <CircleSlash size={14} className="mt-0.5 shrink-0 text-slate-400" />
                    This item is on nobody. It shows under <span className="font-semibold">Not assigned</span> on the
                    list and is offered whenever somebody assigns inventory to a driver or a vehicle.
                </p>
            )}
        </div>
    );
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
