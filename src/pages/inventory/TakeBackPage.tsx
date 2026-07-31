import { useMemo, useState } from "react";
import {
    ChevronLeft, ChevronDown, Check, Undo2, UserCheck, IdCard, Save,
    CircleCheck, Package, ListChecks, RotateCcw,
} from "lucide-react";
import {
    getInventoryForCarrier, INVENTORY_ITEMS, VENDORS, type InventoryItem,
} from "./inventory.data";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-drivers.data";
import {
    useDriverHandovers, buildDriverGroups, removeLines, type DriverHandover,
} from "./handovers.data";
import { APP_USERS, getManagedAccountIds } from "@/data/users.data";
import { ReviewSignOff, newSignOff, type SignOffData } from "../hiring-process/FormKit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
    onNavigate: (path: string) => void;
    accountId?: string;
    accountName?: string;
    driverId: string;
};

const driverName = (d: any) => (d?.name ?? `${d?.firstName ?? ""} ${d?.lastName ?? ""}`.trim()) || "Driver";
const driverInitials = (d: any) => driverName(d).split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
const AVATAR_TONES = [
    "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-violet-100 text-violet-700",
    "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700", "bg-teal-100 text-teal-700",
];
const avatarTone = (id: string) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return AVATAR_TONES[h % AVATAR_TONES.length];
};

// Take-back module — the mirror of the hand-over checklist. Select the items a
// driver must return, assign a staff member to verify the return, then confirm
// each item was handed back & sign. Confirmed items are taken back (removed from
// the driver and freed to the company pool).
export function TakeBackPage({ onNavigate, accountId, driverId }: Props) {
    const acct = accountId ?? "acct-001";
    const { get, save } = useDriverHandovers(acct);

    const drivers = useMemo(() => CARRIER_DRIVERS[acct] || CARRIER_DRIVERS["acct-001"] || [], [acct]);
    const driver = drivers.find((d: any) => d.id === driverId);
    const itemById = useMemo(() => {
        const all = accountId ? getInventoryForCarrier(accountId) : INVENTORY_ITEMS;
        const m = new Map<string, InventoryItem>();
        for (const it of all) m.set(it.id, it);
        return m;
    }, [accountId]);

    const rec = get(driverId);
    const groups = useMemo(() => (rec ? buildDriverGroups(rec, itemById) : []), [rec, itemById]);
    const heldLines = useMemo(() => groups.flatMap((g) => g.lines), [groups]);

    // Staff who can be assigned to verify the return.
    const staff = useMemo(() => {
        const scoped = APP_USERS.filter((u) => u.role !== "super-admin" && (u.accountId === acct || (getManagedAccountIds(u) ?? []).includes(acct)));
        return scoped.length > 0 ? scoped : APP_USERS.filter((u) => u.role !== "super-admin");
    }, [acct]);

    // Working state, seeded from the saved record.
    const [selected, setSelected] = useState<Record<string, boolean>>(
        () => Object.fromEntries((rec?.takeBackRequestedItemIds ?? []).map((id) => [id, true])),
    );
    const [assignee, setAssignee] = useState<{ id: string; name: string }>(
        () => ({ id: rec?.takeBackAssigneeId ?? "", name: rec?.takeBackAssigneeName ?? "" }),
    );
    const [returned, setReturned] = useState<Record<string, boolean>>(
        () => Object.fromEntries((rec?.takeBackReturnedItemIds ?? []).map((id) => [id, true])),
    );
    const [signoff, setSignoff] = useState<SignOffData>(() => rec?.takeBackSignoff ?? { ...newSignOff(), role: "Fleet Manager" });

    const selectedIds = heldLines.filter((l) => selected[l.item.id]).map((l) => l.item.id);
    const requestedIds = rec?.takeBackRequestedItemIds ?? [];
    const requested = requestedIds.length > 0;
    // The items actually in the return workflow: those saved as requested.
    const requestedLines = heldLines.filter((l) => requestedIds.includes(l.item.id));
    const returnedCount = requestedLines.filter((l) => returned[l.item.id]).length;
    const canRequest = selectedIds.length > 0 && !!assignee.id;

    const persist = (patch: Partial<DriverHandover>) => {
        const cur = get(driverId);
        if (!cur) return;
        save({ ...cur, ...patch, updatedAt: Date.now() });
    };

    // Step 2 — record the requested items + assignee (opens verification).
    const requestReturn = () => {
        if (!canRequest) return;
        persist({
            takeBackRequestedItemIds: selectedIds,
            takeBackAssigneeId: assignee.id,
            takeBackAssigneeName: assignee.name,
        });
    };
    const reopenRequest = () => persist({ takeBackRequestedItemIds: [], takeBackSignoff: undefined });

    // Save a draft without finalising.
    const saveDraft = () => {
        persist({
            takeBackRequestedItemIds: requested ? requestedIds : selectedIds,
            takeBackAssigneeId: assignee.id,
            takeBackAssigneeName: assignee.name,
            takeBackReturnedItemIds: requestedLines.filter((l) => returned[l.item.id]).map((l) => l.item.id),
            takeBackSignoff: signoff,
        });
        onNavigate("/inventory");
    };

    // Step 3 — finalise: remove the confirmed-returned items from the driver.
    const completeReturn = () => {
        const cur = get(driverId);
        if (!cur) return;
        const returnedIds = requestedLines.filter((l) => returned[l.item.id]).map((l) => l.item.id);
        if (returnedIds.length === 0) return;
        let next: DriverHandover = { ...cur, takeBackSignoff: signoff, takeBackAssigneeId: assignee.id, takeBackAssigneeName: assignee.name };
        next = removeLines(next, returnedIds);
        next = { ...next, takeBackReturnedItemIds: [] };
        save(next);
        onNavigate("/inventory");
    };

    if (!driver || !rec || rec.lines.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
                <button onClick={() => onNavigate("/inventory")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-6">
                    <ChevronLeft className="h-4 w-4" /> Back to Inventory
                </button>
                <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                    <Package size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-600">Nothing to take back</p>
                    <p className="text-xs text-slate-500 mt-1">{driver ? `${driverName(driver)} isn't holding any inventory.` : "Driver not found."}</p>
                </div>
            </div>
        );
    }

    const allReturned = requestedLines.length > 0 && returnedCount === requestedLines.length;
    const statusChip = !requested
        ? { label: "Not requested", cls: "bg-slate-100 text-slate-500", dot: "bg-slate-400" }
        : allReturned && signoff.done
            ? { label: "Return verified", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500" }
            : { label: `Return requested · ${returnedCount}/${requestedLines.length}`, cls: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top bar */}
            <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={() => onNavigate("/inventory")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
                    <ChevronLeft className="h-4 w-4" /> Inventory
                </button>
                <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", statusChip.cls)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", statusChip.dot)} /> {statusChip.label}
                    </span>
                    <Button size="sm" onClick={saveDraft}><Save className="h-4 w-4" /> Save</Button>
                </div>
            </div>

            <div className="mx-auto max-w-4xl space-y-6 px-6 py-6">
                {/* Driver header */}
                <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className={cn("h-12 w-12 rounded-full flex items-center justify-center text-base font-bold shrink-0 ring-1 ring-black/5", avatarTone(driver.id))}>
                        {driverInitials(driver)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-rose-600">Inventory Take-Back</p>
                        <h1 className="text-2xl font-bold text-slate-900 truncate">{driverName(driver)}</h1>
                        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                            <UserCheck size={13} className="text-slate-400" />
                            {assignee.name ? <>Return verified by <span className="font-semibold text-slate-700">{assignee.name}</span></> : "Return not yet assigned"}
                        </p>
                    </div>
                    {(driver as any).licenseNumber && (
                        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 text-xs font-semibold self-start">
                            <IdCard size={13} /> License {(driver as any).licenseNumber}
                        </span>
                    )}
                </div>

                {/* Section 1 — items to take back */}
                <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><ListChecks className="h-5 w-5" /></span>
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Items to take back</h2>
                                <p className="text-xs text-slate-500">Tick the items {driverName(driver)} needs to return.</p>
                            </div>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">{selectedIds.length} selected</span>
                    </div>

                    <div className="space-y-3">
                        {groups.map((g) => (
                            <div key={g.id}>
                                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">{g.name}</p>
                                <div className="space-y-1.5">
                                    {g.lines.map(({ item, qty }) => {
                                        const vendor = VENDORS.find((v) => v.id === item.vendorId);
                                        const on = !!selected[item.id];
                                        return (
                                            <div key={item.id} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2 transition", on ? "border-rose-300 bg-rose-50/40" : "border-slate-200 bg-white hover:border-slate-300")}>
                                                <button type="button" disabled={requested} onClick={() => setSelected((s) => ({ ...s, [item.id]: !s[item.id] }))}
                                                    className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition disabled:opacity-50", on ? "border-rose-500 bg-rose-500 text-white" : "border-slate-300 hover:border-rose-400")}>
                                                    {on && <Check size={13} />}
                                                </button>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-semibold text-slate-900 truncate">{vendor?.name ?? "—"}</div>
                                                    <div className="text-[11px] text-slate-500 font-mono truncate">{item.serial}{item.pin ? ` · PIN ${item.pin}` : ""}</div>
                                                </div>
                                                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Qty {qty}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Assign someone to verify the return */}
                    <div className="border-t border-slate-100 pt-4">
                        <h3 className="text-sm font-bold text-slate-900">Assign someone to verify the return</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Who checks the driver actually handed these items back.</p>
                    </div>
                    <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600"><UserCheck className="h-4 w-4" /></span>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800">Assign return verification to</p>
                                <p className="text-xs text-slate-500">This staff member confirms the items were returned.</p>
                            </div>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <select
                                value={assignee.id}
                                onChange={(e) => { const u = staff.find((s) => s.id === e.target.value); setAssignee({ id: e.target.value, name: u?.name ?? "" }); }}
                                className="w-full h-10 pl-3 pr-8 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 appearance-none"
                            >
                                <option value="">Unassigned</option>
                                {staff.map((u) => <option key={u.id} value={u.id}>{u.name}{u.title ? ` · ${u.title}` : ""}</option>)}
                            </select>
                            <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {requested ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
                            <p className="inline-flex items-center gap-2 text-sm text-amber-800">
                                <Undo2 className="h-4 w-4 shrink-0" /> Take-back requested · {requestedLines.length} item{requestedLines.length === 1 ? "" : "s"}{assignee.name ? <> · {assignee.name} to verify</> : ""}
                            </p>
                            <button type="button" onClick={reopenRequest} className="text-xs font-semibold text-slate-500 underline hover:text-slate-700">Re-open</button>
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                            <p className="text-sm text-slate-600">{canRequest ? "Request the take-back to notify the driver and unlock verification." : "Select at least one item and choose who verifies the return."}</p>
                            <Button size="sm" disabled={!canRequest} onClick={requestReturn}><Undo2 className="h-4 w-4" /> Request take-back</Button>
                        </div>
                    )}
                </section>

                {/* Section 2 — return verification */}
                <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><RotateCcw className="h-5 w-5" /></span>
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Return verification</h2>
                                <p className="text-xs text-slate-500">Confirm each item was handed back, then sign to complete the take-back.</p>
                            </div>
                        </div>
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", signoff.done ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500")}>
                            {signoff.done ? <CircleCheck size={13} /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />}
                            {signoff.done ? `Verified · ${returnedCount}/${requestedLines.length}` : "Awaiting verification"}
                        </span>
                    </div>

                    {!requested ? (
                        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 p-8 text-center">
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><RotateCcw className="h-5 w-5" /></span>
                            <div>
                                <p className="text-sm font-medium text-slate-600">Request the take-back first</p>
                                <p className="text-xs text-slate-500 mt-1">Once items are requested, confirm each one was returned here.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-900">Items to confirm returned</span>
                                <button type="button" onClick={() => {
                                    const allOn = returnedCount === requestedLines.length;
                                    setReturned(allOn ? {} : Object.fromEntries(requestedLines.map((l) => [l.item.id, true])));
                                }} className="text-xs font-semibold text-blue-600 hover:underline">
                                    {returnedCount === requestedLines.length ? "Clear all" : "Confirm all"}
                                </button>
                            </div>
                            <div className="space-y-2">
                                {requestedLines.map(({ item, qty }) => {
                                    const vendor = VENDORS.find((v) => v.id === item.vendorId);
                                    const on = !!returned[item.id];
                                    return (
                                        <button key={item.id} type="button" disabled={signoff.done} onClick={() => setReturned((v) => ({ ...v, [item.id]: !v[item.id] }))}
                                            className={cn("flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left transition", on ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white hover:border-slate-300", signoff.done && "cursor-default")}>
                                            <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition", on ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300")}>
                                                {on && <Check size={13} />}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-semibold text-slate-900 truncate">{vendor?.name ?? "—"}</div>
                                                <div className="text-[11px] text-slate-500 font-mono truncate">{item.serial}{item.pin ? ` · PIN ${item.pin}` : ""}</div>
                                            </div>
                                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Qty {qty}</span>
                                            {on && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0"><CircleCheck size={11} /> Returned</span>}
                                        </button>
                                    );
                                })}
                            </div>
                            <ReviewSignOff
                                heading="I confirm the items above were returned by the driver."
                                value={signoff}
                                onChange={setSignoff}
                                kicker="Return Verification"
                                subtext="By signing you confirm the driver handed back the items listed above. Your name, date and signature are recorded on file."
                                nameLabel="Verified by"
                                buttonLabel="Confirm returns & sign"
                                signedLabel="Verified & signed"
                                signedByLabel="Verified by"
                            />
                        </>
                    )}
                </section>
            </div>

            {/* Sticky action bar */}
            <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur px-6 py-3 lg:px-8">
                <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
                    <p className="text-sm text-slate-600">
                        <span className="font-semibold text-slate-900">{requested ? requestedLines.length : selectedIds.length}</span> to return · <span className="font-semibold text-slate-900">{returnedCount}</span> confirmed for <span className="font-semibold text-slate-900">{driverName(driver)}</span>
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={saveDraft}><Save className="h-4 w-4" /> Save</Button>
                        <Button size="sm" disabled={!requested || returnedCount === 0} onClick={completeReturn}>
                            <Undo2 className="h-4 w-4" /> Complete take-back{returnedCount > 0 ? ` (${returnedCount})` : ""}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
