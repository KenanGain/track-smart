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

import { Fragment, forwardRef, useEffect, useImperativeHandle, useMemo, useState, type Ref, type UIEventHandler } from "react";
import { Pencil, Trash2, Truck, Car, Layers, Wrench, Share2 } from "lucide-react";
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
import { TD, CatalogTabs, RowIcon, EmptyRow } from "@/components/ui/CatalogTable";
import {
    ColumnPicker, FilterSelect, FiltersToggle, GroupBySelect, ListToolbar, ResetFilters, SortTh, TableGroupBand, useTableSort,
    type PickerColumn,
} from "@/components/ui/ListChrome";
import { PIN_TD_ACTIONS, PIN_TH, PIN_TH_ACTIONS, mobileFold } from "@/components/ui/list-chrome";
import { ListScrollFrame } from "@/components/ui/ListScrollFrame";
import { KpiStatRow, type KpiStat } from "@/components/ui/KpiStatCard";
import { chipsFromStats, useHeaderChips } from "@/components/ui/list-header-bridge";

/**
 * The columns a reader can turn off, and the two they cannot: the name identifies the row
 * and the menu acts on it.
 */
type TypeCol = "name" | "class" | "related" | "actions";
const TYPE_COLUMNS: PickerColumn<TypeCol>[] = [
    { id: "name", label: "Maintenance Type", locked: true },
    { id: "class", label: "Maintenance Class" },
    { id: "related", label: "Related To" },
    { id: "actions", label: "Actions", locked: true },
];

/** What this list can be banded by — the two facts a service type carries. */
type TypeGroup = "none" | "class" | "related";
const TYPE_GROUPS: { id: TypeGroup; label: string }[] = [
    { id: "none", label: "No grouping" },
    { id: "class", label: "Group: Maintenance class" },
    { id: "related", label: "Group: Related to" },
];
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

export const ServiceTypesPanel = forwardRef<ServiceTypesPanelHandle, {
    /**
     * Fill the host's body: the KPI cards scroll up and away, then the rows scroll in their
     * own box under pinned headings. `scrollRef` / `onScroll` are for a condensing header.
     */
    frame?: { scrollRef?: Ref<HTMLDivElement>; onScroll?: UIEventHandler<HTMLDivElement> };
}>(function ServiceTypesPanel({ frame }, ref) {
    // Service Types — live store. Add/update/delete dispatch through serviceTypesStore so
    // CreateScheduleForm, CreateOrderModal and AssetMaintenancePage all see the change
    // immediately.
    const serviceTypes = useServiceTypes();

    const [search, setSearch] = useState("");
    const [activeClass, setActiveClass] = useState<string>("All");
    const [related, setRelated] = useState<ServiceCategory | "all">("all");
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(15);
    const [visibleCols, setVisibleCols] = useState<Set<TypeCol>>(() => new Set(TYPE_COLUMNS.map((c) => c.id)));
    const toggleCol = (id: TypeCol) => setVisibleCols((prev) => {
        const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n;
    });
    const showCol = (id: TypeCol) => visibleCols.has(id);
    const colCount = TYPE_COLUMNS.filter((c) => c.locked || visibleCols.has(c.id)).length;
    const [groupBy, setGroupBy] = useState<TypeGroup>("none");
    const [filtersOpen, setFiltersOpen] = useState(false);

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

    const { sort, onSort, sorted } = useTableSort<TypeCol, ServiceType>(filtered, {
        name: (t) => t.name,
        class: (t) => t.group,
        related: (t) => t.category,
    });

    /** The band a grouped list is split by. */
    const bandOf = (t: ServiceType) =>
        groupBy === "class" ? (t.group || "No class")
            : groupBy === "related" ? String(t.category)
                : "";
    const banded = useMemo(() => {
        if (groupBy === "none") return sorted;
        return [...sorted].sort((a, b) => bandOf(a).localeCompare(bandOf(b)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sorted, groupBy]);
    const bandCounts = useMemo(() => {
        const m = new Map<string, number>();
        if (groupBy !== "none") for (const t of banded) m.set(bandOf(t), (m.get(bandOf(t)) ?? 0) + 1);
        return m;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [banded, groupBy]);

    // Narrowing the list must not strand you on a page that no longer exists.
    useEffect(() => { setPage(0); }, [search, activeClass, related, groupBy]);

    const pageCount = Math.max(1, Math.ceil(banded.length / perPage));
    const safePage = Math.min(page, pageCount - 1);
    const paged = banded.slice(safePage * perPage, safePage * perPage + perPage);

    const filterCount = [activeClass !== "All", related !== "all", groupBy !== "none"].filter(Boolean).length;
    const filtering = search.trim() !== "" || filterCount > 0;
    const clear = () => { setSearch(""); setActiveClass("All"); setRelated("all"); setGroupBy("none"); };

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

    const stats: KpiStat[] = [
        { id: "all", label: "Total types", value: counts.total, Icon: Wrench, accent: "blue" },
        { id: "cmv_only", label: "Trucks", value: counts.truck, Icon: Truck, accent: "violet" },
        { id: "non_cmv_only", label: "Trailers", value: counts.trailer, Icon: Car, accent: "amber" },
        { id: "both_cmv_and_non_cmv", label: "Both", value: counts.both, Icon: Layers, accent: "emerald" },
    ];
    const pickRelated = (id: string) => setRelated(id as ServiceCategory | "all");
    // The same figures, for the page header to show once the cards have scrolled away.
    useHeaderChips(chipsFromStats(stats, related, pickRelated));
    const relatedOptions = (["cmv_only", "non_cmv_only", "both_cmv_and_non_cmv"] as ServiceCategory[]).map((c) => CATEGORY_LABELS[c]);
    const columnPicker = <ColumnPicker columns={TYPE_COLUMNS} visible={visibleCols} onToggle={toggleCol} />;

    const kpis = <KpiStatRow stats={stats} activeId={related} onPick={pickRelated} />;

    const toolbar = (
        <>
            <CatalogTabs ariaLabel="Maintenance classes" tabs={tabs} active={activeClass} onChange={setActiveClass} />
            <ListToolbar
                search={search}
                onSearch={setSearch}
                placeholder="Search service, class or description…"
                filters={<div className={mobileFold(filtersOpen)}>
                    <FilterSelect value={related === "all" ? "" : CATEGORY_LABELS[related]} title="Related to" allLabel="Trucks, trailers and both"
                        options={relatedOptions}
                        onChange={(v) => setRelated((Object.keys(CATEGORY_LABELS) as ServiceCategory[]).find((c) => CATEGORY_LABELS[c] === v) ?? "all")} />
                </div>}
                filtersExtra={<>
                    <FiltersToggle open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)} count={filterCount} />
                    <div className={mobileFold(filtersOpen)}>
                        <GroupBySelect value={groupBy} onChange={setGroupBy} options={TYPE_GROUPS} />
                        <ResetFilters on={filtering} onReset={clear} />
                    </div>
                </>}
                columns={frame ? undefined : columnPicker}
            />
        </>
    );

    const table = (
        <table className="w-full">
            <thead>
                <tr>
                    <SortTh col="name" label="Maintenance Type" sortable sort={sort} onSort={onSort} className={PIN_TH} />
                    {showCol("class") && <SortTh col="class" label="Maintenance Class" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                    {showCol("related") && <SortTh col="related" label="Related To" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                    <SortTh label="Actions" sort={sort} className={PIN_TH_ACTIONS} />
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {paged.length === 0 && (
                    <EmptyRow
                        colSpan={colCount}
                        Icon={Wrench}
                        title="No service types match your filters"
                        hint={search.trim()
                            ? <>Nothing matches <span className="font-semibold text-slate-600">{search.trim()}</span> in this view.</>
                            : "Try another class, or show them all."}
                        onClear={filtering ? clear : undefined}
                    />
                )}
                {paged.map((service, i) => (
                    <Fragment key={service.id}>
                    {groupBy !== "none" && (i === 0 || bandOf(paged[i - 1]) !== bandOf(service)) && (
                        <TableGroupBand label={bandOf(service)} count={bandCounts.get(bandOf(service)) ?? 0} colSpan={colCount} />
                    )}
                    <tr className="group cursor-pointer transition-colors hover:bg-slate-50" onClick={() => openDialog(service)}>
                        <TD className="py-2.5">
                            <div className="flex min-w-0 items-center gap-3" title={[service.name, service.description].filter(Boolean).join(" — ")}>
                                <RowIcon Icon={iconFor(service.category)} tone="blue" />
                                <span className="min-w-0 truncate">
                                    <span className="font-semibold text-slate-900">{service.name}</span>
                                    {service.description && <span className="text-xs text-slate-500"> · {service.description}</span>}
                                </span>
                            </div>
                        </TD>
                        {showCol("class") && (
                        <TD className="whitespace-nowrap py-2.5">
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                {service.group}
                            </span>
                        </TD>
                        )}
                        {showCol("related") && <TD className="whitespace-nowrap py-2.5"><RelatedTo category={service.category} /></TD>}
                        <TD className={cn("py-2.5", PIN_TD_ACTIONS)} onClick={(e) => e.stopPropagation()}>
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
                    </Fragment>
                ))}
            </tbody>
        </table>
    );

    const pager = (
        <TablePager
            page={safePage}
            perPage={perPage}
            total={filtered.length}
            label="service types"
            onPage={setPage}
            onPerPage={(n) => { setPerPage(n); setPage(0); }}
        />
    );

    const body = frame ? (
        <ListScrollFrame above={kpis} toolbar={toolbar} footer={pager}
            title="Service types"
            count={filtered.length}
            total={serviceTypes.length}
            description="The catalog every service interval and work order picks from — click a row to edit it."
            actions={columnPicker}
            scrollRef={frame.scrollRef} onScroll={frame.onScroll}
            contentKey={`${filtersOpen}|${paged.length}`}>
            {table}
        </ListScrollFrame>
    ) : (
        <div className="space-y-5">
            {kpis}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {toolbar}
                <div className="overflow-x-auto border-t border-slate-100">{table}</div>
                {pager}
            </div>
        </div>
    );

    return (
        <>
            {body}

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
        </>
    );
});
