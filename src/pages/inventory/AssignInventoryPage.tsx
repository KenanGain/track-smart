// ─────────────────────────────────────────────────────────────────────────────
// Assigning and handing over — a page, not a pop-up.
//
// It outgrew the dialog: what they hold now, what can come back, a receipt tick
// per handed item, a list of everything free with two destinations each, who
// signed, and a message to the driver. A box the page scrolls behind is the wrong
// container for that, so it is the same wizard chrome as Add Inventory — a rail
// of sections, each a card.
//
// Two ways something reaches a person, one answer per row:
//
//   Assign    — the item is filed where it belongs. No signature.
//   Hand over — onto a driver's signed hand-over checklist. Somebody hands it
//               across and signs; the driver confirms receipt afterwards.
//
// On a vehicle, "hand over" means to the driver OF that vehicle. A truck signs
// for nothing itself, so with no driver assigned the tick is unavailable.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Boxes, Check, Search, Plus, Undo2, Truck, IdCard, Info, AlertTriangle,
    PackageCheck, PenLine, ClipboardList, CheckCheck, Ban, X, MessageSquare,
    ListChecks, Send, CircleSlash, Smartphone,
} from "lucide-react";
import { WizardHeader, WizardSection, WizardStepNav, type WizardStep } from "@/components/ui/WizardEditor";
import {
    INVENTORY_ITEMS, getInventoryForCarrier, VENDORS, ACME_DRIVERS,
    driverOfAsset, itemName, type Assignment, type InventoryItem,
} from "./inventory.data";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-drivers.data";
import { assetsFor, fmtDate } from "./inventory-assignment";
import {
    rollupByDriver, rollupByAsset, unassignedItems,
    VIA_TONE, VIA_LABEL, removeActionFor as removeActionFor_,
    type HeldItem, type HeldVia, type HolderKind, type HolderRow,
} from "./inventory-rollup";
import {
    useDriverHandovers, appendLines, removeLines, handoverStatusOf, seedDemoHandovers, handedToMap,
    HANDOVER_CATEGORIES, type DriverHandover,
} from "./handovers.data";
import { logInventoryEvent } from "./inventory-activity";
import { useInventoryAdditions } from "./inventory-store";
import { getOrCreateDriverConversation, setMessagesFocus } from "@/pages/messages/messages-store";
import { requestCollection, draftCollectionNote, collectionLineFor } from "./inventory-collection";
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
    { id: "holding", label: "Holding", icon: ListChecks, title: "Currently holding", subtitle: "What they have, and what can come back." },
    { id: "give", label: "Give out", icon: Boxes, title: "Give out", subtitle: "Everything on nobody — assign it, or hand it across." },
    { id: "notify", label: "Notify", icon: MessageSquare, title: "Tell them", subtitle: "A message asking them to collect it from the office." },
] as const;
type SectionId = typeof SECTIONS[number]["id"];

/** The three ways something is held, in the order the list groups them. */
const VIA_ORDER: readonly HeldVia[] = ["direct", "carried", "handed"];
const STEPS: readonly WizardStep[] = SECTIONS.map((s) => ({ id: s.id, label: s.label, icon: s.icon }));

const vendorOf = (it: InventoryItem) => {
    const v = VENDORS.find((x) => x.id === it.vendorId);
    return v?.companyName || v?.name || "—";
};

const isHandoverCategory = (it: InventoryItem) => {
    const v = VENDORS.find((x) => x.id === it.vendorId);
    return !!v && HANDOVER_CATEGORIES.includes(v.categoryId);
};

const initialsOf = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};

/**
 * One of the two ticks on a row.
 *
 * A disabled tick carries its reason rather than just greying out: "why can I not hand this
 * over" is the question a dimmed box provokes and never answers.
 */
function Tick({ on, tone, label, disabledReason, onToggle }: {
    on: boolean; tone: "blue" | "violet"; label: string;
    disabledReason?: string | null; onToggle: () => void;
}) {
    const blocked = !!disabledReason;
    return (
        <button
            type="button" onClick={onToggle} disabled={blocked}
            title={disabledReason ?? label} aria-label={label} aria-pressed={on}
            className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                blocked ? "cursor-not-allowed border-slate-200 bg-slate-100"
                    : on
                        ? tone === "blue" ? "border-blue-600 bg-blue-600 text-white" : "border-violet-600 bg-violet-600 text-white"
                        : "border-slate-300 bg-white hover:border-slate-400",
            )}
        >
            {blocked ? <Ban size={11} className="text-slate-300" />
                : on ? <Check size={13} />
                : <Plus size={12} className="text-slate-400" />}
        </button>
    );
}

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
    const [addSearch, setAddSearch] = useState("");
    const [toAssign, setToAssign] = useState<Set<string>>(new Set());
    const [toHand, setToHand] = useState<Set<string>>(new Set());
    const [toRemove, setToRemove] = useState<Set<string>>(new Set());
    const [carried, setCarried] = useState(false);
    const [issuedBy, setIssuedBy] = useState(me);
    const [editingSigner, setEditingSigner] = useState(false);
    const [verified, setVerified] = useState<Set<string>>(() => new Set(existing?.verifiedItemIds ?? []));
    const [driverConfirmed, setDriverConfirmed] = useState(!!existing?.driverSignoff?.done);

    // ── The message ──────────────────────────────────────────────────────────
    // Off until there is something to tell them about, and editable, because "come and get
    // it" is a different sentence depending on what it is and when the office is open.
    const [notify, setNotify] = useState(true);
    const [noteTouched, setNoteTouched] = useState(false);
    const [note, setNote] = useState("");

    const assetKind = useMemo<"cmv" | "non-cmv">(() => {
        if (isDriver) return "cmv";
        const a = assetsFor(accountId).find((x: any) => x.id === holderId) as any;
        return a?.assetCategory === "Non-CMV" ? "non-cmv" : "cmv";
    }, [isDriver, accountId, holderId]);

    // The rule lives with the rollup: the asset form shows the same pile and offers the
    // same undo, and two copies of it would drift.
    const removeActionFor = (h: HeldItem) => removeActionFor_(h, kind, holderId, !!handDriver);

    const rows = (row?.items ?? []).map((h) => ({ ...h, action: removeActionFor(h) }));
    const fixed = rows.filter((r) => r.action === null);

    const handBlockedBecause = (it: InventoryItem): string | null => {
        if (!handDriver) return "No driver is assigned to this vehicle";
        if (!isHandoverCategory(it)) return "Hand-overs cover company-issued kit — assign this instead";
        return null;
    };

    const addable = useMemo(() => {
        const q = addSearch.trim().toLowerCase();
        if (!q) return available;
        return available.filter((it) =>
            itemName(it).toLowerCase().includes(q)
            || it.serial.toLowerCase().includes(q)
            || vendorOf(it).toLowerCase().includes(q));
    }, [available, addSearch]);

    const toggle = (set: Set<string>, id: string, apply: (s: Set<string>) => void) => {
        const next = new Set(set);
        next.has(id) ? next.delete(id) : next.add(id);
        apply(next);
    };

    // One answer per row: ticking one end clears the other. The two are destinations, not a
    // pair of boxes to fill in.
    const pickAssign = (id: string) => {
        if (toHand.has(id)) setToHand((p) => { const n = new Set(p); n.delete(id); return n; });
        toggle(toAssign, id, setToAssign);
    };
    const pickHand = (id: string) => {
        if (toAssign.has(id)) setToAssign((p) => { const n = new Set(p); n.delete(id); return n; });
        toggle(toHand, id, setToHand);
    };

    const unhanding = [...toRemove].filter((id) => rows.find((r) => r.item.id === id)?.action === "unhand");
    const unassigning = [...toRemove].filter((id) => rows.find((r) => r.item.id === id)?.action === "unassign");

    const handedRows = rows.filter((r) => r.via === "handed" && !toRemove.has(r.item.id));
    const confirmedCount = handedRows.filter((r) => verified.has(r.item.id)).length;
    const allConfirmed = handedRows.length > 0 && confirmedCount === handedRows.length;

    const wasVerified = new Set(existing?.verifiedItemIds ?? []);
    const receiptChanged =
        handedRows.some((r) => verified.has(r.item.id) !== wasVerified.has(r.item.id))
        || driverConfirmed !== !!existing?.driverSignoff?.done;

    const toggleReceived = (id: string) => setVerified((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        // Un-ticking takes the confirmation with it: the driver cannot have signed for a list
        // that no longer matches what they say they have.
        if (!next.has(id)) setDriverConfirmed(false);
        return next;
    });

    const givingIds = [...toAssign, ...toHand];
    const changeCount = givingIds.length + toRemove.size + (receiptChanged ? 1 : 0);

    // The default message names what is waiting, and stops naming it once you have typed
    // your own — an edit somebody made is theirs.
    // What is going out, as the checklist the driver will tick.
    const lines = useMemo(
        () => givingIds
            .map((id) => available.find((it) => it.id === id))
            .filter(Boolean)
            .map((it) => collectionLineFor(it!, toHand.has(it!.id) ? "handed" : "assigned")),
        [givingIds.join(","), available, toHand],
    );

    const suggested = useMemo(
        () => (lines.length === 0 || !handDriver
            ? ""
            : draftCollectionNote(handDriver.name, lines, toHand.size > 0)),
        [lines, handDriver, toHand.size],
    );

    useEffect(() => { if (!noteTouched) setNote(suggested); }, [suggested, noteTouched]);

    const canNotify = !!handDriver && givingIds.length > 0;

    // ── Section rail ─────────────────────────────────────────────────────────
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

    const filled = (id: SectionId): number => {
        switch (id) {
            case "holding": return toRemove.size + (receiptChanged ? 1 : 0);
            case "give": return givingIds.length;
            case "notify": return notify && canNotify && note.trim() ? 1 : 0;
        }
    };

    // ── Save ─────────────────────────────────────────────────────────────────
    const save_ = () => {
        if (changeCount === 0) return;

        const assignedTo: Assignment = isDriver
            ? { kind: "driver", targetId: holderId }
            : { kind: assetKind, targetId: holderId, alsoDriverOfAsset: carried };

        for (const itemId of toAssign) update(itemId, { assignedTo });
        for (const itemId of unassigning) update(itemId, { assignedTo: undefined });

        if (handDriver && (toHand.size + unhanding.length > 0 || receiptChanged)) {
            const stamp = Date.now();
            const sign = { name: issuedBy.trim() || me, role: "Fleet Manager", date: todayISO(), sig: "", done: true };
            let rec: DriverHandover = existing ?? {
                driverId: handDriver.id, accountId: acct, checklistName: "Hand-over",
                lines: [], issuedByName: sign.name, issuedByTitle: "Fleet Manager",
                verifiedItemIds: [], updatedAt: stamp,
            };
            if (toHand.size) {
                rec = appendLines(rec, [...toHand].map((itemId) => ({ itemId, qty: "1" })));
                // The staff sign-off is what makes it a hand-over rather than a draft list.
                rec = { ...rec, staffSignoff: sign, recordedAt: rec.recordedAt ?? stamp, issuedByName: sign.name };
            }
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
            logInventoryEvent({
                itemId, accountId: acct, kind: "assigned",
                title: isDriver ? "Assigned to driver" : "Assigned to vehicle",
                detail: carried && !isDriver ? `${holderLabel} · carried by its driver` : holderLabel,
                by: me, role: "Office",
            });
        }
        for (const itemId of toHand) {
            logInventoryEvent({
                itemId, accountId: acct, kind: "signed",
                title: "Handed over to driver",
                detail: `${handDriver?.name ?? "Driver"} · signed for by ${issuedBy.trim() || me}`
                    + (isDriver ? "" : ` · drives ${holderLabel}`),
                by: issuedBy.trim() || me, role: "Office",
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
        if (notify && canNotify && lines.length) {
            // The checklist, not a paragraph: text tells them what to collect and leaves them
            // no way to say they got it, which puts the receipt back on the office to tick by
            // hand from a conversation it has to go and read.
            requestCollection({
                accountId: acct,
                driverId: handDriver!.id,
                driverName: handDriver!.name,
                holderLabel: isDriver ? undefined : holderLabel,
                lines,
                issuedBy: issuedBy.trim() || me,
                note: note.trim() || undefined,
            });
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
                title={`${isDriver ? "Assign & hand over" : "Assign inventory"} — ${holderLabel}`}
                subtitle={
                    [
                        isDriver ? "Driver" : `${row.kindLabel ?? "Asset"} · ${row.sub}`,
                        `${row.items.length} item${row.items.length === 1 ? "" : "s"} held`,
                        !isDriver && handDriver ? `driven by ${handDriver.name}` : null,
                        status === "verified" ? "hand-over verified"
                            : status === "handed-over" ? "awaiting driver" : null,
                    ].filter(Boolean).join(" · ")
                }
                actions={
                    <>
                        <button
                            onClick={() => onNavigate(back)}
                            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={save_}
                            disabled={changeCount === 0}
                            className={cn(
                                "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors",
                                changeCount === 0 ? "cursor-not-allowed bg-slate-300"
                                    : toHand.size > 0 ? "bg-violet-600 hover:bg-violet-700"
                                    : "bg-blue-600 hover:bg-blue-700",
                            )}
                        >
                            {toHand.size > 0 ? <><PenLine size={16} /> Sign & hand over</> : <><Check size={16} /> Save assignment</>}
                        </button>
                    </>
                }
            />

            <div className="flex flex-1 overflow-hidden">
                <WizardStepNav steps={STEPS} active={activeStep} onGo={go} completionFor={(id) => filled(id as SectionId)} />

                <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto">
                    <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-8">

                        {/* ── Holding ──────────────────────────────────────── */}
                        <WizardSection id="holding" icon={ListChecks} title="Currently holding" subtitle={SECTIONS[0].subtitle}>
                            {rows.length === 0 ? (
                                <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
                                    Nothing is assigned to this {isDriver ? "driver" : "asset"} yet.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {VIA_ORDER.map((groupVia) => {
                                        const group = rows.filter((r) => r.via === groupVia);
                                        if (group.length === 0) return null;
                                        const isHandedGroup = groupVia === "handed";
                                        return (
                                            <div key={groupVia} className={cn(
                                                "overflow-hidden rounded-xl border",
                                                isHandedGroup ? "border-violet-200" : "border-slate-200",
                                            )}>
                                                {/* The route, once, for everything under it. */}
                                                <div className={cn(
                                                    "flex flex-wrap items-center gap-2 border-b px-3 py-2",
                                                    isHandedGroup ? "border-violet-100 bg-violet-50/60" : "border-slate-100 bg-slate-50/80",
                                                )}>
                                                    <span className={cn("h-3.5 w-1 shrink-0 rounded-full", VIA_TONE[groupVia].bar)} />
                                                    <span className={cn("text-[11px] font-bold uppercase tracking-wider", VIA_TONE[groupVia].text)}>
                                                        {VIA_LABEL[kind][groupVia]}
                                                    </span>
                                                    <span className="text-[11px] font-semibold text-slate-400">{group.length}</span>
                                                    {isHandedGroup && handedRows.length > 0 && (
                                                        <span className="ml-auto flex items-center gap-2">
                                                            <span className={cn("text-[11px] font-bold", allConfirmed ? "text-emerald-600" : "text-amber-600")}>
                                                                {confirmedCount} of {handedRows.length} confirmed
                                                            </span>
                                                            {/* Only worth a button once there is more than one to do. */}
                                                            {handedRows.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (allConfirmed) { setVerified(new Set()); setDriverConfirmed(false); }
                                                                        else setVerified(new Set([...verified, ...handedRows.map((r) => r.item.id)]));
                                                                    }}
                                                                    className="rounded-md border border-violet-200 bg-white px-2 py-0.5 text-[11px] font-bold text-violet-700 transition-colors hover:bg-violet-50"
                                                                >
                                                                    {allConfirmed ? "Clear" : "Confirm all"}
                                                                </button>
                                                            )}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="divide-y divide-slate-100">
                                                    {group.map(({ item, via, action }) => {
                                                        const picked = toRemove.has(item.id);
                                                        const got = verified.has(item.id);
                                                        return (
                                                            <div key={item.id} className={cn(
                                                                "flex items-center gap-3 px-3 py-2 transition-colors",
                                                                picked ? "bg-rose-50/60" : got ? "bg-emerald-50/40" : "bg-white",
                                                            )}>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className={cn(
                                                                        "truncate text-[13px] font-semibold",
                                                                        action ? "text-slate-800" : "text-slate-600",
                                                                        picked && "line-through",
                                                                    )}>
                                                                        {itemName(item)}
                                                                    </div>
                                                                    <div className="truncate text-[11px] text-slate-500">
                                                                        {vendorOf(item)}{item.serial && <span className="font-mono"> · {item.serial}</span>}
                                                                    </div>
                                                                </div>

                                                                <div className="flex shrink-0 items-center gap-1.5">
                                                                    {/* One receipt per item — a hand-over of five things is rarely
                                                                        five things received — and labelled with what it does,
                                                                        because a bare tick beside a Return button says nothing
                                                                        about which of the two it is. Something going back has
                                                                        nothing to confirm. */}
                                                                    {via === "handed" && !picked && (
                                                                        <button
                                                                            type="button" onClick={() => toggleReceived(item.id)} aria-pressed={got}
                                                                            className={cn(
                                                                                "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-bold transition-colors",
                                                                                got ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                                                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
                                                                            )}
                                                                        >
                                                                            {got ? <><CheckCheck size={12} /> Received</> : <><Check size={12} /> Confirm receipt</>}
                                                                        </button>
                                                                    )}
                                                                    {action && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggle(toRemove, item.id, setToRemove)}
                                                                            className={cn(
                                                                                "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-bold transition-colors",
                                                                                picked ? "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                                                                                    : "border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
                                                                            )}
                                                                        >
                                                                            {picked ? <><Undo2 size={12} /> Keep</>
                                                                                : action === "unhand" ? <><Undo2 size={12} /> Return</>
                                                                                : <><X size={12} /> Unassign</>}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* The signature sits with the ticks it depends on, rather than in a
                                                    card underneath restating the same count a third time. */}
                                                {isHandedGroup && handedRows.length > 0 && (
                                                    <div className="border-t border-violet-100 bg-violet-50/40 px-3 py-2.5">
                                                        <label className={cn(
                                                            "flex items-start gap-2.5",
                                                            allConfirmed ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                                                        )}>
                                                            <input
                                                                type="checkbox" checked={driverConfirmed} disabled={!allConfirmed}
                                                                onChange={(e) => setDriverConfirmed(e.target.checked)}
                                                                className="mt-0.5 h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-500/30"
                                                            />
                                                            <span className="min-w-0">
                                                                <span className="block text-[12px] font-semibold text-slate-800">
                                                                    {handDriver?.name ?? "The driver"} signed for {handedRows.length === 1 ? "this" : `all ${handedRows.length}`}
                                                                </span>
                                                                <span className="block text-[11px] leading-snug text-slate-500">
                                                                    {allConfirmed
                                                                        ? "Records the driver sign-off and moves the hand-over to verified."
                                                                        : `Available once all ${handedRows.length} are confirmed — the signature covers the whole list, not part of it.`}
                                                                </span>
                                                            </span>
                                                        </label>
                                                        {/* Two ways a receipt gets recorded, and the office should not be
                                                            re-keying the one the driver already did themselves. */}
                                                        <p className="mt-2 flex items-start gap-1.5 border-t border-violet-100 pt-2 text-[11px] leading-snug text-slate-500">
                                                            <Smartphone size={12} className="mt-0.5 shrink-0 text-violet-400" />
                                                            {handDriver?.name ?? "The driver"} ticks these off in the driver app when they collect
                                                            them, and that lands here. Confirm by hand only for kit handed across the desk.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {fixed.length > 0 && (
                                        <p className="flex items-start gap-1.5 pt-1 text-[11px] leading-snug text-slate-500">
                                            <Info size={12} className="mt-0.5 shrink-0" />
                                            Carried items belong to the vehicle they are on — change those from the asset,
                                            not from the person driving it this week.
                                        </p>
                                    )}
                                </div>
                            )}
                        </WizardSection>

                        {/* ── Give out ─────────────────────────────────────── */}
                        <WizardSection id="give" icon={Boxes} title="Give out" subtitle={SECTIONS[1].subtitle}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                    Unassigned <span className="ml-1 text-slate-400">({available.length} free)</span>
                                </h3>
                                <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                                    <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={addSearch}
                                        onChange={(e) => setAddSearch(e.target.value)}
                                        placeholder="Search unassigned items…"
                                        className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-[13px] text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>

                            {available.length === 0 ? (
                                <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-[12px] leading-snug text-amber-800">
                                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                    Every item in this carrier's inventory is already on a vehicle, a person, or a
                                    hand-over. Take one back first, or add a new item.
                                </p>
                            ) : addable.length === 0 ? (
                                <p className="mt-3 rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400">
                                    No free item matches “{addSearch.trim()}”.
                                </p>
                            ) : (
                                <div className="mt-3 max-h-96 space-y-1.5 overflow-y-auto pr-1">
                                    {/* What the two ticks mean, on the columns they label. It used to be two
                                        paragraphs of prose above the list, as far from the ticks as it could get. */}
                                    <div className="sticky top-0 z-[1] flex items-start justify-between gap-4 bg-white pb-1.5">
                                        <span className="pl-1">
                                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                                                <ClipboardList size={10} /> ← Assign
                                            </span>
                                            <span className="block text-[10px] text-slate-500">
                                                Filed against this {isDriver ? "driver" : "vehicle"} · nobody signs
                                            </span>
                                        </span>
                                        <span className="pr-1 text-right">
                                            <span className={cn("flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-wider",
                                                handDriver ? "text-violet-600" : "text-slate-300")}>
                                                Hand over → <PackageCheck size={10} />
                                            </span>
                                            <span className="block text-[10px] text-slate-500">
                                                {handDriver ? `${handDriver.name} signs for it` : "No driver on this vehicle"}
                                            </span>
                                        </span>
                                    </div>
                                    {addable.map((item) => {
                                        const assignPicked = toAssign.has(item.id);
                                        const handPicked = toHand.has(item.id);
                                        const handBlocked = handBlockedBecause(item);
                                        return (
                                            <div key={item.id} className={cn(
                                                "flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors",
                                                handPicked ? "border-violet-300 bg-violet-50/70"
                                                    : assignPicked ? "border-blue-300 bg-blue-50/70"
                                                    : "border-slate-200 bg-white",
                                            )}>
                                                <Tick
                                                    on={assignPicked} tone="blue"
                                                    label={`Assign ${itemName(item)} to this ${isDriver ? "driver" : "vehicle"}`}
                                                    onToggle={() => pickAssign(item.id)}
                                                />
                                                <Boxes size={14} className="ml-1 shrink-0 text-slate-400" />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-[13px] font-semibold text-slate-800">{itemName(item)}</span>
                                                    <span className="block truncate text-[11px] text-slate-500">
                                                        {vendorOf(item)}{item.serial && <span className="font-mono"> · {item.serial}</span>}
                                                    </span>
                                                </span>
                                                <span className="shrink-0 text-right text-[11px] text-slate-400">
                                                    {item.expiryDate ? fmtDate(item.expiryDate) : "no expiry"}
                                                </span>
                                                <Tick
                                                    on={handPicked} tone="violet" disabledReason={handBlocked}
                                                    label={`Hand ${itemName(item)} over to ${handDriver?.name ?? "the driver"}`}
                                                    onToggle={() => pickHand(item.id)}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Who is doing it. Taken from the signed-in user rather than typed. */}
                            {toHand.size > 0 && (
                                <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50/50 px-3 py-2.5">
                                    <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-violet-700">
                                        <PenLine size={11} /> Handed over by
                                    </span>
                                    {editingSigner ? (
                                        <input
                                            value={issuedBy} autoFocus
                                            onChange={(e) => setIssuedBy(e.target.value)}
                                            onBlur={() => { if (!issuedBy.trim()) setIssuedBy(me); setEditingSigner(false); }}
                                            placeholder="Who handed the items across"
                                            className="mt-1.5 h-8 w-full rounded-md border border-violet-200 bg-white px-2.5 text-[13px] text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                                        />
                                    ) : (
                                        <div className="mt-1.5 flex items-center gap-2">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                                                {initialsOf(issuedBy)}
                                            </span>
                                            <span className="min-w-0 truncate text-[13px] font-semibold text-slate-800">{issuedBy}</span>
                                            {issuedBy === me && <span className="shrink-0 text-[11px] text-slate-400">(you)</span>}
                                            <button
                                                type="button" onClick={() => setEditingSigner(true)}
                                                className="ml-auto shrink-0 rounded-md border border-violet-200 bg-white px-2 py-0.5 text-[11px] font-bold text-violet-700 transition-colors hover:bg-violet-50"
                                            >
                                                Someone else
                                            </button>
                                        </div>
                                    )}
                                    <span className="mt-1.5 block text-[11px] leading-snug text-slate-500">
                                        Recorded as the staff sign-off. {handDriver?.name ?? "The driver"} confirms receipt
                                        from their own hand-over, which is what moves it to verified.
                                    </span>
                                </div>
                            )}

                            {/* A vehicle can hold something that stays with it (a spare key) or something
                                its driver carries (a fuel card) — the difference the Carried column shows. */}
                            {!isDriver && toAssign.size > 0 && (
                                <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                                    <input
                                        type="checkbox" checked={carried}
                                        onChange={(e) => setCarried(e.target.checked)}
                                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                                    />
                                    <span className="min-w-0">
                                        <span className="block text-[13px] font-semibold text-slate-800">Carried by whoever drives this vehicle</span>
                                        <span className="block text-[11px] leading-snug text-slate-500">
                                            For things that live in the cab — a fuel card, a toll transponder. Leave off for
                                            kit that stays with the vehicle, like a spare key.
                                        </span>
                                    </span>
                                </label>
                            )}
                        </WizardSection>

                        {/* ── Notify ───────────────────────────────────────── */}
                        <WizardSection id="notify" icon={MessageSquare} title="Tell them" subtitle={SECTIONS[2].subtitle}>
                            {!handDriver ? (
                                <p className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-[12px] leading-snug text-slate-500">
                                    <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
                                    There is nobody to message — no driver is assigned to this vehicle. Assign one on
                                    the asset and the message can go to them.
                                </p>
                            ) : givingIds.length === 0 ? (
                                <p className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-[12px] leading-snug text-slate-500">
                                    <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
                                    Nothing is being given out yet. Pick something in <span className="font-semibold">Give out</span> and
                                    a message to collect it will be drafted here.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2.5">
                                        <input
                                            type="checkbox" checked={notify}
                                            onChange={(e) => setNotify(e.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                                        />
                                        <span className="min-w-0">
                                            <span className="block text-[13px] font-semibold text-slate-800">
                                                Message {handDriver.name} to collect from the office
                                            </span>
                                            {/* A driver cannot collect what nobody told them about, which is why
                                                this sends with the save rather than being a thing to remember. */}
                                            <span className="block text-[11px] leading-snug text-slate-500">
                                                Goes into their chat in Messages when you save. They can reply there.
                                            </span>
                                        </span>
                                    </label>

                                    {notify && (
                                        <>
                                            <textarea
                                                value={note}
                                                onChange={(e) => { setNote(e.target.value); setNoteTouched(true); }}
                                                rows={7}
                                                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-[13px] leading-relaxed text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                            />
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="text-[11px] text-slate-500">
                                                    {/* Edits are the sender's; the draft stops rewriting itself once
                                                        somebody has typed. */}
                                                    {noteTouched
                                                        ? "Your wording — it will not be rewritten if the list changes."
                                                        : "Drafted from what you picked. Type to make it yours."}
                                                </p>
                                                {noteTouched && (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setNoteTouched(false); setNote(suggested); }}
                                                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
                                                    >
                                                        Reset to draft
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => { setMessagesFocus(getOrCreateDriverConversation(handDriver.name)); onNavigate("/messages"); }}
                                                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:underline"
                                            >
                                                <Send size={11} /> Open {handDriver.name}'s chat
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </WizardSection>
                    </div>
                </div>
            </div>
        </div>
    );
}
