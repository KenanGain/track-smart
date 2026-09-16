// ─────────────────────────────────────────────────────────────────────────────
// One inventory item, opened from the list.
//
// Three tabs, because they answer three different questions and one page trying to
// answer all three at once is the wall of fields the list was built to avoid:
//
//   Information — what it is, and where it is right now.
//   Monitoring  — what it counts down to, and who gets told.
//   Activity    — how it got here: created, assigned, handed over, changed.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import {
    Boxes, Pencil, Share2, ArrowLeft, Truck, IdCard, PackageCheck, BellRing, BellOff,
    Info, History, Hash, Calendar, Store, Tag, StickyNote, Phone, CircleSlash,
    type LucideIcon,
} from "lucide-react";
import {
    INVENTORY_ITEMS, getInventoryForCarrier, VENDORS, VENDOR_CATEGORIES,
    itemName, inventoryMonitoring, type InventoryItem,
} from "./inventory.data";
import { MONITOR_BASIS_LABEL, monitoredDateFor, recurrenceLabel } from "@/pages/compliance/monitoring-schedule";
import { useDriverHandovers, handoverStatusOf } from "./handovers.data";
import { resolveAsset, resolveDriver, KIND_TONE, fmtDate, daysUntil } from "./inventory-assignment";
import { useInventoryActivity, inventoryTrail } from "./inventory-activity";
import { ActivityTimeline } from "@/components/ui/ActivityTimeline";
import { SubTabs } from "@/components/ui/SubTabs";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { ShareToChat } from "@/components/share/ShareToChat";
import { setMessagesFocus, type RecordRef } from "@/pages/messages/messages-store";
import { useInventoryAdditions } from "./inventory-store";
import { cn } from "@/lib/utils";

type Props = {
    onNavigate: (path: string) => void;
    itemId: string;
    accountId?: string;
};

type Tab = "information" | "monitoring" | "activity";

const STATUS_BADGE: Record<string, string> = {
    "Active": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Expiring Soon": "bg-amber-50 text-amber-700 border-amber-200",
    "Expired": "bg-red-50 text-red-700 border-red-200",
};
const STATUS_DOT: Record<string, string> = {
    "Active": "bg-emerald-500", "Expiring Soon": "bg-amber-500", "Expired": "bg-red-500",
};

/** One labelled fact. The label is small and grey so a column of them reads as values. */
function Fact({ icon: Icon, label, children, mono }: {
    icon?: LucideIcon; label: string; children: React.ReactNode; mono?: boolean;
}) {
    return (
        <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {Icon && <Icon size={11} />} {label}
            </div>
            <div className={cn("mt-1 text-sm font-medium text-slate-800", mono && "font-mono text-[13px]")}>
                {children}
            </div>
        </div>
    );
}

function Card({ title, subtitle, children, className }: {
    title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
    return (
        <section className={cn("overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
            <header className="border-b border-slate-100 px-5 py-3">
                <h2 className="text-sm font-bold text-slate-800">{title}</h2>
                {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
            </header>
            <div className="p-5">{children}</div>
        </section>
    );
}

const EMPTY = <span className="text-slate-300">—</span>;

export function InventoryItemDetailPage({ onNavigate, itemId, accountId }: Props) {
    const [tab, setTab] = useState<Tab>("information");
    const [shareOpen, setShareOpen] = useState(false);

    const { additions } = useInventoryAdditions(accountId);
    const item = useMemo<InventoryItem | undefined>(() => {
        const base = accountId ? getInventoryForCarrier(accountId) : INVENTORY_ITEMS;
        return [...additions, ...base, ...INVENTORY_ITEMS].find((i) => i.id === itemId);
    }, [itemId, accountId, additions]);

    const { records } = useDriverHandovers(accountId ?? "acct-001");
    const handover = useMemo(() => {
        const scope = accountId ?? "acct-001";
        return Object.values(records).find(
            (r) => r.accountId === scope && r.lines.some((l) => l.itemId === itemId),
        );
    }, [records, accountId, itemId]);

    const events = useInventoryActivity(itemId);

    // An id that matches nothing is a dead link, not a blank page.
    if (!item) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50 text-center">
                <CircleSlash size={32} className="text-slate-300" />
                <div>
                    <p className="text-sm font-semibold text-slate-700">That inventory item no longer exists</p>
                    <p className="mt-1 text-xs text-slate-500">It may have been removed, or it belongs to another carrier.</p>
                </div>
                <button
                    onClick={() => onNavigate("/inventory")}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                >
                    Back to Inventory
                </button>
            </div>
        );
    }

    const vendor = VENDORS.find((v) => v.id === item.vendorId);
    const category = VENDOR_CATEGORIES.find((c) => c.id === vendor?.categoryId);
    const mon = inventoryMonitoring(item);
    const onAsset = resolveAsset(item.assignedTo, accountId);
    const handedTo = handover
        ? { driverId: handover.driverId, status: handoverStatusOf(handover) }
        : undefined;
    const withDriver = resolveDriver(item.assignedTo, accountId, handedTo);
    const dueDate = (mon.enabled ? monitoredDateFor(mon, item) : "") || item.expiryDate || "";
    const days = daysUntil(dueDate);
    const trail = inventoryTrail(item, accountId, handover, events);

    const itemRef: RecordRef = {
        type: "inventory", id: item.id, label: itemName(item),
        sublabel: [vendor?.companyName || vendor?.name, item.serial].filter(Boolean).join(" · ") || undefined,
        path: "/inventory",
    };

    const TABS = [
        { id: "information" as const, label: "Information", icon: Info },
        { id: "monitoring" as const, label: "Monitoring", icon: BellRing },
        { id: "activity" as const, label: "Activity", icon: History, count: trail.length },
    ];

    return (
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            {/* Header */}
            <header className="shrink-0 border-b border-slate-200 bg-white">
                <div className="px-6 pt-4">
                    <button
                        onClick={() => onNavigate("/inventory")}
                        className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-blue-600"
                    >
                        <ArrowLeft size={14} /> Back to Inventory
                    </button>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <Boxes size={20} />
                            </span>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="truncate text-xl font-black text-slate-900">{itemName(item)}</h1>
                                    <span className={cn(
                                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                        STATUS_BADGE[item.status],
                                    )}>
                                        <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", STATUS_DOT[item.status])} />
                                        {item.status}
                                    </span>
                                </div>
                                <p className="mt-0.5 truncate text-sm text-slate-500">
                                    <span className="font-semibold text-slate-700">{vendor?.companyName || vendor?.name || "—"}</span>
                                    {category && <> · {category.name}</>}
                                    {item.serial && <> · <span className="font-mono text-[13px]">{item.serial}</span></>}
                                </p>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <button
                                onClick={() => onNavigate(`/inventory/items/${item.id}/edit`)}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                            >
                                <Pencil size={15} /> Edit
                            </button>
                            <KebabMenu items={[
                                { label: "Share to chat", icon: Share2, onClick: () => setShareOpen(true) },
                            ]} />
                        </div>
                    </div>
                </div>
                <div className="px-6">
                    <SubTabs tabs={TABS} activeId={tab} onChange={setTab} ariaLabel="Inventory item sections" />
                </div>
            </header>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-5xl px-6 py-6">
                    {tab === "information" && (
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                            <Card title="Item" subtitle="What it is, and what is printed on it.">
                                <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                                    <Fact icon={Store} label="Vendor">{vendor?.companyName || vendor?.name || EMPTY}</Fact>
                                    <Fact icon={Tag} label="Category">{category?.name ?? EMPTY}</Fact>
                                    <Fact icon={Hash} label="Number" mono>{item.serial || EMPTY}</Fact>
                                    <Fact icon={Hash} label="PIN" mono>{item.pin || EMPTY}</Fact>
                                    <Fact icon={Calendar} label="Issue date">{fmtDate(item.issueDate)}</Fact>
                                    <Fact icon={Calendar} label="Expiry date">
                                        {/* An item with no expiry is not missing one — a yard key never runs out. */}
                                        {item.expiryDate ? fmtDate(item.expiryDate) : <span className="text-slate-400">Never expires</span>}
                                    </Fact>
                                </div>
                                {item.notes && (
                                    <div className="mt-5 border-t border-slate-100 pt-4">
                                        <Fact icon={StickyNote} label="Notes">
                                            <span className="font-normal text-slate-600">{item.notes}</span>
                                        </Fact>
                                    </div>
                                )}
                            </Card>

                            <Card title="Assignment" subtitle="Where it is, and whose hands it is in.">
                                <div className="space-y-5">
                                    <div>
                                        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                            <Truck size={11} /> Asset
                                        </div>
                                        {onAsset ? (
                                            <div className="mt-2 flex items-center gap-2.5">
                                                <span className={cn("inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", KIND_TONE[onAsset.tone])}>
                                                    <Truck size={10} /> {onAsset.kindLabel}
                                                </span>
                                                <div className="min-w-0 leading-tight">
                                                    <div className="truncate text-sm font-bold text-slate-900">{onAsset.label}</div>
                                                    <div className="truncate text-[11px] text-slate-500">{onAsset.sub}</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="mt-1.5 text-sm text-slate-400">Not on a vehicle.</p>
                                        )}
                                    </div>

                                    <div className="border-t border-slate-100 pt-4">
                                        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                            <IdCard size={11} /> Driver
                                        </div>
                                        {withDriver ? (
                                            <div className="mt-2 flex items-center gap-2.5">
                                                <span className={cn(
                                                    "inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                                    withDriver.via === "handed" ? KIND_TONE.violet : KIND_TONE.emerald,
                                                )}>
                                                    {withDriver.via === "handed" ? <PackageCheck size={10} /> : <IdCard size={10} />}
                                                    {withDriver.via === "handed" ? "Handed" : "Driver"}
                                                </span>
                                                <div className="min-w-0 leading-tight">
                                                    <div className="truncate text-sm font-bold text-slate-900">{withDriver.label}</div>
                                                    <div className="truncate text-[11px] text-slate-500">{withDriver.sub}</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="mt-1.5 text-sm text-slate-400">Nobody is holding this.</p>
                                        )}
                                    </div>

                                    {(item.contactName || item.contactInfo) && (
                                        <div className="border-t border-slate-100 pt-4">
                                            <Fact icon={Phone} label="Vendor contact">
                                                {item.contactName || "—"}
                                                {item.contactInfo && <span className="ml-1 font-normal text-slate-500">· {item.contactInfo}</span>}
                                            </Fact>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    )}

                    {tab === "monitoring" && (
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                            <Card title="Alert" subtitle="What this counts down to, and when it says so.">
                                {mon.enabled ? (
                                    <div className="space-y-5">
                                        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
                                            <BellRing size={15} className="text-emerald-600" />
                                            <span className="text-sm font-semibold text-emerald-800">Monitoring is on</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                                            <Fact label="Counting from">{MONITOR_BASIS_LABEL[mon.basis]}</Fact>
                                            <Fact label="Renews">{recurrenceLabel(mon.recurrence)}</Fact>
                                            <Fact label="Reminders">
                                                {mon.reminders.length
                                                    ? [...mon.reminders].sort((a, b) => b - a)
                                                        .map((d) => (d === 0 ? "on the day" : `${d} days before`)).join(", ")
                                                    : EMPTY}
                                            </Fact>
                                            <Fact label="Sent by">
                                                {[mon.channels.inApp && "In-app", mon.channels.email && "Email"]
                                                    .filter(Boolean).join(" · ") || "Nowhere"}
                                            </Fact>
                                        </div>
                                        {mon.assignee && (
                                            <div className="border-t border-slate-100 pt-4">
                                                <Fact label="Assigned to">{mon.assignee.name}</Fact>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    // An expiry date nobody is alerted about is worth saying out loud,
                                    // rather than showing an empty card that reads as "nothing to see".
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                            <BellOff size={15} className="text-slate-400" />
                                            <span className="text-sm font-semibold text-slate-600">No alert is set</span>
                                        </div>
                                        <p className="text-sm text-slate-500">
                                            {item.expiryDate
                                                ? `This runs out on ${fmtDate(item.expiryDate)} and nobody will be told.`
                                                : "There is no expiry date on this item, so there is nothing to count down to."}
                                        </p>
                                        <button
                                            onClick={() => onNavigate(`/inventory/items/${item.id}/edit`)}
                                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                                        >
                                            <Pencil size={14} /> Set one up
                                        </button>
                                    </div>
                                )}
                            </Card>

                            <Card title="Next date" subtitle="The date the alert counts back from.">
                                {dueDate ? (
                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-3xl font-black tabular-nums text-slate-900">{fmtDate(dueDate)}</div>
                                            <p className={cn(
                                                "mt-1 text-sm font-semibold",
                                                days === null ? "text-slate-500"
                                                    : days < 0 ? "text-red-600"
                                                    : days <= 30 ? "text-amber-600" : "text-emerald-600",
                                            )}>
                                                {days === null ? "—"
                                                    : days === 0 ? "Due today"
                                                    : days < 0 ? `${Math.abs(days)} days overdue`
                                                    : `${days} days from now`}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-5 gap-y-4 border-t border-slate-100 pt-4">
                                            <Fact label="Issued">{fmtDate(item.issueDate)}</Fact>
                                            <Fact label="Expires">
                                                {item.expiryDate ? fmtDate(item.expiryDate) : <span className="text-slate-400">Never</span>}
                                            </Fact>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500">
                                        This item has no expiry and no custom date, so there is nothing to come due.
                                    </p>
                                )}
                            </Card>
                        </div>
                    )}

                    {tab === "activity" && (
                        <ActivityTimeline
                            entries={trail}
                            heading="Activity"
                            emptyText="Nothing has been recorded against this item yet."
                        />
                    )}
                </div>
            </div>

            {shareOpen && (
                <ShareToChat
                    open
                    onClose={() => setShareOpen(false)}
                    title={`Share ${itemName(item)}`}
                    subtitle="Send the item in a chat, or to an outsider by email"
                    source={{ type: "manual", id: item.id, label: itemName(item) }}
                    items={[]}
                    record={itemRef}
                    defaultChannel="in-app"
                    defaultSubject={itemName(item)}
                    onOpenInMessages={(id) => { setMessagesFocus(id); onNavigate("/messages"); }}
                />
            )}
        </div>
    );
}
