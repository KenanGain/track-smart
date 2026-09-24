// ─────────────────────────────────────────────────────────────────────────────
// One vehicle's, or one driver's, inventory — as a page.
//
// It was a row that expanded. Inside that row were three headed groups, a monitoring
// column, a chevron per item and a kebab, all inside the width of a table cell with a
// list of other holders still stacked above and below it. Everything you can ask about
// a truck's kit was answerable there and none of it was comfortable: you lost your place
// in the outer list, you could not link anybody to it, and the four questions —
//
//   what is on it · who carries it · what is about to run out · what happened
//
// — were one scroll rather than four tabs. An item already had a page of its own; the
// thing holding twelve of them did not.
//
// The Inventory tab is the SAME panel the asset and driver profiles show, so "what is on
// this truck" cannot read one way here and another there.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import {
    ArrowLeft, Boxes, ClipboardList, IdCard, Truck, CircleSlash, Share2, BellRing,
    History, UserRound, PackageCheck, AlertTriangle, BellOff, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SubTabs } from "@/components/ui/SubTabs";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { ShareToChat } from "@/components/share/ShareToChat";
import { type RecordRef } from "@/pages/messages/messages-store";
import { HolderInventoryPanel, useHolderInventory } from "./HolderInventoryPanel";
import {
    itemName, inventoryMonitoring, itemTravelsWithDriver, driverOfAsset,
    type InventoryItem,
} from "./inventory.data";
import { MONITOR_BASIS_LABEL, monitoredDateFor } from "@/pages/compliance/monitoring-schedule";
import { fmtDate, daysUntil } from "./inventory-assignment";
import { VIA_LABEL, VIA_TONE, type HeldItem, type HolderKind } from "./inventory-rollup";
import { inventoryTrailSortable } from "./inventory-activity";
import { useDriverHandovers } from "./handovers.data";
import { ActivityTimeline, type ActivityEntry } from "@/components/ui/ActivityTimeline";
import { setMessagesFocus } from "@/pages/messages/messages-store";
import { visualFor } from "./inventory-visuals";
import { itemCategoryId } from "./inventory.data";

type Tab = "inventory" | "driver" | "monitoring" | "activity";

type Props = {
    onNavigate: (path: string) => void;
    kind: HolderKind;
    holderId: string;
    accountId?: string;
    /** Name and sub-line off the list that linked here, so the header fills before the rollup does. */
    label?: string;
    sub?: string;
};

export function HolderDetailPage({ onNavigate, kind, holderId, accountId, label, sub }: Props) {
    const [tab, setTab] = useState<Tab>("inventory");
    const [shareOpen, setShareOpen] = useState(false);

    const isDriver = kind === "driver";
    const back = isDriver ? "/inventory/drivers" : "/inventory/assets";
    const { held, expiring, expired } = useHolderInventory(kind, holderId, accountId);

    // Who is on it. A vehicle's driver is read off the vehicle rather than stored, so it
    // follows a change of driver instead of naming whoever was on it last week.
    const driver = useMemo(
        () => (isDriver ? { id: holderId, name: label ?? "—" } : driverOfAsset(holderId, accountId)),
        [isDriver, holderId, accountId, label],
    );

    /**
     * What the person actually carries.
     *
     * Not everything on the truck: a reefer sensor is bolted to it, and listing it under a
     * driver's name would say they are responsible for something they cannot take off.
     */
    const carried = useMemo(
        () => held.filter((h) => itemTravelsWithDriver(h.item)),
        [held],
    );
    const stays = useMemo(
        () => held.filter((h) => !itemTravelsWithDriver(h.item)),
        [held],
    );

    /** Everything with a date to watch, soonest first — the reason anybody opens this page twice. */
    const watched = useMemo(() => {
        const rows = held.map((h) => {
            const mon = inventoryMonitoring(h.item);
            const due = (mon.enabled ? monitoredDateFor(mon, h.item) : "") || h.item.expiryDate || "";
            return { ...h, mon, due, days: daysUntil(due) };
        }).filter((r) => r.due);
        return rows.sort((a, b) => (a.days ?? 9e9) - (b.days ?? 9e9));
    }, [held]);

    const { records } = useDriverHandovers(accountId ?? "acct-001");

    /**
     * A HOLDER's trail is the trails of everything it holds, merged newest-first.
     *
     * Merged by the number the sort used, not by the formatted date each entry shows —
     * parsing that back would be reading our own output. Each line keeps the name of the
     * item it was about, which an item's own trail never has to say and a truck's always does.
     */
    const trail = useMemo<ActivityEntry[]>(() => {
        const scope = accountId ?? "acct-001";
        const rows: (ActivityEntry & { sortAt: number })[] = [];
        for (const h of held) {
            const handover = Object.values(records).find(
                (r) => r.accountId === scope && r.lines.some((l) => l.itemId === h.item.id),
            );
            for (const e of inventoryTrailSortable(h.item, accountId, handover, [])) {
                rows.push({ ...e, detail: [itemName(h.item), e.detail].filter(Boolean).join(" · ") });
            }
        }
        return rows.sort((a, b) => b.sortAt - a.sortAt).slice(0, 60)
            .map(({ sortAt: _s, ...rest }) => rest);
    }, [held, records, accountId]);

    const title = label ?? holderId;

    // A holder with nothing on it is still a holder; an id that matches nothing is not.
    if (!label && held.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50 text-center">
                <CircleSlash size={32} className="text-slate-300" />
                <div>
                    <p className="text-sm font-semibold text-slate-700">
                        That {isDriver ? "driver" : "asset"} is no longer here
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        They may have been removed, or belong to another carrier.
                    </p>
                </div>
                <button
                    onClick={() => onNavigate(back)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                >
                    Back to {isDriver ? "Drivers" : "Assets"}
                </button>
            </div>
        );
    }

    const shareRef: RecordRef = {
        type: "inventory", id: holderId, label: title,
        sublabel: [sub, `${held.length} item${held.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ") || undefined,
        path: back,
    };

    const TABS = [
        { id: "inventory" as const, label: "Inventory", icon: Boxes, count: held.length },
        { id: "driver" as const, label: isDriver ? "Carried" : "Driver", icon: UserRound, count: carried.length },
        { id: "monitoring" as const, label: "Monitoring", icon: BellRing, count: watched.length },
        { id: "activity" as const, label: "Activity", icon: History, count: trail.length },
    ];

    return (
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <header className="shrink-0 border-b border-slate-200 bg-white">
                <div className="px-6 pt-4">
                    <button
                        onClick={() => onNavigate(back)}
                        className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-blue-600"
                    >
                        <ArrowLeft size={14} /> Back to {isDriver ? "Drivers" : "Assets"}
                    </button>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                {isDriver ? <IdCard size={20} /> : <Truck size={20} />}
                            </span>
                            <div className="min-w-0">
                                <h1 className="truncate text-xl font-black text-slate-900">{title}</h1>
                                <p className="mt-0.5 truncate text-sm text-slate-500">
                                    {sub}
                                    {!isDriver && driver && <> · driven by <span className="font-semibold text-slate-700">{driver.name}</span></>}
                                    {expired > 0 && <> · <span className="font-semibold text-rose-600">{expired} expired</span></>}
                                    {expired === 0 && expiring > 0 && <> · <span className="font-semibold text-amber-600">{expiring} expiring</span></>}
                                </p>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            {/* The one thing you came to do, on a VEHICLE. Inventory is filed
                                against the vehicle and a driver holds the returnable half of
                                whatever they drive, so there is nothing on a driver to assign —
                                the button would open a form that writes to the truck behind them. */}
                            {!isDriver && (
                                <button
                                    onClick={() => onNavigate(`${back}/${holderId}/assign`)}
                                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                                >
                                    <ClipboardList size={15} /> Assignment
                                </button>
                            )}
                            <KebabMenu items={[
                                { label: "Share to chat", icon: Share2, onClick: () => setShareOpen(true) },
                            ]} />
                        </div>
                    </div>
                </div>
                <div className="px-6">
                    <SubTabs tabs={TABS} activeId={tab} onChange={setTab} ariaLabel={`${isDriver ? "Driver" : "Asset"} inventory sections`} />
                </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-5xl px-6 py-6">
                    {/* ── What is on it ───────────────────────────────── */}
                    {tab === "inventory" && (
                        <HolderInventoryPanel kind={kind} holderId={holderId} accountId={accountId} onNavigate={onNavigate} />
                    )}

                    {/* ── Who carries it ──────────────────────────────── */}
                    {tab === "driver" && (
                        <div className="space-y-5">
                            {!isDriver && (
                                <Card
                                    title={driver ? driver.name : "Nobody drives this yet"}
                                    subtitle={driver
                                        ? "Read off the vehicle, so it follows a change of driver."
                                        : "Assign a driver on the asset and anything that rides in the cab goes with them."}
                                    right={driver && (
                                        <button
                                            onClick={() => onNavigate(`/inventory/drivers/${driver.id}`)}
                                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                                        >
                                            Their page ↗
                                        </button>
                                    )}
                                >
                                    <ItemLines
                                        rows={carried}
                                        kind={kind}
                                        onNavigate={onNavigate}
                                        empty={<>Nothing on {title} travels with its driver. Everything here is
                                            fitted to the vehicle rather than carried.</>}
                                    />
                                </Card>
                            )}
                            {isDriver && (
                                <Card
                                    title="Driver returnable"
                                    subtitle="What this person carries, and has to hand back."
                                >
                                    <ItemLines rows={carried} kind={kind} onNavigate={onNavigate}
                                        empty={<>Nothing they hold travels with them.</>} />
                                </Card>
                            )}

                            {/* Said rather than omitted: the count above is a subset, not a total. */}
                            {stays.length > 0 && (
                                <Card
                                    title={isDriver ? "Stays with the vehicle" : "Stays on this vehicle"}
                                    subtitle="Fitted to the unit rather than carried, so nobody hands it back."
                                >
                                    <ItemLines rows={stays} kind={kind} onNavigate={onNavigate} muted />
                                </Card>
                            )}
                        </div>
                    )}

                    {/* ── What is about to run out ────────────────────── */}
                    {tab === "monitoring" && (
                        <Card
                            title="Dates being watched"
                            subtitle="Soonest first. An item with no date to watch is not listed."
                        >
                            {watched.length === 0 ? (
                                <p className="py-6 text-center text-sm text-slate-400">
                                    Nothing on {title} has a date to watch.
                                </p>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {watched.map((r) => {
                                        const late = (r.days ?? 1) < 0;
                                        const soon = !late && (r.days ?? 999) <= 30;
                                        return (
                                            <li key={r.item.id} className="flex items-center gap-3 py-2.5">
                                                <span className={cn("h-7 w-1 shrink-0 rounded-full", VIA_TONE[r.via].bar)} />
                                                <button
                                                    onClick={() => onNavigate(`/inventory/items/${r.item.id}`)}
                                                    className="min-w-0 flex-1 text-left"
                                                >
                                                    <span className="block truncate text-[13px] font-semibold text-slate-800 hover:text-blue-700">
                                                        {itemName(r.item)}
                                                    </span>
                                                    <span className="block truncate text-[11px] text-slate-500">
                                                        {r.mon.enabled
                                                            ? <><BellRing size={10} className="mr-1 inline text-emerald-500" />{MONITOR_BASIS_LABEL[r.mon.basis]}</>
                                                            : <><BellOff size={10} className="mr-1 inline text-slate-300" />No alert set</>}
                                                    </span>
                                                </button>
                                                <span className="shrink-0 text-right">
                                                    <span className="flex items-center justify-end gap-1.5 text-[12px] font-semibold text-slate-700">
                                                        <Calendar size={11} className="text-slate-400" /> {fmtDate(r.due)}
                                                    </span>
                                                    <span className={cn(
                                                        "block text-[11px] font-semibold",
                                                        late ? "text-rose-600" : soon ? "text-amber-600" : "text-slate-400",
                                                    )}>
                                                        {late ? `${Math.abs(r.days!)}d overdue` : `in ${r.days}d`}
                                                    </span>
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </Card>
                    )}

                    {/* ── What happened ───────────────────────────────── */}
                    {tab === "activity" && (
                        <Card title="Activity" subtitle="Everything that happened to what this holds, newest first.">
                            {trail.length === 0 ? (
                                <p className="py-6 text-center text-sm text-slate-400">Nothing has happened yet.</p>
                            ) : (
                                <ActivityTimeline entries={trail} />
                            )}
                        </Card>
                    )}
                </div>
            </div>

            {shareOpen && (
                <ShareToChat
                    open
                    onClose={() => setShareOpen(false)}
                    title={`Share ${title}`}
                    subtitle={`Send what ${isDriver ? "they are" : "this vehicle is"} holding in a chat, or to an outsider by email`}
                    source={{ type: "manual", id: holderId, label: title }}
                    items={[]}
                    record={shareRef}
                    defaultChannel="in-app"
                    defaultSubject={title}
                    onOpenInMessages={(id) => { setMessagesFocus(id); onNavigate("/messages"); }}
                />
            )}
        </div>
    );
}

// ── Furniture ───────────────────────────────────────────────────────────────

function Card({ title, subtitle, right, children }: {
    title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-900">{title}</h2>
                    {subtitle && <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p>}
                </div>
                {right}
            </div>
            <div className="px-4 py-2">{children}</div>
        </div>
    );
}

/** One item per line, with the route that put it there. */
function ItemLines({ rows, kind, onNavigate, empty, muted }: {
    rows: HeldItem[];
    kind: HolderKind;
    onNavigate: (path: string) => void;
    empty?: React.ReactNode;
    muted?: boolean;
}) {
    if (rows.length === 0) {
        return <p className="py-5 text-center text-[13px] leading-snug text-slate-400">{empty ?? "Nothing here."}</p>;
    }
    return (
        <ul className="divide-y divide-slate-100">
            {rows.map((h) => {
                const visual = visualFor(itemCategoryId(h.item));
                return (
                    <li key={h.item.id}>
                        <button
                            onClick={() => onNavigate(`/inventory/items/${h.item.id}`)}
                            className="flex w-full items-center gap-2.5 py-2.5 text-left"
                        >
                            <span className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                                muted ? "bg-slate-100 text-slate-400" : cn(visual.avatarBg, visual.avatarText),
                            )}>
                                <visual.icon size={14} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className={cn(
                                    "block truncate text-[13px] font-semibold",
                                    muted ? "text-slate-600" : "text-slate-800",
                                )}>
                                    {itemName(h.item)}
                                </span>
                                {h.item.serial && <span className="block truncate font-mono text-[11px] text-slate-500">{h.item.serial}</span>}
                            </span>
                            <span className={cn(
                                "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                VIA_TONE[h.via].chip,
                            )}>
                                {VIA_LABEL[kind][h.via]}
                            </span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

// Icons kept for the tabs' own vocabulary.
void PackageCheck; void AlertTriangle;
void ({} as InventoryItem);
