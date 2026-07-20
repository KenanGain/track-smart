import { useEffect, useMemo, useState } from "react";
import {
    Building2, Search, Truck, CircleCheck, UserRound, Layers,
    KeyRound, ShieldCheck, Package, Cpu, CreditCard, PackageCheck, ChevronRight, ArrowLeft,
    Plus, X, Check, Pencil, Undo2,
} from "lucide-react";
import {
    getInventoryForCarrier, INVENTORY_ITEMS, VENDORS,
    CARRIER_NAME, ACME_ASSETS, type InventoryItem,
} from "./inventory.data";
import { CARRIER_ASSETS } from "@/pages/accounts/carrier-assets.data";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-drivers.data";
import {
    useDriverHandovers, handoverStatusOf, type HandoverStatus,
    buildDriverGroups, buildAddGroups, appendLines, removeLines,
} from "./handovers.data";
import { TablePager } from "./TablePager";
import { InventoryTabs } from "./InventoryTabs";
import { KpiTile } from "./InventoryKpi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = { onNavigate: (path: string) => void; accountId?: string; accountName?: string; initialDriverId?: string };

const CAT_VISUAL: Record<string, { icon: React.ElementType; bg: string; text: string; bar: string }> = {
    "cat-keys":       { icon: KeyRound,    bg: "bg-amber-50",  text: "text-amber-700",  bar: "bg-amber-500" },
    "cat-safety-ppe": { icon: ShieldCheck, bg: "bg-rose-50",   text: "text-rose-700",   bar: "bg-rose-500" },
    "cat-equipment":  { icon: Package,     bg: "bg-teal-50",   text: "text-teal-700",   bar: "bg-teal-500" },
    "cat-devices":    { icon: Cpu,         bg: "bg-sky-50",    text: "text-sky-700",    bar: "bg-sky-500" },
    "cat-cards-docs": { icon: CreditCard,  bg: "bg-violet-50", text: "text-violet-700", bar: "bg-violet-500" },
};
const DEFAULT_VISUAL = { icon: Layers, bg: "bg-slate-100", text: "text-slate-700", bar: "bg-slate-400" };

const AVATAR_TONES = [
    "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-violet-100 text-violet-700",
    "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700", "bg-teal-100 text-teal-700",
    "bg-indigo-100 text-indigo-700", "bg-cyan-100 text-cyan-700",
];
const avatarTone = (id: string) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return AVATAR_TONES[h % AVATAR_TONES.length];
};

const driverName = (d: any) => (d?.name ?? `${d?.firstName ?? ""} ${d?.lastName ?? ""}`.trim()) || "Driver";
const driverInitials = (d: any) => driverName(d).split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

function assetLabel(item: InventoryItem, accountId?: string): string {
    if (item.assignedTo?.kind === "cmv" || item.assignedTo?.kind === "non-cmv") {
        const assets = (accountId && CARRIER_ASSETS[accountId]) || ACME_ASSETS;
        const asset = assets.find((a: any) => a.id === item.assignedTo!.targetId) ?? ACME_ASSETS.find((a) => a.id === item.assignedTo!.targetId);
        if (asset) return `${asset.unitNumber} · ${asset.year} ${asset.make} ${asset.model}`;
    }
    return "";
}

const STATUS_CHIP: Record<HandoverStatus, { label: string; cls: string; dot: string; icon?: React.ElementType }> = {
    "not-issued": { label: "Draft", cls: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
    "handed-over": { label: "Handed over · awaiting driver", cls: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" },
    "verified": { label: "Verified by driver", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500", icon: CircleCheck },
};

export function DriverInventoryPage({ onNavigate, accountId, accountName, initialDriverId }: Props) {
    // Deep-link: /inventory/driver-inventory/<driverId> shows a dedicated page
    // for that one driver. Rendered as a separate component (with its own hooks)
    // so this must be decided before any hook runs in the list view below.
    if (initialDriverId) {
        return (
            <DriverInventoryDetailPage
                onNavigate={onNavigate}
                accountId={accountId}
                accountName={accountName}
                driverId={initialDriverId}
            />
        );
    }
    return (
        <DriverInventoryListPage onNavigate={onNavigate} accountId={accountId} accountName={accountName} />
    );
}

function DriverInventoryListPage({ onNavigate, accountId, accountName }: Props) {
    const acct = accountId ?? "acct-001";
    const { records, get, save } = useDriverHandovers(acct);
    const [search, setSearch] = useState("");
    const [addForDriverId, setAddForDriverId] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(8);

    useEffect(() => { setSearch(""); setAddForDriverId(null); setPage(0); }, [acct]);
    useEffect(() => { setPage(0); }, [search]);

    const drivers = useMemo(() => CARRIER_DRIVERS[acct] || CARRIER_DRIVERS["acct-001"] || [], [acct]);
    const itemById = useMemo(() => {
        const all = accountId ? getInventoryForCarrier(accountId) : INVENTORY_ITEMS;
        const m = new Map<string, InventoryItem>();
        for (const it of all) m.set(it.id, it);
        return m;
    }, [accountId]);

    // Build one entry per driver that currently holds inventory.
    const rows = useMemo(() => {
        const out: {
            driver: any; status: HandoverStatus; assigneeName?: string;
            groups: { id: string; name: string; lines: { item: InventoryItem; qty: string; verified: boolean }[] }[];
            total: number; verifiedCount: number;
        }[] = [];
        for (const d of drivers) {
            const rec = records[`${acct}::${d.id}`];
            if (!rec || rec.lines.length === 0) continue;
            out.push({
                driver: d, status: handoverStatusOf(rec), assigneeName: rec.assigneeName,
                groups: buildDriverGroups(rec, itemById), total: rec.lines.length, verifiedCount: rec.verifiedItemIds?.length ?? 0,
            });
        }
        return out;
    }, [drivers, records, acct, itemById]);

    // Inventory available to ADD to the driver being edited — company items not
    // already on this driver's list nor on any other driver's list.
    const addGroups = useMemo(() =>
        addForDriverId ? buildAddGroups(records, acct, accountId, addForDriverId) : [],
    [addForDriverId, records, acct, accountId]);

    const addItemsToDriver = (driverId: string, newLines: { itemId: string; qty: string }[]) => {
        const rec = get(driverId);
        if (!rec || newLines.length === 0) { setAddForDriverId(null); return; }
        save(appendLines(rec, newLines));
        setAddForDriverId(null);
    };

    const q = search.trim().toLowerCase();
    const shown = q ? rows.filter((r) => driverName(r.driver).toLowerCase().includes(q) || ((r.driver as any).licenseNumber ?? "").toLowerCase().includes(q)) : rows;
    const addDriver = drivers.find((d) => d.id === addForDriverId);

    const totalItems = rows.reduce((n, r) => n + r.total, 0);
    const verifiedDrivers = rows.filter((r) => r.status === "verified").length;

    return (
        <div className="bg-slate-50 min-h-screen">
            {/* Header band (white) */}
            <div className="bg-white border-b border-slate-200 px-6 lg:px-8 py-5">
                <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Building2 size={14} />
                    <span className="font-medium">{accountName ?? CARRIER_NAME}</span>
                    <span>/</span>
                    <button onClick={() => onNavigate("/inventory")} className="hover:text-slate-700">Inventory</button>
                    <span>/</span>
                    <span>Driver Inventory</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Driver Inventory</h1>
                <p className="text-sm text-slate-500 mt-0.5">Which company inventory each driver is currently holding, and whether they've verified receipt.</p>
                </div>

                {/* Section tabs */}
                <InventoryTabs current="list" onNavigate={onNavigate} className="mt-4 -mb-5" />
            </div>

            {/* Body */}
            <div className="px-6 lg:px-8 py-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <KpiTile label="Drivers" value={rows.length} Icon={UserRound} accent="blue" />
                <KpiTile label="Items held" value={totalItems} Icon={Package} accent="violet" />
                <KpiTile label="Verified" value={verifiedDrivers} Icon={CircleCheck} accent="emerald" />
            </div>

            {/* Search */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 mb-5 flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drivers by name or license…"
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <button onClick={() => onNavigate("/inventory/handover")} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 h-9 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-600">
                    <PackageCheck size={14} /> Hand-over
                </button>
            </div>

            {shown.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center">
                    <UserRound size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-600">No drivers holding inventory yet</p>
                    <p className="text-xs text-slate-500 mt-1">Hand over keys, devices or equipment to a driver and it'll show here.</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Driver</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Items</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Verified</th>
                                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {shown.slice(page * perPage, page * perPage + perPage).map((r) => {
                                    const chip = STATUS_CHIP[r.status];
                                    const ChipIcon = chip.icon;
                                    const lic = (r.driver as any).licenseNumber as string | undefined;
                                    const open = () => onNavigate(`/inventory/driver-inventory/${r.driver.id}`);
                                    return (
                                        <tr key={r.driver.id} onClick={open} className="cursor-pointer transition-colors even:bg-slate-50/40 hover:bg-blue-50/40">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ring-1 ring-black/5", avatarTone(r.driver.id))}>
                                                        {driverInitials(r.driver)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold text-slate-900 truncate">{driverName(r.driver)}</div>
                                                        <div className="text-[11px] text-slate-500 truncate">
                                                            {lic ? `License ${lic}` : ""}{lic && r.assigneeName ? " · " : ""}{r.assigneeName ? `by ${r.assigneeName}` : ""}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", chip.cls)}>
                                                    {ChipIcon ? <ChipIcon size={13} /> : <span className={cn("h-1.5 w-1.5 rounded-full", chip.dot)} />}
                                                    {chip.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{r.total} item{r.total === 1 ? "" : "s"}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={cn("text-sm font-semibold", r.verifiedCount === r.total ? "text-emerald-600" : "text-slate-500")}>{r.verifiedCount}/{r.total}</span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setAddForDriverId(r.driver.id); }}>
                                                        <Plus size={14} /> Add items
                                                    </Button>
                                                    <ChevronRight size={17} className="text-slate-400 shrink-0" />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <TablePager page={page} perPage={perPage} total={shown.length} label="drivers" onPage={setPage} onPerPage={(n) => { setPerPage(n); setPage(0); }} />
                </div>
            )}
            </div>

            {addForDriverId && addDriver && (
                <QuickAddDialog
                    driverName={driverName(addDriver)}
                    groups={addGroups}
                    onClose={() => setAddForDriverId(null)}
                    onAdd={(lines) => addItemsToDriver(addForDriverId, lines)}
                />
            )}
        </div>
    );
}

// Dedicated per-driver page — the full inventory one driver is holding, opened
// by clicking a row in the Driver Inventory list.
function DriverInventoryDetailPage({
    onNavigate, accountId, accountName, driverId,
}: { onNavigate: (path: string) => void; accountId?: string; accountName?: string; driverId: string }) {
    const acct = accountId ?? "acct-001";
    const { records, get, save } = useDriverHandovers(acct);
    const [showAdd, setShowAdd] = useState(false);
    const [editing, setEditing] = useState(false);

    const drivers = useMemo(() => CARRIER_DRIVERS[acct] || CARRIER_DRIVERS["acct-001"] || [], [acct]);
    const driver = drivers.find((d: any) => d.id === driverId);
    const itemById = useMemo(() => {
        const all = accountId ? getInventoryForCarrier(accountId) : INVENTORY_ITEMS;
        const m = new Map<string, InventoryItem>();
        for (const it of all) m.set(it.id, it);
        return m;
    }, [accountId]);

    const rec = records[`${acct}::${driverId}`];
    const groups = useMemo(() => (rec ? buildDriverGroups(rec, itemById) : []), [rec, itemById]);
    const addGroups = useMemo(() => buildAddGroups(records, acct, accountId, driverId), [records, acct, accountId, driverId]);

    const addItems = (newLines: { itemId: string; qty: string }[]) => {
        const cur = get(driverId);
        if (cur && newLines.length > 0) save(appendLines(cur, newLines));
        setShowAdd(false);
    };

    // Take an item back from the driver — returns it to the company pool and
    // frees it to be handed over to another driver.
    const takeBack = (itemId: string) => {
        const cur = get(driverId);
        if (cur) save(removeLines(cur, [itemId]));
    };

    const status = rec ? handoverStatusOf(rec) : "not-issued";
    const chip = STATUS_CHIP[status];
    const ChipIcon = chip.icon;
    const total = rec?.lines.length ?? 0;
    const verifiedCount = rec?.verifiedItemIds?.length ?? 0;
    const lic = (driver as any)?.licenseNumber as string | undefined;

    return (
        <div className="p-6 lg:p-8 bg-slate-50 min-h-screen">
            {/* Breadcrumb + back */}
            <div className="mb-5">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <Building2 size={14} />
                    <span className="font-medium">{accountName ?? CARRIER_NAME}</span>
                    <span>/</span>
                    <button onClick={() => onNavigate("/inventory")} className="hover:text-slate-700">Inventory</button>
                    <span>/</span>
                    <span>{driverName(driver)}</span>
                </div>
                <button onClick={() => onNavigate("/inventory")} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600">
                    <ArrowLeft size={16} /> Back to Inventory
                </button>
            </div>

            {/* Driver header card */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className={cn("h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ring-1 ring-black/5", avatarTone(driverId))}>
                            {driverInitials(driver)}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl font-bold text-slate-900 truncate">{driverName(driver)}</h1>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                {lic && <span>License {lic}</span>}
                                {rec?.checklistName && <span>· {rec.checklistName}</span>}
                                {rec?.assigneeName && <span>· Handed over by {rec.assigneeName}</span>}
                            </div>
                            <div className="mt-2">
                                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", chip.cls)}>
                                    {ChipIcon ? <ChipIcon size={13} /> : <span className={cn("h-1.5 w-1.5 rounded-full", chip.dot)} />}
                                    {chip.label}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {total > 0 && (
                            <button type="button" onClick={() => setEditing((e) => !e)} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 h-9 text-xs font-semibold transition-colors", editing ? "border-blue-300 bg-blue-100 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600")}>
                                {editing ? <><Check size={14} /> Done</> : <><Pencil size={14} /> Edit</>}
                            </button>
                        )}
                        <button type="button" onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 h-9 text-xs font-semibold text-blue-600 hover:bg-blue-100">
                            <Plus size={14} /> Add items
                        </button>
                        <button type="button" onClick={() => onNavigate(`/inventory/handover/${driverId}`)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 h-9 text-xs font-semibold text-white hover:bg-blue-700">
                            <PackageCheck size={14} /> Manage in Hand Over
                        </button>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-xs">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-center">
                        <div className="text-lg font-bold leading-none text-slate-700">{total}</div>
                        <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Items held</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-center">
                        <div className={cn("text-lg font-bold leading-none", verifiedCount === total && total > 0 ? "text-emerald-600" : "text-slate-700")}>{verifiedCount}/{total}</div>
                        <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Verified</div>
                    </div>
                </div>
            </div>

            {editing && groups.length > 0 && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    <Undo2 size={15} className="shrink-0" />
                    Take an item back to return it to the company pool — it'll be free to hand over to another driver.
                </div>
            )}

            {/* Items */}
            {groups.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center">
                    <Package size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-600">No inventory on this driver yet</p>
                    <p className="text-xs text-slate-500 mt-1">Add items or hand a checklist over to get started.</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-5">
                    {groups.map((g) => {
                        const visual = CAT_VISUAL[g.id] ?? DEFAULT_VISUAL;
                        const Icon = visual.icon;
                        return (
                            <div key={g.id}>
                                <div className="mb-2 flex items-center gap-2">
                                    <div className={cn("h-6 w-6 rounded-md flex items-center justify-center ring-1 ring-black/5", visual.bg, visual.text)}><Icon size={13} /></div>
                                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{g.name}</p>
                                </div>
                                <div className="space-y-1.5">
                                    {g.lines.map(({ item, qty, verified }) => {
                                        const vendor = VENDORS.find((v) => v.id === item.vendorId);
                                        const asset = assetLabel(item, accountId);
                                        return (
                                            <div key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-semibold text-slate-900 truncate">{vendor?.name ?? "—"}</div>
                                                    <div className="text-[11px] text-slate-500 font-mono truncate">{item.serial}{item.pin ? ` · PIN ${item.pin}` : ""}</div>
                                                </div>
                                                {asset && (
                                                    <div className="hidden md:flex items-center gap-1.5 shrink-0 text-xs text-slate-500">
                                                        <Truck size={13} className="text-slate-400" />
                                                        <span className="truncate max-w-[200px]">{asset}</span>
                                                    </div>
                                                )}
                                                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Qty {qty}</span>
                                                {editing ? (
                                                    <button type="button" onClick={() => takeBack(item.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-100 shrink-0">
                                                        <Undo2 size={12} /> Take back
                                                    </button>
                                                ) : verified ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0"><CircleCheck size={11} /> Received</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0">Pending</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showAdd && driver && (
                <QuickAddDialog
                    driverName={driverName(driver)}
                    groups={addGroups}
                    onClose={() => setShowAdd(false)}
                    onAdd={addItems}
                />
            )}
        </div>
    );
}

// Quick-add popup — pick available inventory to add to a driver's list.
function QuickAddDialog({
    driverName: name, groups, onClose, onAdd,
}: {
    driverName: string;
    groups: { id: string; name: string; items: InventoryItem[] }[];
    onClose: () => void;
    onAdd: (lines: { itemId: string; qty: string }[]) => void;
}) {
    const [checked, setChecked] = useState<Record<string, boolean>>({});
    const [qty, setQty] = useState<Record<string, string>>({});
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        if (!s) return groups;
        return groups
            .map((g) => ({ ...g, items: g.items.filter((it) => { const v = VENDORS.find((vv) => vv.id === it.vendorId); return (v?.name ?? "").toLowerCase().includes(s) || it.serial.toLowerCase().includes(s); }) }))
            .filter((g) => g.items.length > 0);
    }, [groups, search]);

    const total = groups.reduce((n, g) => n + g.items.length, 0);
    const selected = Object.values(checked).filter(Boolean).length;
    const toggle = (id: string) => setChecked((c) => { const on = !c[id]; if (on) setQty((qq) => ({ ...qq, [id]: qq[id] ?? "1" })); return { ...c, [id]: on }; });
    const confirm = () => onAdd(groups.flatMap((g) => g.items).filter((it) => checked[it.id]).map((it) => ({ itemId: it.id, qty: (qty[it.id] ?? "").trim() || "1" })));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Plus className="h-5 w-5" /></span>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Add items</h3>
                            <p className="text-xs text-slate-500">Add more company inventory to {name}'s list.</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
                </div>

                <div className="border-b border-slate-100 px-5 py-3">
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search accessories…"
                            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                </div>

                <div className="max-h-[52vh] space-y-4 overflow-y-auto px-5 py-4">
                    {total === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                            <Layers size={26} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-sm font-medium text-slate-600">No inventory available to add</p>
                            <p className="text-xs text-slate-500 mt-1">Everything else is already assigned to a driver.</p>
                        </div>
                    ) : filtered.map((g) => {
                        const visual = CAT_VISUAL[g.id] ?? DEFAULT_VISUAL;
                        const Icon = visual.icon;
                        return (
                            <div key={g.id}>
                                <div className="mb-1.5 flex items-center gap-2">
                                    <div className={cn("h-6 w-6 rounded-md flex items-center justify-center ring-1 ring-black/5", visual.bg, visual.text)}><Icon size={13} /></div>
                                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{g.name}</p>
                                </div>
                                <div className="space-y-1.5">
                                    {g.items.map((it) => {
                                        const vendor = VENDORS.find((v) => v.id === it.vendorId);
                                        const on = !!checked[it.id];
                                        return (
                                            <div key={it.id} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2 transition", on ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white hover:border-slate-300")}>
                                                <button type="button" onClick={() => toggle(it.id)} className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition", on ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 hover:border-emerald-400")}>
                                                    {on && <Check size={13} />}
                                                </button>
                                                <button type="button" onClick={() => toggle(it.id)} className="min-w-0 flex-1 text-left">
                                                    <div className="text-sm font-semibold text-slate-900 truncate">{vendor?.name ?? "—"}</div>
                                                    <div className="text-[11px] text-slate-500 font-mono truncate">{it.serial}{it.pin ? ` · PIN ${it.pin}` : ""}</div>
                                                </button>
                                                {on && (
                                                    <div className="flex shrink-0 items-center gap-1.5">
                                                        <span className="text-[11px] font-medium text-slate-400">Qty</span>
                                                        <Input value={qty[it.id] ?? ""} onChange={(e) => setQty((qq) => ({ ...qq, [it.id]: e.target.value }))} className="h-8 w-14 text-center" placeholder="1" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
                    <span className="text-xs font-semibold text-slate-500">{selected} selected</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                        <Button size="sm" disabled={selected === 0} onClick={confirm}><Plus className="h-4 w-4" /> Add {selected > 0 ? `${selected} ` : ""}to list</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
