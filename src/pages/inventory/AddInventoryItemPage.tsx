// ─────────────────────────────────────────────────────────────────────────────
// Adding an inventory item — a page rather than a pop-up.
//
// It was a dialog, and the form outgrew it: a vendor, a name, two numbers, two
// dates, the whole monitoring block and an assignment that branches into a
// vehicle and its driver do not belong in a box the page has to scroll behind.
// So it is the same wizard chrome the Add Asset and Add Account pages use — a
// left-hand rail of sections, each a card.
//
// The same page opens an existing item for editing (`editId`), against the same
// draft, so nothing captured one way is dropped by the other.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Check } from "lucide-react";
import { WizardHeader, WizardSection, WizardStepNav, type WizardStep } from "@/components/ui/WizardEditor";
import {
    VENDORS,
    INVENTORY_ITEMS,
    itemName,
    inventoryMonitoring,
    type Assignment,
    type InventoryItem,
    type InventoryStatus,
} from "./inventory.data";
import {
    InventoryItemSection, INVENTORY_SECTIONS, emptyInventoryDraft, draftAssignment, draftIsValid,
    sectionFilled, type InventoryItemDraft, type InventorySectionId,
} from "./InventoryItemFields";
import { useInventoryAdditions } from "./inventory-store";
import { logInventoryEvent, describeChanges } from "./inventory-activity";
import { cn } from "@/lib/utils";

type Props = {
    onNavigate: (path: string) => void;
    /** Carrier scope — drives the vendor dropdown + assignment picker. */
    accountId?: string;
    /** When set, the page opens in edit mode, prefilled from this inventory item. */
    editId?: string;
};

export type InventoryFormPayload = {
    vendorId: string;
    name?: string;
    serial: string;
    pin: string;
    issueDate: string;
    expiryDate: string;
    status: InventoryStatus;
    monitoring: InventoryItemDraft["monitoring"];
    assignedTo?: Assignment;
};

/** The prototype has no session; a real signed-in user replaces this. */
const CAPTURED_BY = "Fleet Manager";

const STEPS: readonly WizardStep[] = INVENTORY_SECTIONS.map((s) => ({ id: s.id, label: s.label, icon: s.icon }));

export function AddInventoryItemPage({ onNavigate, accountId, editId }: Props) {
    // Vendor dropdown is scoped to the active carrier. Each Vendor row in VENDORS carries an
    // accountId, so we filter directly. Falls back to the global list when no carrier is active.
    const vendors = useMemo(() => {
        if (!accountId) return VENDORS;
        const carrierVendors = VENDORS.filter((v) => v.accountId === accountId);
        return carrierVendors.length > 0 ? carrierVendors : VENDORS;
    }, [accountId]);

    const { additions, add, update, applyEdit } = useInventoryAdditions(accountId);

    const editing = useMemo(() => {
        if (!editId) return undefined;
        const found = additions.find((i) => i.id === editId) ?? INVENTORY_ITEMS.find((i) => i.id === editId);
        // `additions` already has edits applied; a seeded row needs them laid over it here,
        // or the form opens on the original values and saving quietly undoes the last change.
        return found && applyEdit(found);
    }, [editId, additions, applyEdit]);

    // Opening an item reads it into the SAME draft the add form fills in, so nothing captured
    // one way is dropped by the other — including an item filed against a driver, which this
    // page used to silently turn back into an unassigned truck.
    const [draft, setDraft] = useState<InventoryItemDraft>(() => {
        const blank = emptyInventoryDraft(vendors.find((v) => v.id === editing?.vendorId) ?? vendors[0]);
        if (!editing) return blank;
        return {
            ...blank,
            vendorId: editing.vendorId,
            name: itemName(editing),
            serial: editing.serial,
            pin: editing.pin,
            issueDate: editing.issueDate,
            expiryDate: editing.expiryDate,
            status: editing.status,
            monitoring: inventoryMonitoring(editing),
            assignmentKind: editing.assignedTo?.kind ?? "cmv",
            targetId: editing.assignedTo?.targetId ?? "",
            alsoDriverOfAsset: !!editing.assignedTo?.alsoDriverOfAsset,
        };
    });

    const isValid = draftIsValid(draft);

    // ── Section navigator ── the form scrolls inside `scrollRef`, and the rail follows it
    // (scroll-spy), exactly as the Add Asset wizard does.
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [activeStep, setActiveStep] = useState<string>(STEPS[0].id);

    useEffect(() => {
        const root = scrollRef.current;
        if (!root) return;
        const obs = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((e) => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible[0]) setActiveStep(visible[0].target.id.replace("section-", ""));
            },
            { root, rootMargin: "-12px 0px -55% 0px", threshold: 0 },
        );
        for (const s of STEPS) {
            const sec = document.getElementById(`section-${s.id}`);
            if (sec) obs.observe(sec);
        }
        return () => obs.disconnect();
    }, []);

    const go = (id: string) => {
        const sec = document.getElementById(`section-${id}`);
        const el = scrollRef.current;
        if (!sec || !el) return;
        el.scrollTo({ top: el.scrollTop + (sec.getBoundingClientRect().top - el.getBoundingClientRect().top) - 12, behavior: "smooth" });
        setActiveStep(id);
    };

    const handleSave = () => {
        if (!isValid) return;
        const payload: InventoryFormPayload = {
            vendorId: draft.vendorId,
            name: draft.name.trim() || undefined,
            serial: draft.serial.trim(),
            pin: draft.pin.trim(),
            issueDate: draft.issueDate,
            expiryDate: draft.expiryDate,
            status: draft.status,
            monitoring: draft.monitoring,
            assignedTo: draftAssignment(draft),
        };
        if (!editing) {
            // A new item goes straight into the list the way the pop-up's did — the page
            // replaced the dialog, not what it was for.
            const item: InventoryItem = {
                id: `inv-add-${Date.now()}`,
                ...payload,
                // The old two-word schedule is what the seeded rows carry; a new item is
                // described by its monitoring config, so these stay neutral rather than
                // reading as a cadence nobody set.
                recurrence: "None",
                reminder: "None",
            };
            add(item);
            logInventoryEvent({
                itemId: item.id, accountId: accountId ?? "acct-001", kind: "created",
                title: "Added to inventory", by: CAPTURED_BY, role: "Office",
                detail: [payload.serial && `Number ${payload.serial}`, `Status ${payload.status}`]
                    .filter(Boolean).join(" · "),
            });
            onNavigate("/inventory");
        } else {
            const next: InventoryItem = { ...editing, ...payload };
            update(editing.id, payload);
            // An "Updated" entry that does not say WHAT changed is why audit trails get
            // ignored, so the fields are diffed and named. Nothing changed, nothing logged.
            const changes = describeChanges(editing, next);
            if (changes.length) {
                logInventoryEvent({
                    itemId: editing.id, accountId: accountId ?? "acct-001", kind: "updated",
                    title: changes.length === 1 ? "Item updated" : `Item updated — ${changes.length} changes`,
                    detail: changes.join(" · "), by: CAPTURED_BY, role: "Office",
                });
            }
            // Back to the item, not to the list: you came from it, and you want to see the
            // change you just made land.
            onNavigate(`/inventory/items/${editing.id}`);
        }
    };

    const title = editing ? `Edit Inventory — ${itemName(editing)}` : "Add Inventory";

    return (
        <div className="flex h-full flex-col bg-[#F8FAFC] text-slate-900">
            <WizardHeader
                backLabel="Back to Inventory"
                onBack={() => onNavigate("/inventory")}
                icon={Boxes}
                title={title}
                subtitle="Item details, dates, alert and assignment."
                actions={
                    <>
                        <button
                            onClick={() => onNavigate("/inventory")}
                            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!isValid}
                            className={cn(
                                "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors",
                                isValid ? "bg-blue-600 hover:bg-blue-700" : "cursor-not-allowed bg-slate-300",
                            )}
                        >
                            <Check size={16} /> {editing ? "Update Inventory" : "Save Inventory"}
                        </button>
                    </>
                }
            />

            <div className="flex flex-1 overflow-hidden">
                <WizardStepNav steps={STEPS} active={activeStep} onGo={go} completionFor={(id) => sectionFilled(id as InventorySectionId, draft)} />

                <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto">
                    <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-8">
                        {INVENTORY_SECTIONS.map((s) => (
                            <WizardSection key={s.id} id={s.id} icon={s.icon} title={s.title} subtitle={s.subtitle}>
                                <InventoryItemSection id={s.id} draft={draft} onChange={setDraft} accountId={accountId} vendors={vendors} />
                            </WizardSection>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
