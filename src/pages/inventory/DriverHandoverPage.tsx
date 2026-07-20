import { useEffect, useMemo, useRef, useState } from "react";
import {
    Building2, PackageCheck, Search, Check, Truck, IdCard, ChevronDown, ChevronRight, ChevronLeft,
    Layers, UserRound, KeyRound, ShieldCheck, Package, Cpu, CreditCard, Eye, Printer, Download,
    Pencil, FileText, CircleCheck, ListChecks, UserCheck, Save, BadgeCheck, Plus, X,
    Mail, Link2, Copy, Send, Clock,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
    getInventoryForCarrier,
    INVENTORY_ITEMS,
    VENDORS,
    VENDOR_CATEGORIES,
    CARRIER_NAME,
    ACME_ASSETS,
    type InventoryItem,
} from "./inventory.data";
import { CARRIER_ASSETS } from "@/pages/accounts/carrier-assets.data";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-drivers.data";
import {
    useDriverHandovers, itemsHandedElsewhere, handoverStatusOf, buildDemoHandovers,
    type DriverHandover, type HandoverStatus,
} from "./handovers.data";
import { APP_USERS, getManagedAccountIds } from "@/data/users.data";
import { TablePager } from "./TablePager";
import { InventoryTabs } from "./InventoryTabs";
import { KpiTile } from "./InventoryKpi";
import { useCompanyBranding } from "../ats/company-branding.data";
import { FormDocument, THEMES, type ThemeKey, type DocSection } from "../hiring-process/FormDocument";
import { ReviewSignOff, newSignOff, todayISO, type SignOffData } from "../hiring-process/FormKit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
    onNavigate: (path: string) => void;
    accountId?: string;
    accountName?: string;
    /** When set, open this driver's hand-over form directly (deep link). */
    initialDriverId?: string;
};

// Only the company-issued physical accessories are handed over to the driver.
const HANDOVER_CATEGORIES = ["cat-keys", "cat-safety-ppe", "cat-equipment", "cat-devices", "cat-cards-docs"];

const CAT_VISUAL: Record<string, { icon: React.ElementType; bg: string; text: string; bar: string }> = {
    "cat-keys":       { icon: KeyRound,    bg: "bg-amber-50",  text: "text-amber-700",  bar: "bg-amber-500" },
    "cat-safety-ppe": { icon: ShieldCheck, bg: "bg-rose-50",   text: "text-rose-700",   bar: "bg-rose-500" },
    "cat-equipment":  { icon: Package,     bg: "bg-teal-50",   text: "text-teal-700",   bar: "bg-teal-500" },
    "cat-devices":    { icon: Cpu,         bg: "bg-sky-50",    text: "text-sky-700",    bar: "bg-sky-500" },
    "cat-cards-docs": { icon: CreditCard,  bg: "bg-violet-50", text: "text-violet-700", bar: "bg-violet-500" },
};
const DEFAULT_VISUAL = { icon: Layers, bg: "bg-slate-100", text: "text-slate-700", bar: "bg-slate-400" };

// Deterministic avatar colour per driver (same idea as the inventory vendor
// avatars) — keeps the list colourful without random flicker between renders.
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

function assetLabel(item: InventoryItem, accountId?: string): string {
    if (item.assignedTo?.kind === "cmv" || item.assignedTo?.kind === "non-cmv") {
        const assets = (accountId && CARRIER_ASSETS[accountId]) || ACME_ASSETS;
        const asset = assets.find((a: any) => a.id === item.assignedTo!.targetId) ?? ACME_ASSETS.find((a) => a.id === item.assignedTo!.targetId);
        if (asset) return `${asset.unitNumber} · ${asset.year} ${asset.make} ${asset.model}`;
    }
    return "Unassigned";
}

const driverName = (d: any) => (d?.name ?? `${d?.firstName ?? ""} ${d?.lastName ?? ""}`.trim()) || "Driver";
const driverInitials = (d: any) => driverName(d).split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

const STATUS_CHIP: Record<HandoverStatus, { label: (n: number) => string; cls: string; dot: string; icon?: React.ElementType }> = {
    "not-issued": { label: () => "Not issued yet", cls: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
    "handed-over": { label: (n) => `Handed over · ${n} item${n === 1 ? "" : "s"}`, cls: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" },
    "verified": { label: (n) => `Verified by driver · ${n} item${n === 1 ? "" : "s"}`, cls: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500", icon: CircleCheck },
};

type IssuedBy = { name: string; title: string; vehicle: string; employeeId: string; date: string };
const EMPTY_ISSUED: IssuedBy = { name: "", title: "", vehicle: "", employeeId: "", date: todayISO() };


export function DriverHandoverPage({ onNavigate, accountId, accountName, initialDriverId }: Props) {
    const acct = accountId ?? "acct-001";
    const { records, get, save } = useDriverHandovers(acct);

    const [view, setView] = useState<"list" | "form" | "pdf" | "linkform">("list");
    const [linkVariant, setLinkVariant] = useState<"handover" | "driver">("handover");
    const [activeDriverId, setActiveDriverId] = useState("");

    // Working state for the active driver's hand-over (shared by form + PDF).
    const [checked, setChecked] = useState<Record<string, boolean>>({});
    const [qty, setQty] = useState<Record<string, string>>({});
    const [issued, setIssued] = useState<IssuedBy>(EMPTY_ISSUED);
    const [checklistName, setChecklistName] = useState("");
    const [assignee, setAssignee] = useState<{ id: string; name: string }>({ id: "", name: "" });
    const [staffSignoff, setStaffSignoff] = useState<SignOffData>(newSignOff);
    const [driverSignoff, setDriverSignoff] = useState<SignOffData>(newSignOff);
    const [verified, setVerified] = useState<Record<string, boolean>>({});

    const [driverSearch, setDriverSearch] = useState("");
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(8);

    const drivers = useMemo(() => {
        const list = CARRIER_DRIVERS[acct] || CARRIER_DRIVERS["acct-001"] || [];
        return list.filter((d) => (d as any).status === "Active");
    }, [acct]);

    // Staff who could be assigned the hand-over task — app users tied to this carrier.
    const staff = useMemo(() => {
        const scoped = APP_USERS.filter((u) => u.role !== "super-admin" && (u.accountId === acct || (getManagedAccountIds(u) ?? []).includes(acct)));
        return scoped.length > 0 ? scoped : APP_USERS.filter((u) => u.role !== "super-admin");
    }, [acct]);

    // Items already handed over to OTHER drivers are unavailable to hand over again.
    const handedElsewhere = useMemo(
        () => itemsHandedElsewhere(records, acct, activeDriverId),
        [records, acct, activeDriverId],
    );

    const allItems = useMemo<InventoryItem[]>(() => {
        const all = accountId ? getInventoryForCarrier(accountId) : INVENTORY_ITEMS;
        return all.filter((it) => {
            const vendor = VENDORS.find((v) => v.id === it.vendorId);
            if (!vendor || !HANDOVER_CATEGORIES.includes(vendor.categoryId)) return false;
            return !handedElsewhere.has(it.id);
        });
    }, [accountId, handedElsewhere]);

    useEffect(() => { setView("list"); setActiveDriverId(""); setDriverSearch(""); setPage(0); }, [acct]);
    useEffect(() => { setPage(0); }, [driverSearch]);

    // Seed a couple of example records so the list shows real handed-over /
    // verified rows the first time this carrier's page is opened.
    useEffect(() => {
        if (!drivers.length) return;
        if (Object.values(records).some((r) => r.accountId === acct)) return;
        const base = (accountId ? getInventoryForCarrier(accountId) : INVENTORY_ITEMS)
            .filter((it) => { const v = VENDORS.find((v) => v.id === it.vendorId); return v && HANDOVER_CATEGORIES.includes(v.categoryId); });
        const issuer = staff[0]?.name ?? "Fleet Manager";
        const demos = buildDemoHandovers(acct, drivers.map((d) => ({ id: d.id, name: driverName(d) })), base.map((b) => b.id), issuer);
        demos.forEach(save);
    }, [acct, drivers, records, staff, accountId]);

    // Open the hand-over form for a driver, prefilling any saved record.
    const openDriver = (id: string) => {
        const rec = get(id);
        const d = drivers.find((x) => x.id === id);
        if (rec) {
            setChecked(Object.fromEntries(rec.lines.map((l) => [l.itemId, true])));
            setQty(Object.fromEntries(rec.lines.map((l) => [l.itemId, l.qty])));
            setIssued({ name: rec.issuedByName, title: rec.issuedByTitle, vehicle: rec.vehicle ?? "", employeeId: rec.employeeId ?? "", date: todayISO() });
            setChecklistName(rec.checklistName ?? "Standard driver kit");
            setAssignee({ id: rec.assigneeId ?? "", name: rec.assigneeName ?? "" });
            setStaffSignoff(rec.staffSignoff ?? { ...newSignOff(), role: "Fleet Manager" });
            setDriverSignoff(rec.driverSignoff ?? { ...newSignOff(), name: driverName(d), role: "Driver" });
            setVerified(Object.fromEntries((rec.verifiedItemIds ?? []).map((i) => [i, true])));
        } else {
            setChecked({}); setQty({}); setIssued({ ...EMPTY_ISSUED }); setAssignee({ id: "", name: "" });
            setChecklistName("Standard driver kit");
            setStaffSignoff({ ...newSignOff(), role: "Fleet Manager" });
            setDriverSignoff({ ...newSignOff(), name: driverName(d), role: "Driver" });
            setVerified({});
        }
        setActiveDriverId(id);
        setView("form");
    };

    // The driver form is its own page (/inventory/handover/<driverId>). This
    // effect keeps the view in sync with the route: open the driver when the
    // URL carries one, fall back to the list when it doesn't.
    useEffect(() => {
        if (initialDriverId && drivers.some((d) => d.id === initialDriverId)) openDriver(initialDriverId);
        else if (!initialDriverId) { setView("list"); setActiveDriverId(""); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialDriverId, acct]);

    const activeDriver = drivers.find((d) => d.id === activeDriverId);

    const selectedLines = useMemo(
        () => allItems.filter((it) => checked[it.id]).map((it) => ({ item: it, qty: (qty[it.id] ?? "").trim() || "1" })),
        [allItems, checked, qty],
    );

    const saveHandover = () => {
        if (!activeDriver) return;
        const rec: DriverHandover = {
            driverId: activeDriver.id,
            accountId: acct,
            checklistName: checklistName.trim() || "Standard driver kit",
            lines: selectedLines.map(({ item, qty }) => ({ itemId: item.id, qty })),
            issuedByName: issued.name,
            issuedByTitle: issued.title,
            vehicle: issued.vehicle || undefined,
            employeeId: issued.employeeId || undefined,
            assigneeId: assignee.id || undefined,
            assigneeName: assignee.name || undefined,
            staffSignoff,
            driverSignoff,
            verifiedItemIds: selectedLines.filter(({ item }) => verified[item.id]).map(({ item }) => item.id),
            updatedAt: Date.now(),
            recordedAt: staffSignoff.done ? Date.now() : undefined,
        };
        save(rec);
        onNavigate("/inventory");
    };

    if (view === "linkform" && activeDriver) {
        return (
            <HandoverLinkForm
                driver={activeDriver}
                variant={linkVariant}
                checklistName={checklistName}
                selectedLines={selectedLines}
                issued={issued}
                assigneeName={assignee.name}
                onBack={() => setView("form")}
                onPdf={() => setView("pdf")}
            />
        );
    }

    if (view === "pdf" && activeDriver) {
        return (
            <HandoverPdf
                driver={activeDriver}
                accountName={accountName}
                checklistName={checklistName}
                selectedLines={selectedLines}
                issued={issued}
                assigneeName={assignee.name}
                staffSignoff={staffSignoff}
                driverSignoff={driverSignoff}
                verified={verified}
                onBack={() => setView("form")}
            />
        );
    }

    if (view === "form" && activeDriver) {
        return (
            <HandoverForm
                driver={activeDriver}
                accountId={accountId}
                allItems={allItems}
                hiddenCount={handedElsewhere.size}
                staff={staff}
                checklistName={checklistName}
                checked={checked} setChecked={setChecked}
                qty={qty} setQty={setQty}
                issued={issued} setIssued={setIssued}
                assignee={assignee} setAssignee={setAssignee}
                staffSignoff={staffSignoff} setStaffSignoff={setStaffSignoff}
                driverSignoff={driverSignoff} setDriverSignoff={setDriverSignoff}
                verified={verified} setVerified={setVerified}
                selectedLines={selectedLines}
                onBack={() => onNavigate("/inventory")}
                onPdf={() => setView("pdf")}
                onViewForm={(variant) => { setLinkVariant(variant); setView("linkform"); }}
                onSave={saveHandover}
            />
        );
    }

    // ── Drivers list ─────────────────────────────────────────────────────────
    const q = driverSearch.trim().toLowerCase();
    const shownDrivers = q
        ? drivers.filter((d) => driverName(d).toLowerCase().includes(q) || ((d as any).licenseNumber ?? "").toLowerCase().includes(q))
        : drivers;
    const issuedCount = drivers.filter((d) => handoverStatusOf(get(d.id)) !== "not-issued").length;
    const verifiedCount = drivers.filter((d) => handoverStatusOf(get(d.id)) === "verified").length;
    const pendingCount = drivers.length - issuedCount;

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
                    <span>Hand Over</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Hand Over</h1>
                <p className="text-sm text-slate-500 mt-0.5">Issue a hand-over checklist to a driver, assign the task to a staff member, then have the driver verify what they received — all tracked here.</p>
                </div>

                {/* Section tabs */}
                <InventoryTabs current="list" onNavigate={onNavigate} className="mt-4 -mb-5" />
            </div>

            {/* Body */}
            <div className="px-6 lg:px-8 py-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <KpiTile label="Handed over" value={issuedCount} Icon={PackageCheck} accent="amber" />
                <KpiTile label="Verified" value={verifiedCount} Icon={CircleCheck} accent="emerald" />
                <KpiTile label="Pending" value={pendingCount} Icon={Clock} accent="blue" />
            </div>

            {/* Search */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 mb-5 flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={driverSearch}
                        onChange={(e) => setDriverSearch(e.target.value)}
                        placeholder="Search drivers by name or license…"
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
            </div>

            {shownDrivers.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center">
                    <UserRound size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-600">No drivers found</p>
                    <p className="text-xs text-slate-500 mt-1">Active drivers for this carrier will appear here.</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Driver</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Hand-over status</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Items</th>
                                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {shownDrivers.slice(page * perPage, page * perPage + perPage).map((d) => {
                                    const rec = get(d.id);
                                    const status = handoverStatusOf(rec);
                                    const count = rec?.lines.length ?? 0;
                                    const chip = STATUS_CHIP[status];
                                    const ChipIcon = chip.icon;
                                    const lic = (d as any).licenseNumber as string | undefined;
                                    const hasList = count > 0;
                                    const action = !hasList
                                        ? { label: "Create checklist", Icon: Plus, primary: true }
                                        : status === "not-issued"
                                            ? { label: "Hand over", Icon: PackageCheck, primary: true }
                                            : { label: "Edit", Icon: Pencil, primary: false };
                                    return (
                                        <tr key={d.id} onClick={() => onNavigate(`/inventory/handover/${d.id}`)} className="cursor-pointer even:bg-slate-50/40 hover:bg-blue-50/40 transition-colors">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ring-1 ring-black/5", avatarTone(d.id))}>
                                                        {driverInitials(d)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold text-slate-900 truncate">{driverName(d)}</div>
                                                        {lic && <div className="text-[11px] text-slate-500 inline-flex items-center gap-1 mt-0.5"><IdCard size={12} className="text-slate-400" /> License {lic}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", chip.cls)}>
                                                    {ChipIcon ? <ChipIcon size={13} /> : <span className={cn("h-1.5 w-1.5 rounded-full", chip.dot)} />}
                                                    {chip.label(count)}
                                                </span>
                                                {rec && status !== "not-issued" && (
                                                    <div className="mt-1 text-[10px] text-slate-400 truncate max-w-[16rem]">
                                                        {status === "verified" ? `Signed by ${rec.driverSignoff?.name || driverName(d)}` : `Assigned to ${rec.assigneeName || "—"} · awaiting driver`}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{count > 0 ? `${count} item${count === 1 ? "" : "s"}` : "—"}</td>
                                            <td className="px-5 py-3 text-right">
                                                <Button
                                                    variant={action.primary ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); onNavigate(`/inventory/handover/${d.id}`); }}
                                                >
                                                    <action.Icon size={14} /> {action.label}
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <TablePager page={page} perPage={perPage} total={shownDrivers.length} label="drivers" onPage={setPage} onPerPage={(n) => { setPerPage(n); setPage(0); }} />
                </div>
            )}
            </div>
        </div>
    );
}

// ── Hand-over workflow form (per driver) ─────────────────────────────────────
// Mirrors the onboarding Accessories step: a vertical stepper —
//   1. Hand-over checklist (staff pick items, assign the task, sign)
//   2. Driver verification (driver confirms the same items & signs)
//   3. Done — generate the signed PDF.
function HandoverForm({
    driver, accountId, allItems, hiddenCount, staff, checklistName,
    checked, setChecked, qty, setQty, issued, setIssued, assignee, setAssignee,
    staffSignoff, setStaffSignoff, driverSignoff, setDriverSignoff, verified, setVerified,
    selectedLines, onBack, onPdf, onViewForm, onSave,
}: {
    driver: any;
    accountId?: string;
    allItems: InventoryItem[];
    hiddenCount: number;
    staff: typeof APP_USERS;
    checklistName: string;
    checked: Record<string, boolean>;
    setChecked: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    qty: Record<string, string>;
    setQty: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    issued: IssuedBy;
    setIssued: React.Dispatch<React.SetStateAction<IssuedBy>>;
    assignee: { id: string; name: string };
    setAssignee: React.Dispatch<React.SetStateAction<{ id: string; name: string }>>;
    staffSignoff: SignOffData;
    setStaffSignoff: React.Dispatch<React.SetStateAction<SignOffData>>;
    driverSignoff: SignOffData;
    setDriverSignoff: React.Dispatch<React.SetStateAction<SignOffData>>;
    verified: Record<string, boolean>;
    setVerified: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    selectedLines: { item: InventoryItem; qty: string }[];
    onBack: () => void;
    onPdf: () => void;
    onViewForm: (variant: "handover" | "driver") => void;
    onSave: () => void;
}) {
    const [search, setSearch] = useState("");
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    const items = useMemo(() => {
        const s = search.trim().toLowerCase();
        if (!s) return allItems;
        return allItems.filter((it) => {
            const vendor = VENDORS.find((v) => v.id === it.vendorId);
            return (vendor?.name ?? "").toLowerCase().includes(s) || it.serial.toLowerCase().includes(s);
        });
    }, [allItems, search]);

    // The available pool to add from (search-filtered, and already excluding
    // items on other drivers' lists via allItems).
    const grouped = useMemo(() => {
        const map = new Map<string, { id: string; name: string; items: InventoryItem[] }>();
        for (const catId of HANDOVER_CATEGORIES) {
            const cat = VENDOR_CATEGORIES.find((c) => c.id === catId);
            if (cat) map.set(catId, { id: catId, name: cat.name, items: [] });
        }
        for (const it of items) {
            const vendor = VENDORS.find((v) => v.id === it.vendorId);
            if (vendor && map.has(vendor.categoryId)) map.get(vendor.categoryId)!.items.push(it);
        }
        return Array.from(map.values()).filter((g) => g.items.length > 0);
    }, [items]);

    const selectedCount = selectedLines.length;
    const verifiedCount = selectedLines.filter(({ item }) => verified[item.id]).length;
    const shownSelected = items.filter((it) => checked[it.id]).length;
    const status = handoverStatusOf({ staffSignoff, driverSignoff } as DriverHandover);

    // The driver's current list (selected items), grouped by category — this is
    // what we show once inventory has been picked for them.
    const listGrouped = useMemo(() => {
        const map = new Map<string, { id: string; name: string; lines: { item: InventoryItem; qty: string }[] }>();
        for (const catId of HANDOVER_CATEGORIES) {
            const cat = VENDOR_CATEGORIES.find((c) => c.id === catId);
            if (cat) map.set(catId, { id: catId, name: cat.name, lines: [] });
        }
        for (const line of selectedLines) {
            const vendor = VENDORS.find((v) => v.id === line.item.vendorId);
            if (vendor && map.has(vendor.categoryId)) map.get(vendor.categoryId)!.lines.push(line);
        }
        return Array.from(map.values()).filter((g) => g.lines.length > 0);
    }, [selectedLines]);

    // Start in "add" mode when the driver has no list yet; otherwise show the list.
    const [addMode, setAddMode] = useState(selectedCount === 0);

    const toggle = (id: string) => setChecked((c) => {
        const on = !c[id];
        if (on) setQty((qq) => ({ ...qq, [id]: qq[id] ?? "1" }));
        return { ...c, [id]: on };
    });
    const removeItem = (id: string) => setChecked((c) => { const n = { ...c }; delete n[id]; return n; });
    const setIss = (patch: Partial<IssuedBy>) => setIssued((s) => ({ ...s, ...patch }));

    const handedOver = staffSignoff.done;
    const canAssign = selectedCount > 0 && !!assignee.id;
    const [verifyOpen, setVerifyOpen] = useState(driverSignoff.done);
    const [assignOpen, setAssignOpen] = useState(false);
    const [verifySendOpen, setVerifySendOpen] = useState(false);
    const assigneeEmail = staff.find((s) => s.id === assignee.id)?.email ?? "";
    const driverEmail = (driver.email as string | undefined) ?? "";
    const formLink = `https://portal.tracksmart.app/hand-over/${driver.id}`;
    const verifyLink = `https://portal.tracksmart.app/verify/${driver.id}`;

    // "Assign to hand-over" — records the assignment to the chosen staff member
    // (no signature needed). This unlocks the driver verification step.
    const assignHandover = () => {
        if (!canAssign) return;
        setStaffSignoff((s) => ({
            ...s,
            name: s.name || issued.name || assignee.name,
            role: s.role || issued.title || "Fleet Manager",
            date: s.date || todayISO(),
            done: true,
        }));
    };
    const reopenHandover = () => { setStaffSignoff((s) => ({ ...s, done: false })); setVerifyOpen(false); };

    // Skip the driver's verification — mark every item received and complete the
    // driver sign-off without the driver signing. Status becomes "verified".
    const skipVerification = () => {
        setVerified(Object.fromEntries(selectedLines.map(({ item }) => [item.id, true])));
        setDriverSignoff((s) => ({ ...s, name: s.name || driverName(driver), role: s.role || "Driver", date: s.date || todayISO(), done: true }));
        setVerifyOpen(true);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top bar */}
            <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
                    <ChevronLeft className="h-4 w-4" /> Drivers
                </button>
                <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_CHIP[status].cls)}>
                        {STATUS_CHIP[status].icon ? <CircleCheck size={13} /> : <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_CHIP[status].dot)} />}
                        {STATUS_CHIP[status].label(selectedCount)}
                    </span>
                    <Button variant="outline" size="sm" onClick={onPdf}><Eye className="h-4 w-4" /> PDF view</Button>
                    <Button size="sm" onClick={onSave}><Save className="h-4 w-4" /> Save</Button>
                </div>
            </div>

            <div className="mx-auto max-w-4xl space-y-6 px-6 py-6">
                {/* Driver header */}
                <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className={cn("h-12 w-12 rounded-full flex items-center justify-center text-base font-bold shrink-0 ring-1 ring-black/5", avatarTone(driver.id))}>
                        {driverInitials(driver)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Driver Hand-Over</p>
                        <h1 className="text-2xl font-bold text-slate-900 truncate">{driverName(driver)}</h1>
                        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                            <UserCheck size={13} className="text-slate-400" />
                            {assignee.name
                                ? <>Hand-over assigned to <span className="font-semibold text-slate-700">{assignee.name}</span></>
                                : "Hand-over not yet assigned"}
                        </p>
                    </div>
                    {driver.licenseNumber && (
                        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 text-xs font-semibold self-start">
                            <IdCard size={13} /> License {driver.licenseNumber}
                        </span>
                    )}
                </div>

                {/* Hand-over checklist */}
                <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><ListChecks className="h-5 w-5" /></span>
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Hand-over checklist</h2>
                                <p className="text-xs text-slate-500">Pick the items being issued and assign who hands them over.</p>
                            </div>
                        </div>
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", handedOver ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-slate-100 text-slate-500")}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", handedOver ? "bg-amber-500" : "bg-slate-400")} />
                            {handedOver ? "Assigned / handed over" : "Not assigned"}
                        </span>
                    </div>

                    <div className="space-y-5">
                            {addMode ? (
                                /* Pick from the available inventory pool to add to this driver's list. */
                                <>
                                    <div className="flex items-center gap-2 flex-wrap pt-1">
                                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900"><ListChecks className="h-4 w-4 text-amber-500" /> Add from inventory</span>
                                        <div className="relative flex-1 min-w-[200px] max-w-xs">
                                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search accessories…"
                                                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                                        </div>
                                        <span className="text-xs font-semibold text-slate-500">{shownSelected} selected</span>
                                        {selectedCount > 0 && (
                                            <button type="button" onClick={() => { setAddMode(false); setSearch(""); }} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                                                <Check size={13} /> Done ({selectedCount})
                                            </button>
                                        )}
                                    </div>

                                    {hiddenCount > 0 && (
                                        <p className="text-[11px] text-slate-400">{hiddenCount} item{hiddenCount === 1 ? "" : "s"} hidden — already on another driver's list.</p>
                                    )}

                                    {grouped.length === 0 && (
                                        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                                            <Layers size={26} className="mx-auto text-slate-300 mb-2" />
                                            <p className="text-sm font-medium text-slate-600">No inventory available to add</p>
                                            <p className="text-xs text-slate-500 mt-1">Everything is already assigned to a driver.</p>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {grouped.map((g) => {
                                            const visual = CAT_VISUAL[g.id] ?? DEFAULT_VISUAL;
                                            const Icon = visual.icon;
                                            const isCollapsed = !!collapsed[g.id];
                                            const groupSel = g.items.filter((it) => checked[it.id]).length;
                                            return (
                                                <section key={g.id} className="border border-slate-200 rounded-xl overflow-hidden relative">
                                                    <div className={cn("absolute left-0 top-0 bottom-0 w-1", visual.bar)} />
                                                    <button type="button" onClick={() => setCollapsed((c) => ({ ...c, [g.id]: !c[g.id] }))}
                                                        className={cn("w-full flex items-center gap-3 pl-5 pr-4 py-3 hover:bg-slate-50/60 transition-colors text-left", isCollapsed ? "" : "border-b border-slate-100")}>
                                                        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ring-1 ring-black/5", visual.bg, visual.text)}>
                                                            <Icon size={16} />
                                                        </div>
                                                        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                                                            <h3 className="text-sm font-bold text-slate-900">{g.name}</h3>
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">{g.items.length}</span>
                                                            {groupSel > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">{groupSel} added</span>}
                                                        </div>
                                                        {isCollapsed ? <ChevronRight size={17} className="text-slate-400 shrink-0" /> : <ChevronDown size={17} className="text-slate-400 shrink-0" />}
                                                    </button>
                                                    {!isCollapsed && (
                                                        <div className="divide-y divide-slate-100">
                                                            {g.items.map((it) => {
                                                                const vendor = VENDORS.find((v) => v.id === it.vendorId);
                                                                const on = !!checked[it.id];
                                                                return (
                                                                    <div key={it.id} className={cn("flex items-center gap-3 px-5 py-2.5 transition-colors", on ? "bg-emerald-50/40" : "hover:bg-slate-50/60")}>
                                                                        <button type="button" onClick={() => toggle(it.id)} className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition", on ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white hover:border-emerald-400")}>
                                                                            {on && <Check size={13} />}
                                                                        </button>
                                                                        <button type="button" onClick={() => toggle(it.id)} className="min-w-0 flex-1 text-left">
                                                                            <div className="text-sm font-semibold text-slate-900 truncate">{vendor?.name ?? "—"}</div>
                                                                            <div className="text-[11px] text-slate-500 font-mono truncate">{it.serial}{it.pin ? ` · PIN ${it.pin}` : ""}</div>
                                                                        </button>
                                                                        <div className="hidden md:flex items-center gap-1.5 shrink-0 text-xs text-slate-500">
                                                                            <Truck size={13} className="text-slate-400" />
                                                                            <span className="truncate max-w-[180px]">{assetLabel(it, accountId)}</span>
                                                                        </div>
                                                                        {on && (
                                                                            <div className="flex shrink-0 items-center gap-1.5">
                                                                                <span className="text-[11px] font-medium text-slate-400">Qty</span>
                                                                                <Input value={qty[it.id] ?? ""} onChange={(e) => setQty((qq) => ({ ...qq, [it.id]: e.target.value }))} className="h-9 w-16 text-center" placeholder="1" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </section>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : selectedCount === 0 ? (
                                /* No list yet — prompt to start selecting. */
                                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                                    <ListChecks size={26} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-sm font-medium text-slate-600">No inventory selected for {driverName(driver)} yet</p>
                                    <p className="text-xs text-slate-500 mt-1">Pick keys, devices, cards or equipment to build this driver's list.</p>
                                    <Button size="sm" className="mt-3" onClick={() => setAddMode(true)}><Plus className="h-4 w-4" /> Select from inventory</Button>
                                </div>
                            ) : (
                                /* The driver's list — only the items chosen for them. */
                                <>
                                    <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900"><ListChecks className="h-4 w-4 text-amber-500" /> {selectedCount} item{selectedCount === 1 ? "" : "s"} in {driverName(driver)}'s list</span>
                                        {handedOver
                                            ? <span className="text-[11px] text-slate-400">Handed over — re-open to change, or use Driver Inventory to add.</span>
                                            : <Button variant="outline" size="sm" onClick={() => setAddMode(true)}><Plus className="h-4 w-4" /> Add more</Button>}
                                    </div>
                                    <div className="space-y-3">
                                        {listGrouped.map((g) => {
                                            const visual = CAT_VISUAL[g.id] ?? DEFAULT_VISUAL;
                                            const Icon = visual.icon;
                                            return (
                                                <section key={g.id} className="border border-slate-200 rounded-xl overflow-hidden relative">
                                                    <div className={cn("absolute left-0 top-0 bottom-0 w-1", visual.bar)} />
                                                    <div className="flex items-center gap-3 pl-5 pr-4 py-3 border-b border-slate-100">
                                                        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ring-1 ring-black/5", visual.bg, visual.text)}>
                                                            <Icon size={16} />
                                                        </div>
                                                        <h3 className="text-sm font-bold text-slate-900">{g.name}</h3>
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">{g.lines.length}</span>
                                                    </div>
                                                    <div className="divide-y divide-slate-100">
                                                        {g.lines.map(({ item }) => {
                                                            const vendor = VENDORS.find((v) => v.id === item.vendorId);
                                                            return (
                                                                <div key={item.id} className="flex items-center gap-3 px-5 py-2.5">
                                                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-emerald-500 bg-emerald-500 text-white"><Check size={13} /></span>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="text-sm font-semibold text-slate-900 truncate">{vendor?.name ?? "—"}</div>
                                                                        <div className="text-[11px] text-slate-500 font-mono truncate">{item.serial}{item.pin ? ` · PIN ${item.pin}` : ""}</div>
                                                                    </div>
                                                                    <div className="hidden md:flex items-center gap-1.5 shrink-0 text-xs text-slate-500">
                                                                        <Truck size={13} className="text-slate-400" />
                                                                        <span className="truncate max-w-[180px]">{assetLabel(item, accountId)}</span>
                                                                    </div>
                                                                    <div className="flex shrink-0 items-center gap-1.5">
                                                                        <span className="text-[11px] font-medium text-slate-400">Qty</span>
                                                                        <Input value={qty[item.id] ?? ""} onChange={(e) => setQty((qq) => ({ ...qq, [item.id]: e.target.value }))} disabled={handedOver} className="h-9 w-16 text-center disabled:bg-slate-50 disabled:text-slate-400" placeholder="1" />
                                                                    </div>
                                                                    {!handedOver && (
                                                                        <button type="button" onClick={() => removeItem(item.id)} title="Remove" aria-label="Remove" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200">
                                                                            <X size={14} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </section>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            {/* Assign someone to hand it over */}
                            <div className="border-t border-slate-100 pt-4">
                                <h3 className="text-sm font-bold text-slate-900">Assign someone to hand it over</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Who physically hands these items to the driver, and who's issuing them.</p>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Issued by (staff name)</span>
                                    <Input value={issued.name} onChange={(e) => setIss({ name: e.target.value })} placeholder="Full name" />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Title / role</span>
                                    <Input value={issued.title} onChange={(e) => setIss({ title: e.target.value })} placeholder="e.g. Fleet Manager" />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Vehicle / Unit #</span>
                                    <Input value={issued.vehicle} onChange={(e) => setIss({ vehicle: e.target.value })} placeholder="e.g. 1042" />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Employee ID</span>
                                    <Input value={issued.employeeId} onChange={(e) => setIss({ employeeId: e.target.value })} placeholder="e.g. EMP-2031" />
                                </label>
                            </div>

                            {/* Assign the hand-over task to a staff member */}
                            <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600"><UserCheck className="h-4 w-4" /></span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-800">Assign hand-over to</p>
                                        <p className="text-xs text-slate-500">Who will physically hand these items to the driver.</p>
                                    </div>
                                </div>
                                <div className="relative w-full sm:w-64">
                                    <select
                                        value={assignee.id}
                                        onChange={(e) => {
                                            const u = staff.find((s) => s.id === e.target.value);
                                            setAssignee({ id: e.target.value, name: u?.name ?? "" });
                                            // Auto-populate step 2 from the selected staff member.
                                            if (u) setIssued((s) => ({ ...s, name: u.name, title: u.title || s.title }));
                                        }}
                                        className="w-full h-10 pl-3 pr-8 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 appearance-none"
                                    >
                                        <option value="">Unassigned</option>
                                        {staff.map((u) => <option key={u.id} value={u.id}>{u.name}{u.title ? ` · ${u.title}` : ""}</option>)}
                                    </select>
                                    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Assign to hand-over */}
                            {handedOver ? (
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                                    <p className="inline-flex items-center gap-2 text-sm text-emerald-800">
                                        <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                                        Handed over{assignee.name ? <> · assigned to <span className="font-semibold">{assignee.name}</span></> : ""}
                                    </p>
                                    <button type="button" onClick={reopenHandover} className="text-xs font-semibold text-slate-500 underline hover:text-slate-700">Re-open</button>
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                                    <p className="text-sm text-slate-600">{canAssign ? "Assign the hand-over to record it and unlock the driver's verification." : "Select at least one item and choose who will hand it over."}</p>
                                    <Button size="sm" disabled={!canAssign} onClick={() => setAssignOpen(true)}><UserCheck className="h-4 w-4" /> Assign to hand-over</Button>
                                </div>
                            )}
                    </div>
                </section>

                {/* Driver verification */}
                <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><UserCheck className="h-5 w-5" /></span>
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Driver verification</h2>
                                <p className="text-xs text-slate-500">The driver confirms they received the same items, then signs.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {handedOver && !driverSignoff.done && (
                                <button type="button" onClick={skipVerification} className="text-xs font-semibold text-slate-500 underline hover:text-blue-600">Skip verification</button>
                            )}
                            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", driverSignoff.done ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500")}>
                                {driverSignoff.done ? <CircleCheck size={13} /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />}
                                {driverSignoff.done ? `Verified · ${verifiedCount}/${selectedCount}` : "Awaiting driver"}
                            </span>
                        </div>
                    </div>

                    {!handedOver ? (
                        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 p-8 text-center">
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><UserCheck className="h-5 w-5" /></span>
                            <div>
                                <p className="text-sm font-medium text-slate-600">Assign the hand-over first</p>
                                <p className="text-xs text-slate-500 mt-1">Once the items are assigned &amp; handed over, you can verify them with the driver.</p>
                            </div>
                            <Button size="sm" disabled variant="outline"><UserCheck className="h-4 w-4" /> Verify from driver</Button>
                        </div>
                    ) : (!verifyOpen && !driverSignoff.done) ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600"><UserCheck className="h-4 w-4" /></span>
                                <p className="text-sm text-slate-600"><span className="font-semibold text-slate-900">{selectedCount}</span> item{selectedCount === 1 ? "" : "s"} handed over — ready for {driverName(driver)} to confirm receipt.</p>
                            </div>
                            <Button size="sm" onClick={() => setVerifySendOpen(true)}><UserCheck className="h-4 w-4" /> Verify from driver</Button>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-900">Items to confirm</span>
                                <div className="flex items-center gap-3">
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{verifiedCount} / {selectedCount} received</span>
                                    <button type="button" onClick={() => {
                                        const allOn = verifiedCount === selectedCount;
                                        setVerified(allOn ? {} : Object.fromEntries(selectedLines.map(({ item }) => [item.id, true])));
                                    }} className="text-xs font-semibold text-blue-600 hover:underline">
                                        {verifiedCount === selectedCount ? "Clear all" : "Confirm all"}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {selectedLines.map(({ item, qty }) => {
                                    const vendor = VENDORS.find((v) => v.id === item.vendorId);
                                    const on = !!verified[item.id];
                                    return (
                                        <button key={item.id} type="button" onClick={driverSignoff.done ? undefined : () => setVerified((v) => ({ ...v, [item.id]: !v[item.id] }))}
                                            className={cn("flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left transition", on ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white hover:border-slate-300", driverSignoff.done && "cursor-default")}>
                                            <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition", on ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300")}>
                                                {on && <Check size={13} />}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-semibold text-slate-900 truncate">{vendor?.name ?? "—"}</div>
                                                <div className="text-[11px] text-slate-500 font-mono truncate">{item.serial}{item.pin ? ` · PIN ${item.pin}` : ""}</div>
                                            </div>
                                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Qty {qty}</span>
                                            {driverSignoff.done && on && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0"><CircleCheck size={11} /> Received</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            <ReviewSignOff
                                heading="I confirm I received the items above."
                                value={driverSignoff}
                                onChange={setDriverSignoff}
                                kicker="Driver Acknowledgement"
                                subtext="By signing you acknowledge you received the accessories listed above. Your name, date and signature are recorded on file."
                                nameLabel="Driver name"
                                buttonLabel="Confirm receipt & sign"
                                signedLabel="Received & signed"
                                signedByLabel="Received by"
                            />
                        </>
                    )}
                </section>
            </div>

            {/* Sticky action bar — stays within the content column (not under the sidebar) */}
            <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur px-6 py-3 lg:px-8">
                <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
                    <p className="text-sm text-slate-600">
                        <span className="font-semibold text-slate-900">{selectedCount}</span> item{selectedCount === 1 ? "" : "s"} · <span className="font-semibold text-slate-900">{verifiedCount}</span> verified for <span className="font-semibold text-slate-900">{driverName(driver)}</span>
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={onPdf}><FileText className="h-4 w-4" /> PDF view</Button>
                        <Button size="sm" onClick={onSave}><Save className="h-4 w-4" /> Save hand-over</Button>
                    </div>
                </div>
            </div>

            {assignOpen && (
                <HandoverSendDialog
                    title="Assign hand-over"
                    subtitle={`Send the checklist to ${assignee.name || "the assignee"} to hand over & sign.`}
                    summary={<>Handing over <span className="font-semibold text-slate-800">{selectedCount} item{selectedCount === 1 ? "" : "s"}</span> from <span className="font-semibold text-slate-800">“{checklistName || "Standard driver kit"}”</span> to <span className="font-semibold text-slate-800">{driverName(driver)}</span>.</>}
                    recipientLabel="Recipient email"
                    recipientName={assignee.name}
                    recipientEmail={assigneeEmail}
                    subjectDefault={`Hand over "${checklistName || "Standard driver kit"}" to ${driverName(driver)}`}
                    messageDefault={`Hi ${assignee.name || "there"},\n\nPlease hand over the ${selectedCount} item${selectedCount === 1 ? "" : "s"} in "${checklistName || "Standard driver kit"}" to ${driverName(driver)}, then open the secure link below to confirm and sign the hand-over.`}
                    formLink={formLink}
                    linkLabel="Hand-over form link"
                    linkHint="The assignee opens this secure link to tick the items handed over and sign."
                    sendLabel="Send link & assign"
                    onClose={() => setAssignOpen(false)}
                    onViewForm={() => onViewForm("handover")}
                    onSend={() => { assignHandover(); setAssignOpen(false); }}
                />
            )}

            {verifySendOpen && (
                <HandoverSendDialog
                    title="Verify from driver"
                    subtitle={`Send the checklist to ${driverName(driver)} to confirm & sign what they received.`}
                    summary={<>Ask <span className="font-semibold text-slate-800">{driverName(driver)}</span> to confirm the <span className="font-semibold text-slate-800">{selectedCount} item{selectedCount === 1 ? "" : "s"}</span> from <span className="font-semibold text-slate-800">“{checklistName || "Standard driver kit"}”</span> they received.</>}
                    recipientLabel="Driver email"
                    recipientName={driverName(driver)}
                    recipientEmail={driverEmail}
                    subjectDefault={`Confirm you received your hand-over items — ${checklistName || "Standard driver kit"}`}
                    messageDefault={`Hi ${driverName(driver)},\n\nPlease review the ${selectedCount} item${selectedCount === 1 ? "" : "s"} you were issued, tick each one you received, then sign to confirm using the secure link below.`}
                    formLink={verifyLink}
                    linkLabel="Driver verification link"
                    linkHint="The driver opens this secure link to tick the items they received and sign."
                    sendLabel="Send link to driver"
                    onClose={() => setVerifySendOpen(false)}
                    onViewForm={() => onViewForm("driver")}
                    onSend={() => { setVerifyOpen(true); setVerifySendOpen(false); }}
                />
            )}
        </div>
    );
}

// Send dialog — shared by "Assign to hand-over" (send to staff) and "Verify from
// driver" (send to driver). Shows the recipient email + the secure form link
// with View / Copy, and a send action. Sending runs onSend.
function HandoverSendDialog({
    title, subtitle, summary, recipientLabel, recipientName, recipientEmail,
    subjectDefault, messageDefault, formLink, linkLabel, linkHint, sendLabel,
    onClose, onViewForm, onSend,
}: {
    title: string;
    subtitle: string;
    summary: React.ReactNode;
    recipientLabel: string;
    recipientName: string;
    recipientEmail: string;
    subjectDefault: string;
    messageDefault: string;
    formLink: string;
    linkLabel: string;
    linkHint: string;
    sendLabel: string;
    onClose: () => void;
    onViewForm: () => void;
    onSend: () => void;
}) {
    const [to, setTo] = useState(recipientEmail);
    const [subject, setSubject] = useState(subjectDefault);
    const [message, setMessage] = useState(messageDefault);
    const [copied, setCopied] = useState(false);

    const copyLink = () => {
        try { navigator.clipboard?.writeText(formLink); setCopied(true); } catch { /* ignore */ }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><UserCheck className="h-5 w-5" /></span>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">{title}</h3>
                            <p className="text-xs text-slate-500">{subtitle}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
                </div>

                <div className="max-h-[65vh] space-y-4 overflow-y-auto px-5 py-4">
                    <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-[13px] text-slate-600">{summary}</div>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Send via</label>
                        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            <Mail className="h-4 w-4 text-slate-400" /> Email
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">{recipientLabel}{recipientName ? ` · ${recipientName}` : ""}</label>
                        <Input className="mt-1.5" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@company.com" />
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Subject</label>
                        <Input className="mt-1.5" value={subject} onChange={(e) => setSubject(e.target.value)} />
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Message</label>
                        <textarea className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">{linkLabel}</label>
                        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-600">{formLink}</span>
                            <button type="button" onClick={onViewForm} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-600">
                                <Eye size={12} /> View
                            </button>
                            <button type="button" onClick={copyLink} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-600">
                                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                            </button>
                        </div>
                        <p className="mt-1.5 text-[11px] text-slate-400">{linkHint} Use <span className="font-semibold text-slate-500">View</span> to preview the form they'll receive.</p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
                    <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                    <Button size="sm" disabled={!to.trim() || !subject.trim()} onClick={onSend}><Send className="h-4 w-4" /> {sendLabel}</Button>
                </div>
            </div>
        </div>
    );
}

// ── Recipient hand-over form (what the assignee opens from the link) ─────────
// An interactive fill-out form: tick each item as it's handed over, then sign.
// Has its own "PDF view" button. Local state only — this is a preview of the
// form the assigned staff member receives via the secure link.
function HandoverLinkForm({
    driver, variant, checklistName, selectedLines, issued, assigneeName, onBack, onPdf,
}: {
    driver: any;
    variant: "handover" | "driver";
    checklistName: string;
    selectedLines: { item: InventoryItem; qty: string }[];
    issued: IssuedBy;
    assigneeName: string;
    onBack: () => void;
    onPdf: () => void;
}) {
    const isDriver = variant === "driver";
    const copy = isDriver
        ? {
            kicker: "Driver Verification Form", verb: "received", verbAdj: "received",
            info: "Tick each item you received to confirm it matches what was handed over, then sign below.",
            itemsHeading: "Items received", chip: "received",
            signHeading: "I confirm I received the items above.",
            signKicker: "Driver Acknowledgement",
            signSubtext: "By signing you acknowledge you received the accessories listed above. Your name, date and signature are recorded on file.",
            signName: "Driver name", signBtn: "Confirm receipt & sign", signedLabel: "Received & signed", signedBy: "Received by",
        }
        : {
            kicker: "Accessory Hand-Over Form", verb: "handed over", verbAdj: "handed over",
            info: "Tick each item as you hand it to the driver, then sign below to confirm the hand-over.",
            itemsHeading: "Items handed over", chip: "handed over",
            signHeading: "I confirm the items above were handed over.",
            signKicker: "Hand-Over Sign-Off",
            signSubtext: "Confirm the accessories above were issued to the driver. Your name, title, date and signature are recorded on file.",
            signName: "Handed over by", signBtn: "Confirm hand-over & sign", signedLabel: "Handed over & signed", signedBy: "Handed over by",
        };
    const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
    const [sign, setSign] = useState<SignOffData>(() => isDriver
        ? { ...newSignOff(), name: driverName(driver), role: "Driver" }
        : { ...newSignOff(), name: assigneeName || issued.name, role: issued.title || "Fleet Manager" });

    const grouped = useMemo(() => {
        const map = new Map<string, { id: string; name: string; lines: { item: InventoryItem; qty: string }[] }>();
        for (const catId of HANDOVER_CATEGORIES) {
            const cat = VENDOR_CATEGORIES.find((c) => c.id === catId);
            if (cat) map.set(catId, { id: catId, name: cat.name, lines: [] });
        }
        for (const line of selectedLines) {
            const vendor = VENDORS.find((v) => v.id === line.item.vendorId);
            if (vendor && map.has(vendor.categoryId)) map.get(vendor.categoryId)!.lines.push(line);
        }
        return Array.from(map.values()).filter((g) => g.lines.length > 0);
    }, [selectedLines]);

    const total = selectedLines.length;
    const doneCount = selectedLines.filter(({ item }) => confirmed[item.id]).length;
    const pct = total ? Math.round((doneCount / total) * 100) : 0;
    const allOn = total > 0 && doneCount === total;
    const toggleAll = () => setConfirmed(allOn ? {} : Object.fromEntries(selectedLines.map(({ item }) => [item.id, true])));

    const Detail = ({ label, value }: { label: string; value: string }) => (
        <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800">{value || "—"}</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top bar */}
            <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
                    <ChevronLeft className="h-4 w-4" /> Hand-over
                </button>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{doneCount}/{total} {copy.chip}</span>
                    <Button variant="outline" size="sm" onClick={onPdf}><FileText className="h-4 w-4" /> PDF view</Button>
                </div>
            </div>

            <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
                {/* Header */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><ListChecks className="h-6 w-6" /></span>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">{copy.kicker}</p>
                            <h1 className="text-xl font-bold text-slate-900">{checklistName || "Driver hand-over"}</h1>
                            <p className="mt-0.5 text-sm text-slate-500">
                                For <span className="font-semibold text-slate-700">{driverName(driver)}</span>
                                {assigneeName ? <> · handed over by <span className="font-semibold text-slate-700">{assigneeName}</span></> : ""}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Info banner */}
                <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check className="h-4 w-4" /></span>
                    <p className="text-sm text-slate-600">{copy.info}</p>
                </div>

                {/* Recipient details */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="mb-4 border-b border-slate-100 pb-3 text-base font-bold text-slate-900">Recipient</p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Detail label="Driver name" value={driverName(driver)} />
                        <Detail label="License #" value={driver.licenseNumber ?? ""} />
                        <Detail label="Employee ID" value={issued.employeeId} />
                        <Detail label="Vehicle / Unit #" value={issued.vehicle} />
                        <Detail label="Issued by" value={issued.name} />
                        <Detail label="Date" value={issued.date} />
                    </div>
                </div>

                {/* Items */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-base font-bold text-slate-900">{copy.itemsHeading}</h2>
                        <div className="flex items-center gap-3">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{doneCount} / {total} {copy.chip}</span>
                            <button type="button" onClick={toggleAll} className="text-xs font-semibold text-blue-600 hover:underline">{allOn ? "Clear all" : "Confirm all"}</button>
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
                        <span className="text-[11px] font-semibold text-slate-400">{pct}%</span>
                    </div>

                    <div className="mt-5 space-y-5">
                        {grouped.map((g) => (
                            <div key={g.id}>
                                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{g.name}</p>
                                <div className="space-y-2">
                                    {g.lines.map(({ item, qty }) => {
                                        const vendor = VENDORS.find((v) => v.id === item.vendorId);
                                        const on = !!confirmed[item.id];
                                        return (
                                            <button key={item.id} type="button" onClick={() => setConfirmed((c) => ({ ...c, [item.id]: !c[item.id] }))}
                                                className={cn("flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left transition", on ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white hover:border-slate-300")}>
                                                <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition", on ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300")}>
                                                    {on && <Check size={13} />}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-semibold text-slate-900 truncate">{vendor?.name ?? "—"}</div>
                                                    <div className="text-[11px] text-slate-500 font-mono truncate">{item.serial}{item.pin ? ` · PIN ${item.pin}` : ""}</div>
                                                </div>
                                                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Qty {qty}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sign-off */}
                <ReviewSignOff
                    heading={copy.signHeading}
                    value={sign}
                    onChange={setSign}
                    kicker={copy.signKicker}
                    subtext={copy.signSubtext}
                    nameLabel={copy.signName}
                    buttonLabel={copy.signBtn}
                    signedLabel={copy.signedLabel}
                    signedByLabel={copy.signedBy}
                />

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                    <Button variant="outline" onClick={onPdf}><FileText className="h-4 w-4" /> PDF view</Button>
                </div>
            </div>
        </div>
    );
}

// ── Branded PDF view (per driver) ────────────────────────────────────────────
function HandoverPdf({
    driver, accountName, checklistName, selectedLines, issued, assigneeName, staffSignoff, driverSignoff, verified, onBack,
}: {
    driver: any;
    accountName?: string;
    checklistName: string;
    selectedLines: { item: InventoryItem; qty: string }[];
    issued: IssuedBy;
    assigneeName?: string;
    staffSignoff: SignOffData;
    driverSignoff: SignOffData;
    verified: Record<string, boolean>;
    onBack: () => void;
}) {
    const [branding] = useCompanyBranding();
    const [theme, setTheme] = useState<ThemeKey>("standard");
    const [downloading, setDownloading] = useState(false);
    const docRef = useRef<HTMLDivElement>(null);

    // Group the selected items by category for the "Items Handed Over" tables.
    const cats = HANDOVER_CATEGORIES
        .map((catId) => {
            const cat = VENDOR_CATEGORIES.find((c) => c.id === catId);
            const lines = selectedLines.filter(({ item }) => {
                const vendor = VENDORS.find((v) => v.id === item.vendorId);
                return vendor?.categoryId === catId;
            });
            return { name: cat?.name ?? "Accessories", lines };
        })
        .filter((c) => c.lines.length > 0);

    const sections: DocSection[] = [
        { title: "Recipient", groups: [{ rows: [
            { label: "Driver name", value: driverName(driver) },
            { label: "License #", value: driver.licenseNumber ?? "" },
            { label: "Employee ID", value: issued.employeeId },
            { label: "Vehicle / Unit #", value: issued.vehicle },
            { label: "Handed over by", value: assigneeName || issued.name },
            { label: "Date", value: issued.date },
        ] }] },
        {
            title: "Items Handed Over",
            groups: cats.length > 0 ? cats.map((c) => ({
                label: c.name,
                table: {
                    headers: ["Item", "Serial / PIN", "Qty", "Received"],
                    rows: c.lines.map(({ item, qty }) => {
                        const vendor = VENDORS.find((v) => v.id === item.vendorId);
                        return [vendor?.name ?? "—", item.serial + (item.pin ? ` · PIN ${item.pin}` : ""), qty, verified[item.id] ? "☑" : "☐"];
                    }),
                },
            })) : [{ rows: [{ label: "No items selected", value: "" }] }],
        },
        { title: "Sign-Off", groups: [
            { label: "Issued by (staff)", rows: [
                { label: "Name", value: staffSignoff.done ? staffSignoff.name : issued.name },
                { label: "Title / role", value: staffSignoff.done ? staffSignoff.role : issued.title },
                { label: "Date", value: staffSignoff.done ? staffSignoff.date : issued.date },
                { label: "Signature", value: staffSignoff.done && staffSignoff.sig ? "Signed" : "" },
            ] },
            { label: "Received by (driver)", rows: [
                { label: "Name", value: driverSignoff.done ? driverSignoff.name : driverName(driver) },
                { label: "Date", value: driverSignoff.done ? driverSignoff.date : "" },
                { label: "Signature", value: driverSignoff.done && driverSignoff.sig ? "Signed" : "" },
            ] },
        ] },
    ];

    const downloadPdf = async () => {
        const el = docRef.current;
        if (!el) return;
        setDownloading(true);
        try {
            const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
            const pdf = new jsPDF({ unit: "pt", format: "a4" });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const imgH = (canvas.height * pageW) / canvas.width;
            let heightLeft = imgH, position = 0;
            const img = canvas.toDataURL("image/png");
            pdf.addImage(img, "PNG", 0, position, pageW, imgH);
            heightLeft -= pageH;
            while (heightLeft > 0) { position -= pageH; pdf.addPage(); pdf.addImage(img, "PNG", 0, position, pageW, imgH); heightLeft -= pageH; }
            pdf.save(`driver-hand-over-${driverName(driver).replace(/\s+/g, "-").toLowerCase()}.pdf`);
        } finally { setDownloading(false); }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <style>{`@media print {
                body * { visibility: hidden !important; }
                #app-doc, #app-doc * { visibility: visible !important; }
                #app-doc { position: absolute !important; left: 0; top: 0; width: 100%; box-shadow: none !important; }
                .no-print { display: none !important; }
            }`}</style>

            <div className="no-print sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
                    <ChevronLeft className="h-4 w-4" /> Hand-over form
                </button>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                        {THEMES.map((t) => (
                            <button key={t.key} type="button" onClick={() => setTheme(t.key)} className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition", theme === t.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white")}>{t.name}</button>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
                    <Button size="sm" onClick={downloadPdf} disabled={downloading}><Download className="h-4 w-4" /> {downloading ? "Generating…" : "Download PDF"}</Button>
                </div>
            </div>

            <div className="px-6 py-8">
                <FormDocument
                    ref={docRef}
                    title={checklistName?.trim() || "Driver Accessory Hand-Over"}
                    subtitle={`${accountName ?? CARRIER_NAME} — driver hand-over checklist`}
                    badge="Hand-Over"
                    sections={sections}
                    theme={theme}
                    branding={branding}
                />
            </div>
        </div>
    );
}
