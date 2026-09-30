// ─────────────────────────────────────────────────────────────────────────────
// Putting ONE item somewhere, from the row it is sitting on.
//
// The other assignment screen starts from a holder — this truck, this driver — and
// asks which of the carrier's inventory belongs on it. That is the right shape when
// you are kitting out a vehicle, and the wrong one when you are looking at a single
// fuel card and want it on a named person.
//
// Two lines, not one choice. An item's ticks say where it can be filed, and a truck's
// fuel card is ticked for both: it belongs to the unit AND somebody is answerable for
// it. So this asks for each one it is ticked for, and either can be left empty.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { CircleSlash, IdCard, Truck, X } from "lucide-react";
import { AssignmentTargetPicker } from "./AssignmentTargetPicker";
import { assetsFor, driverNameOf, resolveAsset } from "./inventory-assignment";
import {
    goesToAsset, goesToDriver, itemAssetAssignment, itemDriverId, itemName,
    type Assignment, type InventoryItem,
} from "./inventory.data";
import { cn } from "@/lib/utils";

/** What a save from here changes. Each key present means "set this to that". */
export type AssignmentPatch = {
    assignedTo?: Assignment;
    assignedDriverId?: string;
};

export function AssignItemDialog({ item, accountId, onClose, onSave }: {
    item: InventoryItem;
    accountId?: string;
    onClose: () => void;
    onSave: (patch: AssignmentPatch, label: string) => void;
}) {
    const onAsset = goesToAsset(item);
    const onDriver = goesToDriver(item);

    const [assetId, setAssetId] = useState(itemAssetAssignment(item)?.targetId ?? "");
    const [driverId, setDriverId] = useState(itemDriverId(item) ?? "");

    const assets = useMemo(() => assetsFor(accountId), [accountId]);

    /** Where it is right now, in one line — so a change is a change FROM something. */
    const now = useMemo(() => {
        const a = resolveAsset(itemAssetAssignment(item), accountId);
        const d = itemDriverId(item);
        const parts = [
            a ? a.label : null,
            d ? (driverNameOf(d, accountId) ?? "a driver no longer on the roster") : null,
        ].filter(Boolean);
        return parts.length ? parts.join(" · ") : "Not assigned";
    }, [item, accountId]);

    const assetLabel = (id: string) => (assets.find((a: any) => a.id === id) as any)?.unitNumber ?? "the unit";

    const commit = () => {
        const patch: AssignmentPatch = {};
        if (onAsset) {
            // The picker lists trucks and trailers together, which is how a yard thinks
            // about them; the regulatory class is read back off the unit rather than asked.
            const asset = assets.find((a: any) => a.id === assetId);
            patch.assignedTo = assetId
                ? { kind: (asset as any)?.assetCategory === "Non-CMV" ? "non-cmv" : "cmv", targetId: assetId }
                : undefined;
        }
        if (onDriver) patch.assignedDriverId = driverId || undefined;
        const label = [
            assetId && onAsset ? assetLabel(assetId) : null,
            driverId && onDriver ? (driverNameOf(driverId, accountId) ?? "the driver") : null,
        ].filter(Boolean).join(" · ") || "nothing";
        onSave(patch, label);
    };

    const nothingPicked = (!onAsset || !assetId) && (!onDriver || !driverId);
    const wasAssigned = !!itemAssetAssignment(item) || !!itemDriverId(item);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Truck size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold text-slate-900">Assign {itemName(item)}</p>
                        <p className="truncate text-[12px] text-slate-500">
                            {item.serial ? `${item.serial} · ` : ""}Currently: {now}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-4 px-5 py-4">
                    {/* Only what the item is ticked for. Asking a reefer sensor which driver
                        it belongs to is asking a question with no true answer, and a blank
                        field invites somebody to give a false one. */}
                    {onAsset && (
                        <Block icon={Truck} label="Unit"
                            hint="It belongs to this unit and comes off when the unit leaves the fleet.">
                            <AssignmentTargetPicker
                                kind="vehicle" accountId={accountId}
                                selectedId={assetId} onSelect={setAssetId}
                                placeholder="Select a unit"
                            />
                        </Block>
                    )}

                    {onDriver && (
                        <Block icon={IdCard} label="Driver"
                            hint="This person is answerable for it and hands it back when they leave.">
                            <AssignmentTargetPicker
                                kind="driver" accountId={accountId}
                                selectedId={driverId} onSelect={setDriverId}
                                placeholder="Select a driver"
                            />
                        </Block>
                    )}

                    {onAsset && onDriver && (
                        <p className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-[11px] leading-snug text-blue-800">
                            This item is ticked for both, so it can be filed in both places at once —
                            on the unit, and on the person who carries it. Leave either blank if only
                            one of them is settled.
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3">
                    {wasAssigned && (
                        <button type="button"
                            onClick={() => { setAssetId(""); setDriverId(""); onSave({ assignedTo: undefined, assignedDriverId: undefined }, now); }}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-rose-600">
                            <CircleSlash size={14} /> Unassign
                        </button>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                        <button type="button" onClick={onClose}
                            className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50">
                            Cancel
                        </button>
                        <button type="button" onClick={commit} disabled={nothingPicked}
                            title={nothingPicked ? "Pick a unit or a driver first" : undefined}
                            className={cn(
                                "inline-flex h-9 items-center rounded-lg px-4 text-[13px] font-semibold text-white shadow-sm transition-colors",
                                nothingPicked ? "cursor-not-allowed bg-blue-300" : "bg-blue-600 hover:bg-blue-700",
                            )}>
                            Save assignment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** One labelled destination. */
function Block({ icon: Icon, label, hint, children }: {
    icon: typeof Truck;
    label: string;
    hint: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <span className="mb-1 flex items-center gap-1.5">
                <Icon size={13} className="text-slate-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
            </span>
            <p className="mb-1.5 text-[11px] leading-snug text-slate-500">{hint}</p>
            {children}
        </div>
    );
}
