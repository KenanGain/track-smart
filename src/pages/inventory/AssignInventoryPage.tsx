// ─────────────────────────────────────────────────────────────────────────────
// Assigning and handing over — a page, not a pop-up.
//
// It outgrew the dialog: what they hold now, what can come back, a receipt tick
// per handed item, a list of everything free with two destinations each, who
// signed, and a message to the driver.
//
// Two steps, not three sections. "What they hold" and "what is free" were two cards
// asking one question — which of this carrier's inventory is on this vehicle — and
// answering it meant remembering the first while you scrolled the second. One list,
// with a tick per row: ticked means on it. Then who to tell, which is about what you
// just did and so genuinely comes second.
//
// One tick per row, and where it lands is the ITEM's answer, not a second question:
//
//   driver returnable → travels with whoever drives the vehicle
//   asset removable   → stays on the vehicle
//
// That used to be asked again here, twice: a "hand over" tick per row and a "carried by
// whoever drives this vehicle" box for the lot. Both re-decide, per assignment, something
// a fuel card and a reefer sensor already differ on — which is how the same card ends
// up carried on one truck and not on the next.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Boxes, Check, Truck, IdCard, MessageSquare, CircleSlash,
    ChevronLeft, ChevronRight, PackageCheck,
} from "lucide-react";
import { WizardHeader, WizardSection, WizardStepBar, type WizardStep } from "@/components/ui/WizardEditor";
import { PAGE_PAD } from "@/components/ui/ListPageHeader";
import {
    INVENTORY_ITEMS, getInventoryForCarrier, ACME_DRIVERS,
    driverOfAsset, itemName, itemTravelsWithDriver, type Assignment, type InventoryItem,
} from "./inventory.data";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-drivers.data";
import { assetsFor } from "./inventory-assignment";
import {
    rollupByDriver, rollupByAsset, unassignedItems,
    VIA_TONE, VIA_LABEL, removeActionFor as removeActionFor_,
    type HeldItem, type HolderKind, type HolderRow,
} from "./inventory-rollup";
import {
    useDriverHandovers, removeLines, handoverStatusOf, seedDemoHandovers, handedToMap,
    type DriverHandover,
} from "./handovers.data";
import { logInventoryEvent } from "./inventory-activity";
import { useInventoryAdditions } from "./inventory-store";
import { getOrCreateDriverConversation, setMessagesFocus } from "@/pages/messages/messages-store";
import { sendMovements, summarise, type Movement, type MovementPlan } from "./inventory-movements";
import {
    MovementNotify, useMovementPlans, sendablePlans, emptyNotifyState, type NotifyState,
} from "./MovementNotify";
import { ItemPickList, type HeldPickRow } from "./ItemPickList";
import { currentUserName } from "@/data/users.data";
import { todayISO } from "../hiring-process/FormKit";
import { cn } from "@/lib/utils";

type Props = {
    onNavigate: (path: string) => void;
    kind: HolderKind;
    holderId: string;
    accountId?: string;
};

const SECTIONS = [
    { id: "items", label: "Inventory", icon: Boxes, title: "Inventory", subtitle: "What is on it, and what is free to put on it." },
    { id: "notify", label: "Driver Notification", icon: MessageSquare, title: "Driver Notification", subtitle: "The collection list that lands in the driver app." },
] as const;
type SectionId = typeof SECTIONS[number]["id"];

const STEPS: readonly WizardStep[] = SECTIONS.map((s) => ({ id: s.id, label: s.label, icon: s.icon }));

export function AssignInventoryPage({ onNavigate, kind, holderId, accountId }: Props) {
    const isDriver = kind === "driver";
    const acct = accountId ?? "acct-001";
    const back = isDriver ? "/inventory/drivers" : "/inventory/assets";

    const { additions, applyEdit, update } = useInventoryAdditions(accountId);
    const items = useMemo<InventoryItem[]>(() => {
        const base = (accountId ? getInventoryForCarrier(accountId) : INVENTORY_ITEMS).map(applyEdit);
        return additions.length ? [...additions, ...base] : base;
    }, [accountId, additions, applyEdit]);

    const { records, get, save } = useDriverHandovers(acct);

    useEffect(() => {
        const roster = (CARRIER_DRIVERS[acct] ?? ACME_DRIVERS)
            .filter((d: any) => d.status === "Active")
            .map((d: any) => ({ id: d.id, name: d.name ?? `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() }));
        seedDemoHandovers(acct, records, roster, items, "Fleet Manager");
    }, [acct, records, items]);

    const handedTo = useMemo(() => handedToMap(records, acct), [records, acct]);

    // The holder's own row, off the same rollup the tabs read — so "what they hold" cannot
    // disagree between the list and this page.
    const row: HolderRow | undefined = useMemo(() => {
        const rows = (isDriver ? rollupByDriver : rollupByAsset)(items, accountId, handedTo);
        return rows.find((r) => r.id === holderId);
    }, [isDriver, items, accountId, handedTo, holderId]);

    const available = useMemo(() => unassignedItems(items, handedTo), [items, handedTo]);

    const holderLabel = row?.label ?? "—";
    const handDriver = isDriver
        ? { id: holderId, name: holderLabel }
        : driverOfAsset(holderId, accountId);
    const existing: DriverHandover | undefined = handDriver ? get(handDriver.id) : undefined;

    // ── Draft ────────────────────────────────────────────────────────────────
    const me = currentUserName();
    const [toAssign, setToAssign] = useState<Set<string>>(new Set());
    const [toRemove, setToRemove] = useState<Set<string>>(new Set());
    // Whoever is signed in is doing this. A receipt the office types a name into is a
    // receipt nobody signed.
    const issuedBy = me;
    // Read once and written back untouched. Nothing on this page can change either any
    // more — signed hand-overs are not a thing this flow creates — but a record that already
    // carries a driver's signature must not lose it just because a save passed through here.
    const [verified] = useState<Set<string>>(() => new Set(existing?.verifiedItemIds ?? []));
    const [driverConfirmed] = useState(!!existing?.driverSignoff?.done);

    // ── The message ──────────────────────────────────────────────────────────
    // Off until there is something to tell them about, and editable, because "come and get
    // it" is a different sentence depending on what it is and when the office is open.
    // The whole "tell them" block is one piece of state, shared with the other two forms
    // that ask the same question.
    const [notifyState, setNotifyState] = useState<NotifyState>(emptyNotifyState);
    const setNotifyPart = (next: Partial<NotifyState>) => setNotifyState((n) => ({ ...n, ...next }));

    const assetKind = useMemo<"cmv" | "non-cmv">(() => {
        if (isDriver) return "cmv";
        const a = assetsFor(accountId).find((x: any) => x.id === holderId) as any;
        return a?.assetCategory === "Non-CMV" ? "non-cmv" : "cmv";
    }, [isDriver, accountId, holderId]);

    // The rule lives with the rollup: the asset form shows the same pile and offers the
    // same undo, and two copies of it would drift.
    const removeActionFor = (h: HeldItem) => removeActionFor_(h, kind, holderId, !!handDriver);

    const rows = (row?.items ?? []).map((h) => ({ ...h, action: removeActionFor(h) }));

    /**
     * Does this item travel with the person, or stay on the unit?
     *
     * The item's own answer, given when it was added. An item from before the field existed
     * has no answer, and the safer guess is that it stays put: filing something against a
     * driver who never took it is harder to notice than the reverse.
     */
    const travelsWithDriver = (it: InventoryItem) => itemTravelsWithDriver(it);

    /** Where ticking a row would put it, in words, for the list's own column. */
    const destinationFor = (it: InventoryItem): string => {
        if (isDriver) return holderLabel;
        if (!travelsWithDriver(it)) return holderLabel;
        return handDriver?.name ?? `whoever drives ${holderLabel}`;
    };

    /**
     * What this holder has, as rows for the one list.
     *
     * The rollup knows how it got there and whether it can come off from here; this turns
     * that into the chip and the blocked reason the row needs, so the list component does
     * not have to learn the rule.
     */
    const heldRows = useMemo<HeldPickRow[]>(() => (row?.items ?? []).map((h) => {
        const action = removeActionFor(h);
        return {
            item: h.item,
            label: VIA_LABEL[kind][h.via],
            chipClass: VIA_TONE[h.via].chip,
            handed: false,
            removeBlocked: action ? null
                : `This is filed against something else — change it from there.`,
        };
    }), [row?.items, kind, holderId, handDriver?.id, toRemove, verified]);



    const toggle = (set: Set<string>, id: string, apply: (s: Set<string>) => void) => {
        const next = new Set(set);
        next.has(id) ? next.delete(id) : next.add(id);
        apply(next);
    };

    /** One tick: on this holder, or not. Where it lands follows from the item. */
    const pickAssign = (id: string) => toggle(toAssign, id, setToAssign);
    /** Unticking a held row: it comes off on save. Ticking it back puts it straight. */
    const pickRemove = (id: string) => toggle(toRemove, id, setToRemove);


    const unhanding = [...toRemove].filter((id) => rows.find((r) => r.item.id === id)?.action === "unhand");
    const unassigning = [...toRemove].filter((id) => rows.find((r) => r.item.id === id)?.action === "unassign");

    // Nothing on this page is on a signed checklist any more: an item is on the vehicle,
    // and the returnable half of it travels with whoever drives that vehicle.
    const handedRows: typeof rows = [];

    const wasVerified = new Set(existing?.verifiedItemIds ?? []);
    const receiptChanged =
        handedRows.some((r) => verified.has(r.item.id) !== wasVerified.has(r.item.id))
        || driverConfirmed !== !!existing?.driverSignoff?.done;


    const givingIds = [...toAssign];
    const changeCount = givingIds.length + toRemove.size + (receiptChanged ? 1 : 0);

    /**
     * What this save changes, said in the one vocabulary that decides who gets told.
     *
     * The page used to work that out itself, and knew about exactly one case: a collection
     * list for whatever was being given out. Taking something back told nobody, so the office
     * unassigned a fuel card and it stayed in the driver's pocket.
     */
    const movements = useMemo<Movement[]>(() => {
        const free = (id: string) => available.find((it) => it.id === id);
        const heldRow = (id: string) => rows.find((r) => r.item.id === id);
        const self = { id: holderId, name: holderLabel };
        const out: Movement[] = [];

        for (const id of toAssign) {
            const item = free(id);
            if (!item) continue;
            out.push(isDriver
                ? { kind: "assign-driver", item, person: self }
                // Carried is the ITEM's answer, so the message is right per item rather
                // than right for whichever box was ticked when the lot was saved.
                : { kind: "assign-vehicle", item, person: handDriver, holderLabel, carried: travelsWithDriver(item) });
        }
        for (const id of unassigning) {
            const r = heldRow(id);
            if (!r) continue;
            out.push(isDriver
                ? { kind: "unassign-driver", item: r.item, person: self }
                // Only somebody carrying it has to do anything: a spare key coming off a
                // parked truck moves on paper only.
                : { kind: "unassign-vehicle", item: r.item, person: handDriver, holderLabel, carried: r.via === "returnable" });
        }
        for (const id of unhanding) {
            const r = heldRow(id);
            if (r && handDriver) out.push({ kind: "take-back", item: r.item, person: handDriver, holderLabel: isDriver ? undefined : holderLabel });
        }
        return out;
    }, [toAssign, toRemove, available, rows, isDriver, holderId, holderLabel, handDriver?.id]);

    /**
     * What the driver has to come and get.
     *
     * The ticked items that travel with them. Something asset removable is fitted to the
     * truck — nobody walks to the office for a reefer sensor — so listing it here would
     * be asking for something nobody is asking for.
     */
    /** The ticked items, as items: what the confirmation reads from. */
    const givingItems = useMemo(
        () => [...toAssign].map((id) => available.find((it) => it.id === id)).filter((it): it is InventoryItem => !!it),
        [toAssign, available],
    );
    const takingItems = useMemo(
        () => [...toRemove].map((id) => rows.find((r) => r.item.id === id)?.item).filter((it): it is InventoryItem => !!it),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [toRemove, row?.items],
    );

    const collecting = useMemo(
        () => [...toAssign].map((id) => available.find((it) => it.id === id))
            .filter((it): it is InventoryItem => !!it && travelsWithDriver(it)),
        [toAssign, available],
    );
    const stayingOn = useMemo(
        () => [...toAssign].map((id) => available.find((it) => it.id === id))
            .filter((it): it is InventoryItem => !!it && !travelsWithDriver(it)),
        [toAssign, available],
    );

    /**
     * Has the notification step been opened?
     *
     * Not "has it been filled in" — the draft is already written and may be exactly right.
     * What must not happen is a message going to a driver that nobody in the office ever
     * looked at, so the gate is on having SEEN it.
     */
    const [seenNotify, setSeenNotify] = useState(false);

    /** The messages this save would send, with any wording somebody has typed. */
    const plans = useMovementPlans(movements, notifyState);
    const sending = sendablePlans(plans, notifyState);

    /**
     * Does this save have to be read before it happens?
     *
     * Only when something is going to a person. Everything driver-returnable means a trip
     * to the office for somebody, and the message that asks for it goes out on save — so
     * the office reads it first. A save that only files kit against a vehicle sends nothing
     * and is gated by nothing.
     */
    const mustNotify = sending.length > 0;
    const notifyPending = mustNotify && !seenNotify;
    /**
     * Saving and sending are one action, so the button says so.
     *
     * It changes as you change the tick on the notification step: untick "send this message"
     * and it reads "Save changes" again. A button labelled the same either way leaves the
     * only evidence of an outgoing message on a screen you have scrolled past.
     */
    const saveLabel = sending.length > 0 ? "Save & send" : "Save changes";


    // ── The steps ────────────────────────────X
    //
    // One on screen at a time. They were stacked in a single scroller with a scroll-spy
    // lighting whichever was nearest the top, which is a long page with a progress bar over
    // it: the list could never have the full height, and "which step am I on" was answered
    // by where you had scrolled to.
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [activeStep, setActiveStep] = useState<SectionId>(STEPS[0].id as SectionId);
    const stepIndex = STEPS.findIndex((x) => x.id === activeStep);

    const go = (id: string) => {
        setActiveStep(id as SectionId);
        if (id === "notify") setSeenNotify(true);
        // A new page starts at its top, whatever the last one was scrolled to.
        scrollRef.current?.scrollTo({ top: 0 });
    };

    const filled = (id: SectionId): number => {
        switch (id) {
            case "items": return givingIds.length + toRemove.size + (receiptChanged ? 1 : 0);
            case "notify": return sending.length;
        }
    };

    // ── Save ─────────────────────────────────────────────────────────────────
    // Nothing here is undoable from this page: the items move, the messages go, and the
    // page navigates away. So the button opens the confirmation rather than doing it.
    const [confirming, setConfirming] = useState(false);

    const save_ = () => {
        if (changeCount === 0) return;
        setConfirming(false);

        // Where each one lands is its own answer: driver returnable rides with whoever
        // drives the vehicle, asset removable stays on it.
        for (const itemId of toAssign) {
            const item = available.find((it) => it.id === itemId);
            const assignedTo: Assignment = isDriver
                ? { kind: "driver", targetId: holderId }
                : { kind: assetKind, targetId: holderId, alsoDriverOfAsset: !!item && travelsWithDriver(item) };
            update(itemId, { assignedTo });
        }
        for (const itemId of unassigning) update(itemId, { assignedTo: undefined });

        // Nothing here creates a hand-over any more. What is left is taking an existing
        // one back, and recording the receipts against it.
        if (handDriver && (unhanding.length > 0 || receiptChanged)) {
            const stamp = Date.now();
            const sign = { name: issuedBy.trim() || me, role: "Fleet Manager", date: todayISO(), sig: "", done: true };
            let rec: DriverHandover = existing ?? {
                driverId: handDriver.id, accountId: acct, checklistName: "Hand-over",
                lines: [], issuedByName: sign.name, issuedByTitle: "Fleet Manager",
                verifiedItemIds: [], updatedAt: stamp,
            };
            if (unhanding.length) rec = removeLines(rec, unhanding);
            // Receipt is recorded against the lines that survived, so an item taken back
            // cannot leave a tick behind claiming the driver still has it.
            const stillOn = new Set(rec.lines.map((l) => l.itemId));
            rec = { ...rec, verifiedItemIds: [...verified].filter((id) => stillOn.has(id)) };
            if (driverConfirmed) {
                rec = { ...rec, driverSignoff: { name: handDriver.name, role: "Driver", date: todayISO(), sig: "", done: true } };
            } else if (rec.driverSignoff?.done) {
                rec = { ...rec, driverSignoff: { ...rec.driverSignoff, done: false } };
            }
            save(rec);
        }

        // ── The trail ────────────────────────────────────────────────────────
        for (const itemId of toAssign) {
            const item = available.find((it) => it.id === itemId);
            const rides = !isDriver && !!item && travelsWithDriver(item);
            logInventoryEvent({
                itemId, accountId: acct, kind: "assigned",
                title: isDriver ? "Assigned to driver" : "Assigned to vehicle",
                // Which of the two it was, so the trail says where the thing actually went.
                detail: rides ? `${holderLabel} · rides with its driver` : holderLabel,
                by: me, role: "Office",
            });
        }
        for (const itemId of unassigning) {
            logInventoryEvent({
                itemId, accountId: acct, kind: "updated",
                title: "Unassigned", detail: `Taken back from ${holderLabel}`, by: me, role: "Office",
            });
        }
        for (const r of handedRows) {
            const now = verified.has(r.item.id);
            if (now === wasVerified.has(r.item.id)) continue;
            logInventoryEvent({
                itemId: r.item.id, accountId: acct,
                kind: now ? "verified" : "updated",
                title: now ? "Confirmed received by driver" : "Receipt withdrawn",
                detail: now
                    ? `${handDriver?.name ?? "The driver"} confirmed they have this`
                    : `${handDriver?.name ?? "The driver"} no longer confirms this`,
                by: me, role: "Office",
            });
        }
        for (const itemId of unhanding) {
            logInventoryEvent({
                itemId, accountId: acct, kind: "updated",
                title: "Returned by driver",
                detail: `Taken off ${handDriver?.name ?? holderLabel}'s hand-over checklist`,
                by: me, role: "Office",
            });
        }

        // ── …and tell them ───────────────────────────────────────────────────
        // A driver cannot collect what nobody told them about, which is why this sits in the
        // same save rather than being a thing to remember afterwards.
        // The checklist, not a paragraph: text tells somebody what to do and leaves them no
        // way to say they did it, which puts the receipt back on the office to tick by hand
        // from a conversation it has to go and read.
        if (sending.length) {
            sendMovements(sending, { accountId: acct, issuedBy: issuedBy.trim() || me });
        }

        onNavigate(back);
    };

    // An id that matches nothing is a dead link, not a blank page.
    if (!row) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50 text-center">
                <CircleSlash size={32} className="text-slate-300" />
                <div>
                    <p className="text-sm font-semibold text-slate-700">That {isDriver ? "driver" : "asset"} is no longer here</p>
                    <p className="mt-1 text-xs text-slate-500">They may have been removed, or belong to another carrier.</p>
                </div>
                <button onClick={() => onNavigate(back)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
                    Back to {isDriver ? "Drivers" : "Assets"}
                </button>
            </div>
        );
    }

    const status = existing ? handoverStatusOf(existing) : "not-issued";

    return (
        <div className="flex h-full flex-col bg-[#F8FAFC] text-slate-900">
            <WizardHeader
                backLabel={`Back to ${isDriver ? "Drivers" : "Assets"}`}
                onBack={() => onNavigate(back)}
                icon={isDriver ? IdCard : Truck}
                title={`Manage inventory — ${holderLabel}`}
                subtitle={
                    [
                        isDriver ? "Driver" : `${row.kindLabel ?? "Asset"} · ${row.sub}`,
                        `${row.items.length} item${row.items.length === 1 ? "" : "s"} held`,
                        !isDriver && handDriver ? `driven by ${handDriver.name}` : null,
                        status === "verified" ? "hand-over verified"
                            : status === "handed-over" ? "awaiting driver" : null,
                    ].filter(Boolean).join(" · ")
                }
            />

            {/* Two steps, across the top. A 288px column saying "complete each section"
                is a lot of chrome for two, and the second may correctly be empty. */}
            <WizardStepBar steps={STEPS} active={activeStep} onGo={go} completionFor={(id) => filled(id as SectionId)} />

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {/* Where you are in the job, and the one thing to do next. Directly under
                    the stepper and OUTSIDE the scroller, so it never moves: inside it, it
                    sat under the table’s own pager and jumped every time the list paged.

                    On the last step the button is the save. One per screen, and it is
                    whatever this step’s next move is. */}
                <div className={cn(
                    "flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 bg-white py-3",
                    PAGE_PAD,
                )}>
                    {/* Step navigation, not an action: it goes back a page, it does not undo
                        anything. Quiet enough not to read as a second choice. */}
                    <button
                        type="button"
                        onClick={() => go(STEPS[stepIndex - 1].id)}
                        disabled={stepIndex === 0}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-bold transition-colors",
                            stepIndex === 0
                                ? "cursor-not-allowed text-slate-300"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                        )}
                    >
                        <ChevronLeft size={16} /> Back
                    </button>

                    {/* What is waiting to be saved. The one button no longer sits beside the
                        ticks, and "Save changes" over seventeen rows should not send anybody
                        scrolling up to count them. */}
                    <p className="min-w-0 flex-1 truncate text-[12px] text-slate-500">
                        {changeCount === 0
                            ? <>Nothing picked yet — tick something on the list.</>
                            : <>
                                <span className="font-bold text-slate-700">{changeCount}</span>
                                {" "}change{changeCount === 1 ? "" : "s"}
                                {givingItems.length > 0 && <> · {givingItems.length} going on</>}
                                {takingItems.length > 0 && <> · {takingItems.length} coming off</>}
                                {sending.length > 0 && <> · {sending.length} message{sending.length === 1 ? "" : "s"}</>}
                            </>}
                    </p>

                    {/* THE button. One per screen, and it is whatever this step's next move
                        is: on to the notification when somebody has to be told, otherwise
                        straight to the confirmation. */}
                    <button
                        type="button"
                        onClick={() => (notifyPending ? go("notify") : setConfirming(true))}
                        disabled={changeCount === 0}
                        title={notifyPending
                            ? "Something you have picked travels with the driver. Read what they will be told first."
                            : undefined}
                        className={cn(
                            "inline-flex shrink-0 items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors",
                            changeCount === 0 ? "cursor-not-allowed bg-slate-300"
                                // Dark rather than disabled while the notification is unread:
                                // a dead button tells you nothing. This one takes you there.
                                : notifyPending ? "bg-slate-900 hover:bg-slate-700"
                                : "bg-blue-600 hover:bg-blue-700",
                        )}
                    >
                        {notifyPending
                            ? <><MessageSquare size={16} /> {STEPS[1].label} <ChevronRight size={16} /></>
                            : <><Check size={16} /> {saveLabel}</>}
                    </button>
                </div>
                <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
                    {/* The picker is a table with a checkbox column; max-w-4xl made it
                        scroll sideways on a screen with room to spare. */}
                    <div className={cn("w-full space-y-6 py-4 sm:py-6", PAGE_PAD)}>


                        {/* ── Step 1 — the inventory ──────────────── */}
                        {activeStep === "items" && (
                        <section id="section-items">
                            {/* ONE list: what is on this holder now, then what is free to
                                put on it. The tick means the same thing in both halves — on it — so
                                giving something out and taking something back are the same gesture
                                rather than a tick in one card and a red button in another. */}
                            <ItemPickList
                                items={available}
                                held={heldRows}
                                removing={toRemove}
                                onRemove={pickRemove}
                                assigned={toAssign}
                                onAssign={pickAssign}
                                holderNoun={isDriver ? "driver" : "vehicle"}
                                destinationFor={destinationFor}
                                emptyAll={<>Nothing is on this {isDriver ? "driver" : "asset"}, and every item in this
                                    carrier's inventory is already somewhere else. Take one back first, or add a new item.</>}
                            />




                        </section>
                        )}

                        {/* ── Step 2 — who to tell ──────────────── */}
                        {activeStep === "notify" && (
                        <WizardSection id="notify" icon={MessageSquare} title="Driver Notification" subtitle={SECTIONS[1].subtitle}>
                            {/* What you just picked, split by whether anybody has to move.
                                Checking the message without being able to see what it is about
                                meant going back a step to read the ticks again. */}
                            {(collecting.length > 0 || stayingOn.length > 0) && (
                                <div className="mb-4 overflow-hidden rounded-xl border border-slate-200">
                                    <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2">
                                        <PackageCheck size={13} className="shrink-0 text-blue-600" />
                                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
                                            {handDriver?.name ?? "The driver"} collects
                                        </span>
                                        <span className="ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full bg-blue-100 px-1.5 text-[10px] font-bold tabular-nums text-blue-700">
                                            {collecting.length}
                                        </span>
                                    </div>
                                    {collecting.length === 0 ? (
                                        <p className="px-3 py-3 text-[12px] text-slate-500">
                                            Nothing you have picked travels with the driver, so there is
                                            nothing for them to collect.
                                        </p>
                                    ) : (
                                        <ul className="divide-y divide-slate-100">
                                            {collecting.map((it) => (
                                                <li key={it.id} className="flex items-center gap-2.5 px-3 py-2">
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-[13px] font-semibold text-slate-800">{itemName(it)}</span>
                                                        {it.serial && <span className="block truncate font-mono text-[11px] text-slate-500">{it.serial}</span>}
                                                    </span>
                                                    <span className="shrink-0 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                                                        Driver returnable
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {/* Said once, so the count above is not read as "you forgot some". */}
                                    {stayingOn.length > 0 && (
                                        <p className="border-t border-slate-100 bg-slate-50/50 px-3 py-2 text-[11px] leading-snug text-slate-500">
                                            {stayingOn.length} other{stayingOn.length === 1 ? "" : "s"} stay{stayingOn.length === 1 ? "s" : ""} on
                                            {" "}{holderLabel} — fitted to it rather than carried, so nobody has to
                                            fetch {stayingOn.length === 1 ? "it" : "them"}.
                                        </p>
                                    )}
                                </div>
                            )}

                            <MovementNotify
                                plans={plans}
                                state={notifyState}
                                onChange={setNotifyPart}
                                onOpenChat={(name) => { setMessagesFocus(getOrCreateDriverConversation(name)); onNavigate("/messages"); }}
                                emptyHint={
                                    !handDriver && !isDriver
                                        ? <>Nobody drives this vehicle, so there is no one to message. Assign a driver on the asset and anything that rides in the cab can be asked for.</>
                                        : givingIds.length === 0 && toRemove.size === 0
                                            ? <>Nothing is changing hands yet. Give something out or take something back, and the messages it needs will be drafted here.</>
                                            : <>Nothing here has to move: what you have picked stays with the vehicle rather than travelling with anybody.</>
                                }
                            />
                        </WizardSection>
                        )}

                    </div>
                </div>

            </div>

            {/* Nothing on this page is undoable once it runs: items move, messages go out,
                and the page navigates away. So it is said once, in full, first. */}
            {confirming && (
                <ConfirmChanges
                    holderLabel={holderLabel}
                    holderNoun={isDriver ? "driver" : "vehicle"}
                    giving={givingItems}
                    taking={takingItems}
                    plans={sending}
                    onCancel={() => setConfirming(false)}
                    onConfirm={save_}
                />
            )}
        </div>
    );
}

/**
 * What this save is about to do, before it does it.
 *
 * Three facts, in the order they matter: what goes onto the unit, what comes off it, and
 * who gets told. The last is the one that cannot be taken back — a message in a driver's
 * app is read on a phone at a truck stop, and "ignore that" is a second message.
 */
function ConfirmChanges({
    holderLabel, holderNoun, giving, taking, plans, onCancel, onConfirm,
}: {
    holderLabel: string;
    holderNoun: string;
    giving: InventoryItem[];
    taking: InventoryItem[];
    plans: MovementPlan[];
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const Row = ({ it }: { it: InventoryItem }) => (
        <li className="flex items-center gap-2 py-1">
            <span className="min-w-0 flex-1 truncate text-[13px] text-slate-700">{itemName(it)}</span>
            {itemTravelsWithDriver(it)
                ? <span className="shrink-0 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">Driver</span>
                : <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">Asset</span>}
        </li>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="text-base font-black text-slate-900">Confirm these changes</h2>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                        {holderLabel} — this is what will happen when you save.
                    </p>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                    {giving.length > 0 && (
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Going onto this {holderNoun} ({giving.length})
                            </p>
                            <ul className="mt-1 divide-y divide-slate-100">{giving.map((it) => <Row key={it.id} it={it} />)}</ul>
                        </div>
                    )}
                    {taking.length > 0 && (
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Coming off it ({taking.length})
                            </p>
                            <ul className="mt-1 divide-y divide-slate-100">{taking.map((it) => <Row key={it.id} it={it} />)}</ul>
                        </div>
                    )}

                    {/* The half that leaves this app. Said as a sentence per message rather
                        than as a count: "2 notifications" does not tell you who is being
                        asked to walk to the office. */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Who gets told</p>
                        {plans.length === 0 ? (
                            <p className="mt-1 text-[12px] text-slate-500">
                                Nobody. Everything here stays with the {holderNoun}, so there is no
                                message to send.
                            </p>
                        ) : (
                            <ul className="mt-1 space-y-1">
                                {plans.map((p) => (
                                    <li key={`${p.driverId}-${p.direction}`} className="flex items-start gap-2 text-[12px] text-slate-700">
                                        <MessageSquare size={13} className="mt-0.5 shrink-0 text-blue-600" />
                                        <span>{summarise(p)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/60 px-5 py-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                    >
                        Go back
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                    >
                        <Check size={16} /> {plans.length > 0 ? "Save and send" : "Save changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
