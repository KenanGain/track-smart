// ─────────────────────────────────────────────────────────────────────────────
// ServiceTypesPanel — the maintenance catalog: every service that can be put on a
// service interval or a work order, with its class and what it is related to.
//
// It lived on the Settings page alone, which is where you go to CONFIGURE it and
// nowhere near where you USE it: scheduling a service meant leaving the Maintenance
// page to look up what the catalog calls a thing. So the list is a component, and the
// two places that need it show the same one, over the same live store — edit it in
// either and the other, plus every work-order and interval picker, sees it at once.
//
// The list is built from the same pieces as the Inventory list (`CatalogTable`): KPI
// tiles, a class strip with counts, a search row, ruled columns, one pager.
//
// The host owns the Add button, because on both pages it belongs in the page header
// rather than inside the table. It opens this panel’s dialog through the ref handle.
// ─────────────────────────────────────────────────────────────────────────────

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { Pencil, Trash2, Truck, Car, Layers, Wrench, Search, Share2 } from "lucide-react";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { ShareToChat } from "@/components/share/ShareToChat";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { TH, TD, COL_RULE, CatalogTabs, RowIcon, EmptyRow } from "@/components/ui/CatalogTable";
import { KpiTile } from "@/pages/inventory/InventoryKpi";
import { TablePager } from "@/pages/inventory/TablePager";
import { useServiceTypes, serviceTypesStore } from "@/data/serviceTypesStore";
import { SERVICE_GROUPS } from "@/pages/assets/maintenance.data";
import {
    type ServiceType, type ServiceCategory,
    CATEGORY_LABELS, applicabilityTicks, categoryFromTicks,
} from "@/types/service-types";
import { cn } from "@/lib/utils";

/** @deprecated The classes records actually use are `SERVICE_GROUPS`. */
export const MAINTENANCE_CLASSES: readonly string[] = SERVICE_GROUPS;

/** What a host can ask the panel to do — i.e. open its own Add dialog. */
export type ServiceTypesPanelHandle = { openAdd: () => void };

/** The app’s standard field input. */
const INPUT = "h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30";

const Required = () => (
    <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-600">Required</span>
);

function Field({ label, required, hint, children }: {
    label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</label>
                {required && <Required />}
            </div>
            {children}
            {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
        </div>
    );
}

const iconFor = (c: ServiceCategory) => (c === "cmv_only" ? Truck : c === "non_cmv_only" ? Car : Layers);

/** What a service is related to, said the same way in the table and the tiles. */
function RelatedTo({ category }: { category: ServiceCategory }) {
    const Icon = iconFor(category);
    return (
        <span className="inline-flex items-center gap-2 text-sm text-slate-600">
            <Icon className="h-4 w-4 shrink-0 text-slate-400" />
            {CATEGORY_LABELS[category]}
        </span>
    );
}

export const ServiceTypesPanel = forwardRef<ServiceTypesPanelHandle>(function ServiceTypesPanel(_props, ref) {
    // Service Types — live store. Add/update/delete dispatch through serviceTypesStore so
    // CreateScheduleForm, CreateOrderModal and AssetMaintenancePage all see the change
    // immediately.
    const serviceTypes = useServiceTypes();

    const [search, setSearch] = useState("");
    const [activeClass, setActiveClass] = useState<string>("All");
    const [related, setRelated] = useState<ServiceCategory | "all">("all");
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(15);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingService, setEditingService] = useState<ServiceType | null>(null);
    const [formData, setFormData] = useState<Partial<ServiceType>>({
        name: "",
        category: "both_cmv_and_non_cmv",
        group: "Engine",
        description: "",
    });
    const [toDelete, setToDelete] = useState<ServiceType | null>(null);
    const [sharing, setSharing] = useState<ServiceType | null>(null);

    const counts = useMemo(() => ({
        total: serviceTypes.length,
        truck: serviceTypes.filter((t) => t.category === "cmv_only").length,
        trailer: serviceTypes.filter((t) => t.category === "non_cmv_only").length,
        both: serviceTypes.filter((t) => t.category === "both_cmv_and_non_cmv").length,
    }), [serviceTypes]);

    // Only classes that hold something — an empty tab is a dead end you can click.
    const tabs = useMemo(() => {
        const byClass = new Map<string, number>();
        for (const t of serviceTypes) byClass.set(t.group, (byClass.get(t.group) ?? 0) + 1);
        return [
            { id: "All", label: "All", count: serviceTypes.length },
            ...[...byClass.entries()]
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([group, count]) => ({ id: group, label: group, count })),
        ];
    }, [serviceTypes]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return serviceTypes.filter((t) => {
            if (activeClass !== "All" && t.group !== activeClass) return false;
            if (related !== "all" && t.category !== related) return false;
            if (!q) return true;
            return t.name.toLowerCase().includes(q)
                || t.group.toLowerCase().includes(q)
                || (t.description ?? "").toLowerCase().includes(q);
        });
    }, [serviceTypes, search, activeClass, related]);

    // Narrowing the list must not strand you on a page that no longer exists.
    useEffect(() => { setPage(0); }, [search, activeClass, related]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
    const safePage = Math.min(page, pageCount - 1);
    const paged = filtered.slice(safePage * perPage, safePage * perPage + perPage);

    const filtering = search.trim() !== "" || activeClass !== "All" || related !== "all";
    const clear = () => { setSearch(""); setActiveClass("All"); setRelated("all"); };

    const openDialog = (service?: ServiceType) => {
        setEditingService(service ?? null);
        setFormData(service
            ? { name: service.name, category: service.category, group: service.group, description: service.description }
            : { name: "", category: "both_cmv_and_non_cmv", group: "Engine", description: "" });
        setIsDialogOpen(true);
    };

    useImperativeHandle(ref, () => ({ openAdd: () => openDialog() }));

    // A service that applies to nothing, or has no name, is not a service — so the button
    // that would save it is disabled rather than the save failing with no explanation.
    const canSave = !!formData.name?.trim() && !!formData.group && !!formData.category;

    const handleSave = () => {
        if (!canSave) return;
        const fields = {
            name: formData.name!.trim(),
            category: formData.category as ServiceCategory,
            group: formData.group!,
            description: formData.description?.trim() || "",
        };
        if (editingService) serviceTypesStore.update({ ...editingService, ...fields });
        else serviceTypesStore.add({ id: crypto.randomUUID(), ...fields });
        setIsDialogOpen(false);
    };

    const ticks = formData.category
        ? applicabilityTicks(formData.category as ServiceCategory)
        : { truck: false, trailer: false };

    return (
        <div className="space-y-5">
            {/* The figures, and the filter for each of them. */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiTile label="Total Types" value={counts.total} Icon={Wrench} accent="blue"
                    onClick={() => setRelated("all")} active={related === "all"} />
                <KpiTile label="Trucks" value={counts.truck} Icon={Truck} accent="violet"
                    onClick={() => setRelated("cmv_only")} active={related === "cmv_only"} />
                <KpiTile label="Trailers" value={counts.trailer} Icon={Car} accent="amber"
                    onClick={() => setRelated("non_cmv_only")} active={related === "non_cmv_only"} />
                <KpiTile label="Both" value={counts.both} Icon={Layers} accent="emerald"
                    onClick={() => setRelated("both_cmv_and_non_cmv")} active={related === "both_cmv_and_non_cmv"} />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <CatalogTabs ariaLabel="Maintenance classes" tabs={tabs} active={activeClass} onChange={setActiveClass} />

                <div className="flex flex-wrap items-center gap-2 px-5 py-3">
                    <div className="relative min-w-[190px] max-w-xs flex-1">
                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search service, class or description…"
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    {filtering && (
                        <button
                            type="button"
                            onClick={clear}
                            className="ml-auto inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                        >
                            Reset
                        </button>
                    )}
                </div>

                <div className="border-t border-slate-100">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <TH>Maintenance Type</TH>
                                    <TH className={COL_RULE}>Maintenance Class</TH>
                                    <TH className={COL_RULE}>Related To</TH>
                                    <TH className={cn("w-px text-right", COL_RULE)}>Actions</TH>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paged.length === 0 && (
                                    <EmptyRow
                                        colSpan={4}
                                        Icon={Wrench}
                                        title="No service types match your filters"
                                        hint={search.trim()
                                            ? <>Nothing matches <span className="font-semibold text-slate-600">{search.trim()}</span> in this view.</>
                                            : "Try another class, or show them all."}
                                        onClear={filtering ? clear : undefined}
                                    />
                                )}
                                {paged.map((service) => (
                                    <tr key={service.id} className="transition-colors hover:bg-slate-50/60">
                                        <TD>
                                            <div className="flex items-center gap-3">
                                                <RowIcon Icon={iconFor(service.category)} tone="blue" />
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-slate-900">{service.name}</div>
                                                    {service.description && (
                                                        <p className="line-clamp-1 max-w-xl text-xs text-slate-500">{service.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </TD>
                                        <TD className={COL_RULE}>
                                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                                {service.group}
                                            </span>
                                        </TD>
                                        <TD className={COL_RULE}><RelatedTo category={service.category} /></TD>
                                        <TD className={COL_RULE}>
                                            {/* One menu, the same three verbs every record in the app
                                                offers: pass it on, change it, remove it. */}
                                            <div className="flex items-center justify-end">
                                                <KebabMenu
                                                    title={`Actions for ${service.name}`}
                                                    items={[
                                                        { label: "Share to chat", icon: Share2, onClick: () => setSharing(service) },
                                                        { label: "Edit", icon: Pencil, onClick: () => openDialog(service) },
                                                        { label: "Delete", icon: Trash2, danger: true, onClick: () => setToDelete(service) },
                                                    ]}
                                                />
                                            </div>
                                        </TD>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <TablePager
                        page={safePage}
                        perPage={perPage}
                        total={filtered.length}
                        label="service types"
                        onPage={setPage}
                        onPerPage={(n) => { setPerPage(n); setPage(0); }}
                    />
                </div>
            </div>

            {sharing && (
                <ShareToChat
                    open
                    onClose={() => setSharing(null)}
                    title={`Share ${sharing.name}`}
                    subtitle="A service from the maintenance catalog, in a chat or by email"
                    source={{ type: "manual", id: sharing.id, label: sharing.name }}
                    items={[
                        { name: sharing.name, group: sharing.group },
                        { name: CATEGORY_LABELS[sharing.category], group: "Related to" },
                        ...(sharing.description ? [{ name: sharing.description, group: "Description" }] : []),
                    ]}
                    defaultChannel="in-app"
                    defaultSubject={`${sharing.name} — service type`}
                />
            )}

            {/* ── The form ─────────────────────────────────────────────────────── */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle>{editingService ? "Edit service type" : "Add service type"}</DialogTitle>
                        <DialogDescription>
                            {editingService
                                ? "This is the catalog every interval and work order picks from — a change here shows up in all of them."
                                : "One entry in the catalog every service interval and work order picks from."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <Field label="Maintenance class" required>
                            <select
                                value={formData.group}
                                onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                                className={cn(INPUT, "cursor-pointer")}
                            >
                                {SERVICE_GROUPS.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </Field>

                        <Field label="Maintenance type" required>
                            <input
                                type="text"
                                value={formData.name ?? ""}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Brake Inspection"
                                className={INPUT}
                                autoFocus
                            />
                        </Field>

                        {/* Related to — two ticks, not three options. A service either relates
                            to trucks, or to trailers, or to both, and "both" is what having both
                            ticked already means; offering it a third time as its own choice let
                            the list and the ticks disagree. */}
                        <Field label="Related to" required hint="Which kind of asset this service belongs to. Tick both when it applies to the whole fleet.">
                            <div className="grid grid-cols-2 gap-2">
                                {([
                                    ["truck", "Trucks", Truck],
                                    ["trailer", "Trailers", Car],
                                ] as const).map(([which, label, Icon]) => {
                                    const on = which === "truck" ? ticks.truck : ticks.trailer;
                                    return (
                                        <label
                                            key={which}
                                            className={cn(
                                                "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                                                on ? "border-blue-500 bg-blue-50/60 text-slate-900" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                                            )}
                                        >
                                            <Checkbox
                                                checked={on}
                                                onCheckedChange={(next) => {
                                                    const t = which === "truck" ? next : ticks.truck;
                                                    const r = which === "trailer" ? next : ticks.trailer;
                                                    setFormData({ ...formData, category: categoryFromTicks(t, r) });
                                                }}
                                            />
                                            <Icon size={15} className={on ? "text-blue-600" : "text-slate-400"} />
                                            <span className="font-medium">{label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                            {!formData.category && (
                                <p className="text-[11px] font-medium text-red-600">Pick at least one — a service has to relate to something.</p>
                            )}
                        </Field>

                        <Field label="Description">
                            <textarea
                                rows={3}
                                value={formData.description ?? ""}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="What the service covers, in a line."
                                className={cn(INPUT, "h-auto resize-none py-2 leading-relaxed")}
                            />
                        </Field>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={!canSave} className="bg-blue-600 text-white hover:bg-blue-700">
                            {editingService ? "Save changes" : "Create service type"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Deleting takes a service out of every picker in the app, so it is asked for
                rather than taken on a single click of a small icon. */}
            <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Delete “{toDelete?.name}”?</DialogTitle>
                        <DialogDescription>
                            It will stop appearing when anyone builds a service interval or a work order.
                            Records that already name it are not changed.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setToDelete(null)}>Cancel</Button>
                        <Button
                            onClick={() => { if (toDelete) serviceTypesStore.remove(toDelete.id); setToDelete(null); }}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            Delete service type
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
});
