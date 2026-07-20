import { useMemo, useState } from "react";
import { X, Search, Check, ChevronDown, PackageCheck, ListChecks, UserRound, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-drivers.data";
import { VENDORS } from "./inventory.data";
import { useDriverHandovers, buildAddGroups, appendLines, type DriverHandover } from "./handovers.data";
import { todayISO } from "../hiring-process/FormKit";
import { cn } from "@/lib/utils";

const driverName = (d: any) => (d?.name ?? `${d?.firstName ?? ""} ${d?.lastName ?? ""}`.trim()) || "Driver";
const driverInitials = (d: any) => driverName(d).split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
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
const activeDrivers = (acct: string) =>
    (CARRIER_DRIVERS[acct] || CARRIER_DRIVERS["acct-001"] || []).filter((d: any) => d.status === "Active");

// ── Direct hand over — quick pop-up form ────────────────────────────────────
// Pick a driver + items and hand them over immediately (staff sign-off is
// recorded straight away, no assign/verify ceremony). For the full workflow use
// the checklist hand-over dedicated page instead.
export function DirectHandoverDialog({ accountId, driverId: lockedDriverId, onClose }: {
    accountId?: string;
    /** When set, the dialog is scoped to this driver (no driver picker). */
    driverId?: string;
    onClose: () => void;
}) {
    const acct = accountId ?? "acct-001";
    const { records, get, save } = useDriverHandovers(acct);
    const drivers = useMemo(() => activeDrivers(acct), [acct]);
    const lockedDriver = useMemo(
        () => (lockedDriverId ? (CARRIER_DRIVERS[acct] || CARRIER_DRIVERS["acct-001"] || []).find((d: any) => d.id === lockedDriverId) : undefined),
        [lockedDriverId, acct],
    );

    const [driverId, setDriverId] = useState(lockedDriverId ?? "");
    const [search, setSearch] = useState("");
    const [checked, setChecked] = useState<Record<string, boolean>>({});
    const [qty, setQty] = useState<Record<string, string>>({});

    const groups = useMemo(
        () => (driverId ? buildAddGroups(records, acct, accountId, driverId) : []),
        [driverId, records, acct, accountId],
    );
    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        if (!s) return groups;
        return groups
            .map((g) => ({ ...g, items: g.items.filter((it) => { const v = VENDORS.find((vv) => vv.id === it.vendorId); return (v?.name ?? "").toLowerCase().includes(s) || it.serial.toLowerCase().includes(s); }) }))
            .filter((g) => g.items.length > 0);
    }, [groups, search]);

    const allAvailable = useMemo(() => groups.flatMap((g) => g.items), [groups]);
    const total = allAvailable.length;
    const selected = allAvailable.filter((it) => checked[it.id]).length;

    const toggle = (id: string) => setChecked((c) => { const on = !c[id]; if (on) setQty((qq) => ({ ...qq, [id]: qq[id] ?? "1" })); return { ...c, [id]: on }; });

    const handOver = () => {
        if (!driverId || selected === 0) return;
        const lines = allAvailable.filter((it) => checked[it.id]).map((it) => ({ itemId: it.id, qty: (qty[it.id] ?? "").trim() || "1" }));
        const stamp = Date.now();
        const sign = { name: "Fleet Manager", role: "Fleet Manager", date: todayISO(), sig: "", done: true };
        const cur = get(driverId);
        let rec: DriverHandover;
        if (cur) {
            rec = appendLines(cur, lines);
            if (!rec.staffSignoff?.done) rec = { ...rec, staffSignoff: sign, recordedAt: stamp };
        } else {
            rec = {
                driverId, accountId: acct, checklistName: "Direct hand-over",
                lines, issuedByName: "Fleet Manager", issuedByTitle: "Fleet Manager",
                staffSignoff: sign, verifiedItemIds: [], updatedAt: stamp, recordedAt: stamp,
            };
        }
        save(rec);
        onClose();
    };

    return (
        <Overlay onClose={onClose}>
            <DialogHeader
                Icon={PackageCheck}
                title="Direct hand over"
                subtitle="Pick a driver and items to hand over right away."
                onClose={onClose}
            />

            {/* Driver select (or locked driver header) */}
            <div className="border-b border-slate-100 px-5 py-3">
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Hand over to</label>
                {lockedDriver ? (
                    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                        <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ring-1 ring-black/5", avatarTone(lockedDriver.id))}>
                            {driverInitials(lockedDriver)}
                        </div>
                        <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate">{driverName(lockedDriver)}</div>
                            {(lockedDriver as any).licenseNumber && <div className="text-[11px] text-slate-500 truncate">License {(lockedDriver as any).licenseNumber}</div>}
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        <select
                            value={driverId}
                            onChange={(e) => { setDriverId(e.target.value); setChecked({}); setQty({}); }}
                            className="w-full h-10 pl-3 pr-8 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 appearance-none"
                        >
                            <option value="">Select a driver…</option>
                            {drivers.map((d: any) => (
                                <option key={d.id} value={d.id}>{driverName(d)}{d.licenseNumber ? ` · License ${d.licenseNumber}` : ""}</option>
                            ))}
                        </select>
                        <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                )}
            </div>

            {!driverId ? (
                <div className="px-5 py-12 text-center">
                    <UserRound size={26} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-600">Choose a driver to see what's available to hand over.</p>
                </div>
            ) : (
                <>
                    <div className="border-b border-slate-100 px-5 py-3">
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search available items…"
                                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                    </div>
                    <div className="max-h-[46vh] space-y-4 overflow-y-auto px-5 py-4">
                        {total === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                                <Layers size={26} className="mx-auto text-slate-300 mb-2" />
                                <p className="text-sm font-medium text-slate-600">No inventory available to hand over</p>
                                <p className="text-xs text-slate-500 mt-1">Everything else is already on a driver.</p>
                            </div>
                        ) : filtered.map((g) => (
                            <div key={g.id}>
                                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">{g.name}</p>
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
                                                        <input value={qty[it.id] ?? ""} onChange={(e) => setQty((qq) => ({ ...qq, [it.id]: e.target.value }))} placeholder="1"
                                                            className="h-8 w-14 rounded-lg border border-slate-200 text-center text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
                <span className="text-xs font-semibold text-slate-500">{selected} selected</span>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                    <Button size="sm" disabled={!driverId || selected === 0} onClick={handOver}>
                        <PackageCheck className="h-4 w-4" /> Hand over{selected > 0 ? ` ${selected}` : ""}
                    </Button>
                </div>
            </div>
        </Overlay>
    );
}

// ── Checklist hand over — pick a driver, then open the dedicated page ────────
export function ChecklistHandoverPicker({ accountId, onNavigate, onClose }: {
    accountId?: string;
    onNavigate: (path: string) => void;
    onClose: () => void;
}) {
    const acct = accountId ?? "acct-001";
    const drivers = useMemo(() => activeDrivers(acct), [acct]);
    const [search, setSearch] = useState("");

    const q = search.trim().toLowerCase();
    const shown = q
        ? drivers.filter((d: any) => driverName(d).toLowerCase().includes(q) || (d.licenseNumber ?? "").toLowerCase().includes(q))
        : drivers;

    const open = (id: string) => { onNavigate(`/inventory/handover/${id}`); onClose(); };

    return (
        <Overlay onClose={onClose}>
            <DialogHeader
                Icon={ListChecks}
                title="Checklist hand over"
                subtitle="Pick a driver to build a hand-over checklist with sign-off & verification."
                onClose={onClose}
            />
            <div className="border-b border-slate-100 px-5 py-3">
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drivers by name or license…"
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                </div>
            </div>
            <div className="max-h-[52vh] divide-y divide-slate-100 overflow-y-auto">
                {shown.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                        <UserRound size={26} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-medium text-slate-600">No drivers found</p>
                    </div>
                ) : shown.map((d: any) => (
                    <button key={d.id} type="button" onClick={() => open(d.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-blue-50/40 transition-colors">
                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ring-1 ring-black/5", avatarTone(d.id))}>
                            {driverInitials(d)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-slate-900 truncate">{driverName(d)}</div>
                            {d.licenseNumber && <div className="text-[11px] text-slate-500 truncate">License {d.licenseNumber}</div>}
                        </div>
                        <ListChecks size={16} className="text-slate-300 shrink-0" />
                    </button>
                ))}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
                <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            </div>
        </Overlay>
    );
}

// ── Shared modal chrome ─────────────────────────────────────────────────────
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
}
function DialogHeader({ Icon, title, subtitle, onClose }: { Icon: React.ElementType; title: string; subtitle: string; onClose: () => void }) {
    return (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Icon className="h-5 w-5" /></span>
                <div>
                    <h3 className="text-base font-bold text-slate-900">{title}</h3>
                    <p className="text-xs text-slate-500">{subtitle}</p>
                </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
        </div>
    );
}
