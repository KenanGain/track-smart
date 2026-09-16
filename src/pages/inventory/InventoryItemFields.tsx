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
import {
    VENDORS, VENDOR_CATEGORIES, getCategoryLabel, defaultItemName, isAutoItemName,
    driverOfAsset, defaultInventoryMonitoring, INVENTORY_MONITOR_RECORD,
    type Assignment, type AssignmentKind, type InventoryStatus, type Vendor,
} from "./inventory.data";

export const INVENTORY_STATUS_OPTIONS: InventoryStatus[] = ["Active", "Expiring Soon", "Expired"];

/** Everything the form holds. One object, so both callers read and write the same shape. */
export interface InventoryItemDraft {
    vendorId: string;
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
}

/** The sections, in order — the rail's steps and the cards on the page. */
export const INVENTORY_SECTIONS = [
    { id: "item", label: "Item", icon: Boxes, title: "Item", subtitle: "Who it is from, and what to call it." },
    // The alert lives with the dates it counts back from. Split into a section of its own it
    // asked you to scroll away from the expiry date to say what should happen on it.
    { id: "details", label: "Details", icon: Hash, title: "Numbers, Dates & Monitoring", subtitle: "What is printed on it, how long it runs, and when to be told." },
    { id: "assignment", label: "Assignment", icon: Truck, title: "Assignment", subtitle: "Who holds it — a vehicle, or a person." },
] as const;

export type InventorySectionId = typeof INVENTORY_SECTIONS[number]["id"];

/** A blank draft, named after whichever vendor the list opens on. */
export function emptyInventoryDraft(vendor?: Vendor): InventoryItemDraft {
    return {
        vendorId: vendor?.id ?? "",
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
        case "item": return count(d.vendorId, d.status, d.name.trim());
        case "details": return count(d.serial.trim(), d.pin.trim(), d.issueDate, d.expiryDate, d.monitoring.enabled);
        case "assignment": return count(d.targetId, d.alsoDriverOfAsset);
    }
}

/** Where the item lives — a vehicle, or a person. Vehicles split into CMV / Non-CMV below. */
const HOLDERS = [
    { id: "vehicle", label: "Vehicle", helper: "A truck or trailer carries it", Icon: Truck },
    { id: "driver", label: "Driver", helper: "Issued to a person directly", Icon: UserRound },
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
    const holder: Holder = draft.assignmentKind === "driver" ? "driver" : "vehicle";

    /**
     * Picking a vendor renames the item — but only while the name is still the one the last
     * vendor gave it. A name somebody typed is theirs and survives a change of vendor.
     */
    const pickVendor = (value: string) => {
        const next = vendors.find((v) => v.id === value);
        set({
            vendorId: value,
            ...(isAutoItemName(draft.name, vendor) ? { name: defaultItemName(next) } : {}),
        });
    };

    const pickHolder = (h: Holder) => {
        if (h === holder) return;
        // A target chosen for a vehicle means nothing against a driver, so it goes with the
        // switch rather than being filed against whoever happens to share the id.
        set({ assignmentKind: h === "driver" ? "driver" : "cmv", targetId: "", alsoDriverOfAsset: false });
    };

    // Who the "and its driver" toggle would actually hand it to. Read live off the vehicle —
    // and an honest blank where that vehicle has nobody assigned, rather than a switch that
    // silently records a hand-over to nobody.
    const assetDriver = draft.assignmentKind !== "driver" && draft.targetId
        ? driverOfAsset(draft.targetId, accountId) : null;

    if (id === "item") {
        return (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Vendor" required>
                    <Select value={draft.vendorId} onChange={pickVendor}>
                        {vendors.map((v) => (
                            <option key={v.id} value={v.id}>{v.name} — {getCategoryLabel(v.categoryId, VENDOR_CATEGORIES)}</option>
                        ))}
                    </Select>
                    {vendor && (
                        <p className="mt-1 text-[11px] text-slate-500">
                            Category: <span className="font-medium text-slate-700">{getCategoryLabel(vendor.categoryId, VENDOR_CATEGORIES)}</span>
                        </p>
                    )}
                </Field>
                <Field label="Status" required>
                    <Select value={draft.status} onChange={(v) => set({ status: v as InventoryStatus })}>
                        {INVENTORY_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                </Field>
                {/* Filled in from the vendor, and editable: a carrier holding four cards from
                    one vendor tells them apart by this. */}
                <Field label="Record name" required hint="Defaults to the vendor and its category.">
                    <Text value={draft.name} onChange={(v) => set({ name: v })} placeholder={defaultItemName(vendor) || "e.g. Comdata — Fuel Card"} />
                </Field>
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

    return (
        <div>
            <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                    <AssignmentTargetPicker kind={draft.assignmentKind === "non-cmv" ? "non-cmv" : "cmv"} selectedId={draft.targetId} onSelect={(value) => set({ targetId: value })} />

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
                                <span className="block text-[13px] font-semibold text-slate-700">Also handed to the driver of this vehicle</span>
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
                    <AssignmentTargetPicker kind="driver" selectedId={draft.targetId} onSelect={(value) => set({ targetId: value })} />
                    <p className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                        <IdCard size={12} className="text-slate-400" /> Issued to this person, whichever vehicle they are in.
                    </p>
                </div>
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
