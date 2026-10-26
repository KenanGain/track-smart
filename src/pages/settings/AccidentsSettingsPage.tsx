import React, { Fragment, useEffect, useMemo, useState } from "react";
import {
    Plus, X, ChevronDown, RotateCcw, Trash2, Tag, Layers, Settings as SettingsIcon, ShieldAlert, Hash, Layers3, Edit, AlertTriangle, LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListPageHeader } from "@/components/ui/ListPageHeader";
import { ListScrollFrame } from "@/components/ui/ListScrollFrame";
import { KpiStatRow, type KpiStat } from "@/components/ui/KpiStatCard";
import { ListHeaderBridge, chipsFromStats, useHeaderChips } from "@/components/ui/list-header-bridge";
import { usePageChrome } from "@/components/ui/PageChrome";
import {
    ColumnPicker, FilterSelect, FiltersToggle, GroupBySelect, ListToolbar, ResetFilters, SortTh, TableGroupBand, TablePager,
    useTableSort, type PickerColumn,
} from "@/components/ui/ListChrome";
import { PIN_TD_ACTIONS, PIN_TH, PIN_TH_ACTIONS, mobileFold } from "@/components/ui/list-chrome";
import { RowActions } from "@/components/ui/RowActions";
import {
    ACCIDENT_TYPES,
    ACCIDENT_GROUPS,
    ACCIDENT_GROUP_TONE,
    RISK_TYPE_DEFAULT_POINTS,
    RISK_TYPE_TONE,
    RISK_TYPES,
    CLASS_MAPPING_LENSES,
    LENS_TONE,
    classMappingCount,
    classMappingLensCount,
    MAIN_CATEGORIES,
    MAIN_CATEGORY_TONE,
    getMainCategories,
    type AccidentClassMapping,
    type AccidentRiskType,
    type AccidentGroup,
    type AccidentTypeDef,
    type MainCategory,
} from "@/data/accident-types.data";
import { cn } from "@/lib/utils";

// ── Storage ────────────────────────────────────────────────────────────────

const OVERRIDES_KEY = "tracksmart_accident_type_overrides_v2";
const CUSTOM_KEY    = "tracksmart_accident_type_custom_v2";

interface BuiltinOverride {
    riskType?: AccidentRiskType;
    riskPoints?: number;
    classMapping?: AccidentClassMapping;
}

function loadOverrides(): Record<string, BuiltinOverride> {
    if (typeof window === "undefined") return {};
    try {
        const raw = window.localStorage.getItem(OVERRIDES_KEY);
        return raw ? (JSON.parse(raw) as Record<string, BuiltinOverride>) : {};
    } catch { return {}; }
}
function saveOverrides(o: Record<string, BuiltinOverride>) {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o)); } catch { /* ignore */ }
}
function loadCustom(): AccidentTypeDef[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(CUSTOM_KEY);
        return raw ? (JSON.parse(raw) as AccidentTypeDef[]) : [];
    } catch { return []; }
}
function saveCustom(items: AccidentTypeDef[]) {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

// ── Row shape ──────────────────────────────────────────────────────────────

interface Row extends AccidentTypeDef {
    isCustom: boolean;
    isOverridden: boolean;
}

/** Where a type comes from — a filter and a grouping. */
type Source = "FMCSA" | "Custom" | "Edited";
const SOURCES: Source[] = ["FMCSA", "Custom", "Edited"];
const sourceOf = (t: Row): Source => (t.isCustom ? "Custom" : t.isOverridden ? "Edited" : "FMCSA");

type Col = "name" | "group" | "description" | "risk" | "points" | "mapping";
const COLUMNS: PickerColumn<Col>[] = [
    { id: "name", label: "Display name", locked: true },
    { id: "group", label: "Group" },
    { id: "description", label: "Description" },
    { id: "risk", label: "Risk type" },
    { id: "points", label: "Risk points" },
    { id: "mapping", label: "Class mapping" },
];
type GroupBy = "none" | "group" | "risk" | "source";
const GROUPS: { id: GroupBy; label: string }[] = [
    { id: "none", label: "No grouping" },
    { id: "group", label: "Group: Accident group" },
    { id: "risk", label: "Group: Risk type" },
    { id: "source", label: "Group: FMCSA / Custom / Edited" },
];

const TD = ({ children, className, title }: { children?: React.ReactNode; className?: string; title?: string }) => (
    <td title={title} className={cn("px-4 py-2.5 text-sm align-middle whitespace-nowrap", className)}>{children}</td>
);

// ── Page ───────────────────────────────────────────────────────────────────

export function AccidentsSettingsPage() {
    const [activeTab, setActiveTab] = useState<MainCategory | "all">("all");
    const [overrides, setOverrides] = useState<Record<string, BuiltinOverride>>(() => loadOverrides());
    const [custom, setCustom] = useState<AccidentTypeDef[]>(() => loadCustom());
    const { scrollRef, onScroll, condensed, bridge } = usePageChrome(activeTab);

    const [modalState, setModalState] = useState<
        | { kind: "closed" }
        | { kind: "view"; id: string }
        | { kind: "edit"; id: string }
        | { kind: "create" }
    >({ kind: "closed" });

    useEffect(() => { saveOverrides(overrides); }, [overrides]);
    useEffect(() => { saveCustom(custom); }, [custom]);

    const allRows: Row[] = useMemo(() => {
        const rows: Row[] = [];
        for (const t of ACCIDENT_TYPES) {
            const ov = overrides[t.id];
            rows.push({
                ...t,
                defaultRiskType:    ov?.riskType    ?? t.defaultRiskType,
                defaultRiskPoints:  ov?.riskPoints  ?? t.defaultRiskPoints,
                defaultClassMapping: ov?.classMapping ?? t.defaultClassMapping,
                isCustom: false,
                isOverridden: !!(ov && (ov.riskType != null || ov.riskPoints != null || ov.classMapping != null)),
            });
        }
        for (const c of custom) {
            rows.push({ ...c, isCustom: true, isOverridden: false });
        }
        return rows;
    }, [overrides, custom]);

    const tabRows = useMemo(() => activeTab === "all" ? allRows : allRows.filter((t) => getMainCategories(t).includes(activeTab as MainCategory)), [allRows, activeTab]);
    const overrideCount = Object.values(overrides).filter((o) => o.riskType != null || o.riskPoints != null || o.classMapping != null).length;

    // Mutations
    const upsertCustom = (item: AccidentTypeDef) => {
        setCustom((prev) => {
            const idx = prev.findIndex((c) => c.id === item.id);
            if (idx >= 0) { const next = [...prev]; next[idx] = item; return next; }
            return [...prev, item];
        });
    };
    const deleteCustom = (id: string) => setCustom((prev) => prev.filter((c) => c.id !== id));
    const setBuiltinOverride = (id: string, patch: Partial<BuiltinOverride>) =>
        setOverrides((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }));
    const resetBuiltin = (id: string) =>
        setOverrides((prev) => { const next = { ...prev }; delete next[id]; return next; });
    const resetAllOverrides = () => { if (window.confirm(`Reset ${overrideCount} edited accident type${overrideCount === 1 ? "" : "s"} to the FMCSA defaults?`)) setOverrides({}); };

    const editing = (modalState.kind === "edit" || modalState.kind === "view")
        ? allRows.find((r) => r.id === modalState.id) ?? null
        : null;

    const tabs = [
        { id: "all", label: "All accidents", icon: LayoutGrid, count: allRows.length },
        ...MAIN_CATEGORIES.map((c) => ({ id: c.id, label: c.label, icon: AlertTriangle, count: allRows.filter((t) => getMainCategories(t).includes(c.id)).length })),
    ];

    return (
        <ListHeaderBridge value={bridge.value}>
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <ListPageHeader
                Icon={AlertTriangle}
                title="Accident Types"
                description={<>Each accident type mapped onto FMCSA / CVOR / NSC classes and driver and vehicle triggers — the groupings behind <span className="font-semibold text-slate-700">Beta Safety Analysis → Accident / Collision</span>.</>}
                count={allRows.length}
                countTitle={`${allRows.length} accident types`}
                condensed={condensed}
                chips={bridge.chips ?? undefined}
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id as MainCategory | "all")}
                tabsLabel="Accident categories"
                showZeroCounts
                actions={<>
                    {overrideCount > 0 && (
                        <Button variant="outline" onClick={resetAllOverrides}
                            className={cn("gap-1.5 border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100", condensed ? "h-8" : "h-9")}>
                            <RotateCcw className="h-4 w-4" /> Reset {overrideCount} edited
                        </Button>
                    )}
                    <Button onClick={() => setModalState({ kind: "create" })} className={cn("gap-2 bg-blue-600 text-white shadow-sm hover:bg-blue-700", condensed ? "h-8" : "h-9")}>
                        <Plus className="h-4 w-4" /> Add accident type
                    </Button>
                </>}
            />

            <AccidentTypesList
                key={activeTab}
                rows={tabRows}
                tabLabel={tabs.find((t) => t.id === activeTab)?.label ?? "Accident types"}
                showGroup={activeTab === "all"}
                onView={(id) => setModalState({ kind: "view", id })}
                onEdit={(id) => setModalState({ kind: "edit", id })}
                onDelete={(t) => deleteCustom(t.id)}
                onResetOne={resetBuiltin}
                scrollRef={scrollRef}
                onScroll={onScroll}
            />

            {/* Modal */}
            {modalState.kind !== "closed" && (
                <AccidentTypeFormModal
                    mode={modalState.kind}
                    initial={editing}
                    onClose={() => setModalState({ kind: "closed" })}
                    onSwitchToEdit={() => editing && setModalState({ kind: "edit", id: editing.id })}
                    onSaveBuiltin={(id, patch) => { setBuiltinOverride(id, patch); setModalState({ kind: "closed" }); }}
                    onResetBuiltin={(id) => { resetBuiltin(id); setModalState({ kind: "closed" }); }}
                    onSaveCustom={(item) => { upsertCustom(item); setModalState({ kind: "closed" }); }}
                    onDeleteCustom={(id) => { deleteCustom(id); setModalState({ kind: "closed" }); }}
                />
            )}
        </div>
        </ListHeaderBridge>
    );
}

// ── The list ───────────────────────────────────────────────────────────────

function AccidentTypesList({ rows, tabLabel, showGroup, onView, onEdit, onDelete, onResetOne, scrollRef, onScroll }: {
    rows: Row[];
    tabLabel: string;
    showGroup: boolean;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onDelete: (t: Row) => void;
    onResetOne: (id: string) => void;
    scrollRef?: React.Ref<HTMLDivElement>;
    onScroll?: React.UIEventHandler<HTMLDivElement>;
}) {
    const [search, setSearch] = useState("");
    const [group, setGroup] = useState("");
    const [risk, setRisk] = useState("");
    const [source, setSource] = useState("");
    const [groupBy, setGroupBy] = useState<GroupBy>("none");
    const [visible, setVisible] = useState<Set<Col>>(() => new Set(COLUMNS.map((c) => c.id)));
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [filtersOpen, setFiltersOpen] = useState(false);

    const stats: KpiStat[] = [
        { id: "all", label: "Accident types", value: rows.length, Icon: Layers, accent: "blue" },
        { id: "FMCSA", label: "From FMCSA SMS", value: rows.filter((t) => t.fromFmcsa).length, Icon: ShieldAlert, accent: "emerald" },
        { id: "Custom", label: "Custom / internal", value: rows.filter((t) => t.isCustom).length, Icon: Tag, accent: "violet" },
        { id: "Edited", label: "With overrides", value: rows.filter((t) => t.isOverridden).length, Icon: SettingsIcon, accent: "amber" },
    ];
    const pickKpi = (id: string) => { setPage(1); setSource(id === "all" || source === id ? "" : id); };
    useHeaderChips(chipsFromStats(stats, source || "all", pickKpi));

    const q = search.trim().toLowerCase();
    const filtered = rows.filter((t) => {
        if (group && t.group !== group) return false;
        if (risk && t.defaultRiskType !== risk) return false;
        if (source === "FMCSA" && !t.fromFmcsa) return false;
        if (source === "Custom" && !t.isCustom) return false;
        if (source === "Edited" && !t.isOverridden) return false;
        return !q || [t.displayName, t.description, t.group].some((x) => x.toLowerCase().includes(q));
    });
    const readers = useMemo(() => ({
        name: (t: Row) => t.displayName,
        group: (t: Row) => t.group,
        description: (t: Row) => t.description,
        risk: (t: Row) => RISK_TYPES.indexOf(t.defaultRiskType),
        points: (t: Row) => t.defaultRiskPoints,
        mapping: (t: Row) => classMappingCount(t.defaultClassMapping),
    }), []);
    const { sort, onSort, sorted } = useTableSort<Col, Row>(filtered, readers, null);
    const groupOf = (t: Row): { rank: number; label: string } | null =>
        groupBy === "group" ? { rank: ACCIDENT_GROUPS.indexOf(t.group), label: t.group }
            : groupBy === "risk" ? { rank: RISK_TYPES.indexOf(t.defaultRiskType), label: t.defaultRiskType }
                : groupBy === "source" ? { rank: SOURCES.indexOf(sourceOf(t)), label: sourceOf(t) }
                    : null;
    const grouped = groupBy === "none" ? sorted : sorted
        .map((t, i) => ({ t, i, g: groupOf(t)! }))
        .sort((x, y) => x.g.rank - y.g.rank || x.i - y.i)
        .map((x) => x.t);
    const groupCounts = new Map<string, number>();
    if (groupBy !== "none") grouped.forEach((t) => { const l = groupOf(t)!.label; groupCounts.set(l, (groupCounts.get(l) ?? 0) + 1); });

    const pages = Math.max(1, Math.ceil(grouped.length / pageSize));
    const safePage = Math.min(page, pages);
    const slice = grouped.slice((safePage - 1) * pageSize, safePage * pageSize);
    const show = (c: Col) => visible.has(c) && (c !== "group" || showGroup);
    const colCount = COLUMNS.filter((c) => c.locked || show(c.id)).length + 1;
    const filterCount = [!!group, !!risk, !!source, groupBy !== "none"].filter(Boolean).length;
    const touched = filterCount > 0 || !!q;
    const reset = () => { setSearch(""); setGroup(""); setRisk(""); setSource(""); setGroupBy("none"); setPage(1); };
    const toPage1 = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

    return (
        <ListScrollFrame
            above={<KpiStatRow stats={stats} activeId={source || "all"} onPick={pickKpi} />}
            title={tabLabel}
            count={grouped.length}
            total={rows.length}
            description="FMCSA types can have their risk and class mapping edited; custom types are fully yours. Click a row to see its details."
            actions={<ColumnPicker columns={showGroup ? COLUMNS : COLUMNS.filter((c) => c.id !== "group")} visible={visible}
                onToggle={(id) => setVisible((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })} />}
            scrollRef={scrollRef}
            onScroll={onScroll}
            contentKey={`${filtersOpen}|${slice.length}`}
            toolbar={
                <ListToolbar search={search} onSearch={toPage1(setSearch)} placeholder="Search accident types…"
                    filters={<div className={mobileFold(filtersOpen)}>
                        <FilterSelect value={group} onChange={toPage1(setGroup)} title="Accident group" allLabel="All groups" options={[...ACCIDENT_GROUPS]} />
                        <FilterSelect value={risk} onChange={toPage1(setRisk)} title="Risk type" allLabel="All risk types" options={[...RISK_TYPES]} />
                        <FilterSelect value={source} onChange={toPage1(setSource)} title="Source" allLabel="FMCSA, custom and edited" options={SOURCES} />
                    </div>}
                    filtersExtra={<>
                        <FiltersToggle open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)} count={filterCount} />
                        <div className={mobileFold(filtersOpen)}>
                            <GroupBySelect value={groupBy} onChange={toPage1(setGroupBy)} options={showGroup ? GROUPS : GROUPS.filter((g) => g.id !== "group")} />
                            <ResetFilters on={touched} onReset={reset} />
                        </div>
                    </>} />
            }
            footer={<TablePager page={safePage} pageSize={pageSize} total={grouped.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />}
        >
            <table className="w-full">
                <thead>
                    <tr>
                        <SortTh col="name" label="Display name" sortable sort={sort} onSort={onSort} className={PIN_TH} />
                        {show("group") && <SortTh col="group" label="Group" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("description") && <SortTh col="description" label="Description" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("risk") && <SortTh col="risk" label="Risk type" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("points") && <SortTh col="points" label="Risk pts" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("mapping") && <SortTh col="mapping" label="Class mapping" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        <SortTh label="Actions" sort={sort} className={PIN_TH_ACTIONS} />
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {slice.length === 0 && (
                        <tr>
                            <td colSpan={colCount} className="px-6 py-14 text-center">
                                <AlertTriangle className="mx-auto h-7 w-7 text-slate-300" />
                                <p className="mt-3 text-sm font-semibold text-slate-700">No accident type matches</p>
                                {touched && (
                                    <button type="button" onClick={reset} className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Clear filters</button>
                                )}
                            </td>
                        </tr>
                    )}
                    {slice.map((t, i) => {
                        const g = groupOf(t);
                        const prev = i === 0 || !g ? null : groupOf(slice[i - 1]);
                        return (
                            <Fragment key={t.id}>
                                {g && (!prev || prev.label !== g.label) && (
                                    <TableGroupBand label={g.label} count={groupCounts.get(g.label) ?? 0} colSpan={colCount} />
                                )}
                                <tr className="group cursor-pointer transition-colors hover:bg-slate-50" onClick={() => onView(t.id)}>
                                    <TD title={t.displayName}>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-900">{t.displayName}</span>
                                            {t.fromFmcsa && <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">FMCSA</span>}
                                            {t.isCustom && <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700">Custom</span>}
                                            {t.isOverridden && <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">Edited</span>}
                                            {getMainCategories(t).map((cat) => {
                                                const meta = MAIN_CATEGORIES.find((c) => c.id === cat);
                                                return <span key={cat} className={cn("rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", MAIN_CATEGORY_TONE[cat])}>{meta?.label ?? cat}</span>;
                                            })}
                                        </div>
                                    </TD>
                                    {show("group") && (
                                        <TD><span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold", ACCIDENT_GROUP_TONE[t.group])}>{t.group}</span></TD>
                                    )}
                                    {show("description") && <TD className="max-w-[22rem] truncate text-[13px] text-slate-600" title={t.description}>{t.description}</TD>}
                                    {show("risk") && (
                                        <TD><span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider", RISK_TYPE_TONE[t.defaultRiskType])}>{t.defaultRiskType}</span></TD>
                                    )}
                                    {show("points") && (
                                        <TD><span className="inline-flex items-center gap-1 text-slate-700"><Hash className="h-3 w-3 text-slate-400" /><span className="font-semibold tabular-nums">{t.defaultRiskPoints}</span></span></TD>
                                    )}
                                    {show("mapping") && <TD><ClassMappingSummary mapping={t.defaultClassMapping} /></TD>}
                                    <td className={cn("px-4 py-2.5", PIN_TD_ACTIONS)} onClick={(e) => e.stopPropagation()}>
                                        <RowActions noun="accident type" name={t.displayName} openLabel="View details"
                                            onOpen={() => onView(t.id)} onEdit={() => onEdit(t.id)}
                                            extra={t.isOverridden ? [{ label: "Reset to FMCSA default", icon: RotateCcw, onClick: () => onResetOne(t.id) }] : []}
                                            onDelete={t.isCustom ? () => onDelete(t) : undefined} />
                                    </td>
                                </tr>
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </ListScrollFrame>
    );
}

// ── Class Mapping cell ─────────────────────────────────────────────────────

function ClassMappingSummary({ mapping }: { mapping?: AccidentClassMapping }) {
    const lensCount = classMappingLensCount(mapping);
    const total = classMappingCount(mapping);
    if (lensCount === 0) {
        return <span className="text-[11px] text-slate-400 italic">No mappings</span>;
    }
    const lenses = CLASS_MAPPING_LENSES.filter((l) => {
        const v = mapping?.[l.key];
        if (!v) return false;
        if (Array.isArray(v)) return v.length > 0;
        // Object lens (PEI / NS) — any sub-array non-empty.
        return Object.values(v).some((arr) => Array.isArray(arr) && arr.length > 0);
    }).slice(0, 4);
    return (
        <div className="flex items-center gap-1 whitespace-nowrap">
            {lenses.map((l) => (
                <span key={l.key} className={cn("inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider", LENS_TONE[l.key])}>
                    {l.short}
                </span>
            ))}
            {lensCount > 4 && (
                <span className="text-[10px] text-slate-400 font-semibold">+{lensCount - 4}</span>
            )}
            <span className="text-[10px] text-slate-400 ml-1 tabular-nums">{total} class{total === 1 ? "" : "es"}</span>
        </div>
    );
}

// ── Modal ──────────────────────────────────────────────────────────────────

function AccidentTypeFormModal({
    mode, initial, onClose, onSwitchToEdit,
    onSaveBuiltin, onResetBuiltin, onSaveCustom, onDeleteCustom,
}: {
    mode: "view" | "edit" | "create";
    initial: Row | null;
    onClose: () => void;
    onSwitchToEdit: () => void;
    onSaveBuiltin: (id: string, patch: BuiltinOverride) => void;
    onResetBuiltin: (id: string) => void;
    onSaveCustom: (item: AccidentTypeDef) => void;
    onDeleteCustom: (id: string) => void;
}) {
    const isCreate = mode === "create";
    const isView = mode === "view";
    const isCustom = !!initial?.isCustom;
    const isBuiltin = !!initial && !initial.isCustom;
    const lockBasic = isView || isBuiltin; // built-ins can only edit risk + mapping

    const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
    const [description, setDescription] = useState(initial?.description ?? "");
    const [group, setGroup] = useState<AccidentGroup>(initial?.group ?? "Outcome");
    const [riskType, setRiskType] = useState<AccidentRiskType>(initial?.defaultRiskType ?? "Medium");
    const [riskPoints, setRiskPoints] = useState<string>(String(initial?.defaultRiskPoints ?? RISK_TYPE_DEFAULT_POINTS["Medium"]));
    const [mapping, setMapping] = useState<AccidentClassMapping>(initial?.defaultClassMapping ?? {});

    useEffect(() => {
        if (isView) return;
        if (!isCreate && !isCustom) return;
        const cur = parseInt(riskPoints, 10);
        const prevDefault = RISK_TYPE_DEFAULT_POINTS[initial?.defaultRiskType ?? "Medium"];
        if (Number.isNaN(cur) || cur === prevDefault) {
            setRiskPoints(String(RISK_TYPE_DEFAULT_POINTS[riskType]));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [riskType]);

    const submit = () => {
        if (isView) return;
        const ptsNum = parseInt(riskPoints, 10);
        const pts = Number.isFinite(ptsNum) && ptsNum >= 0 ? ptsNum : RISK_TYPE_DEFAULT_POINTS[riskType];
        if (isCreate) {
            const cleanName = displayName.trim();
            if (!cleanName) return;
            const id = "custom_" + cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_" + Date.now().toString(36);
            onSaveCustom({ id, group, displayName: cleanName, description: description.trim(), defaultRiskType: riskType, defaultRiskPoints: pts, defaultClassMapping: mapping, fromFmcsa: false });
            return;
        }
        if (!initial) return;
        if (isCustom) {
            onSaveCustom({ id: initial.id, group, displayName: displayName.trim() || initial.displayName, description: description.trim(), defaultRiskType: riskType, defaultRiskPoints: pts, defaultClassMapping: mapping, fromFmcsa: false });
        } else {
            onSaveBuiltin(initial.id, { riskType, riskPoints: pts, classMapping: mapping });
        }
    };

    const title = isCreate ? "Add Accident Type" : isView ? "Accident Type Details" : "Edit Accident Type";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                        {!isCreate && initial && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                {isView ? "Read-only preview." : isBuiltin ? "Built-in catalogue entry — Risk and Class Mapping are editable; Display Name / Group / Description are locked." : "Custom accident type — every field is editable."}
                            </p>
                        )}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded text-slate-400 hover:bg-slate-100 shrink-0">
                        <X size={16} />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-5 max-h-[75vh] overflow-y-auto">
                    {/* Basic fields */}
                    <Field label="Display Name">
                        <Input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={lockBasic && !isCustom}
                            className={cn("h-9 text-sm", lockBasic && !isCustom && "bg-slate-50 text-slate-500")}
                            placeholder="e.g. Wildlife Strike Accident" />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Group">
                            <div className="relative">
                                <select value={group} onChange={(e) => setGroup(e.target.value as AccidentGroup)} disabled={lockBasic && !isCustom}
                                    className={cn("appearance-none w-full h-9 pl-3 pr-9 rounded-md border bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer",
                                        lockBasic && !isCustom ? "border-slate-100 bg-slate-50 text-slate-500 cursor-not-allowed" : "border-slate-200 text-slate-700")}>
                                    {ACCIDENT_GROUPS.map((g) => (<option key={g} value={g}>{g}</option>))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </Field>
                        <Field label="Risk Type">
                            <div className="relative">
                                <select value={riskType} onChange={(e) => setRiskType(e.target.value as AccidentRiskType)} disabled={isView}
                                    className={cn("appearance-none w-full h-9 pl-3 pr-9 rounded-md border text-sm font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer",
                                        RISK_TYPE_TONE[riskType], isView && "cursor-not-allowed opacity-80")}>
                                    {RISK_TYPES.map((rt) => (<option key={rt} value={rt}>{rt}</option>))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                            </div>
                        </Field>
                    </div>

                    <Field label="Description">
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={lockBasic && !isCustom} rows={3}
                            className={cn("w-full px-3 py-2 rounded-md border bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-snug",
                                lockBasic && !isCustom ? "border-slate-100 bg-slate-50 text-slate-500 cursor-not-allowed" : "border-slate-200")}
                            placeholder="Short description of when this accident type applies." />
                    </Field>

                    <Field label="Risk Points">
                        <Input type="number" min={0} value={riskPoints} onChange={(e) => setRiskPoints(e.target.value)} disabled={isView}
                            className={cn("h-9 text-sm font-mono tabular-nums", isView && "bg-slate-50 text-slate-500")} />
                        <p className="text-[10px] text-slate-400 mt-1">
                            Default for {riskType.toLowerCase()}: {RISK_TYPE_DEFAULT_POINTS[riskType]}
                        </p>
                    </Field>

                    {/* Class Mapping editor */}
                    <div className="border-t border-slate-200 pt-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Layers3 size={14} className="text-slate-500" />
                            <h3 className="text-sm font-semibold text-slate-900">Class Mapping</h3>
                            <span className="text-[11px] text-slate-400">drives Beta Safety Analysis groupings</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-3">
                            Pick which jurisdictional class(es) and trigger event(s) this accident type should appear under in the Accident / Collision report.
                        </p>
                        <div className="space-y-3">
                            {CLASS_MAPPING_LENSES.map((lens) => (
                                <LensEditor
                                    key={lens.key as string}
                                    lens={lens}
                                    mapping={mapping}
                                    onChange={setMapping}
                                    disabled={isView}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        {!isCreate && initial && isBuiltin && initial.isOverridden && !isView && (
                            <Button variant="outline" onClick={() => onResetBuiltin(initial.id)}
                                className="h-8 px-3 text-xs font-bold border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100">
                                <RotateCcw className="h-3 w-3 mr-1.5" />
                                Reset overrides
                            </Button>
                        )}
                        {!isCreate && initial && isCustom && !isView && (
                            <Button variant="outline" onClick={() => { if (window.confirm(`Delete "${initial.displayName}"?`)) onDeleteCustom(initial.id); }}
                                className="h-8 px-3 text-xs font-bold border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100">
                                <Trash2 className="h-3 w-3 mr-1.5" />
                                Delete
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={onClose} className="h-8 px-3 text-xs font-bold">{isView ? "Close" : "Cancel"}</Button>
                        {isView ? (
                            <Button onClick={onSwitchToEdit} className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
                                <Edit className="h-3 w-3 mr-1.5" />
                                Edit
                            </Button>
                        ) : (
                            <Button onClick={submit} disabled={isCreate && !displayName.trim()}
                                className="h-8 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-bold">
                                {isCreate ? "Create" : "Save"}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Lens editor (multi-select chips) ───────────────────────────────────────

function LensEditor({
    lens, mapping, onChange, disabled,
}: {
    lens: typeof CLASS_MAPPING_LENSES[number];
    mapping: AccidentClassMapping;
    onChange: (m: AccidentClassMapping) => void;
    disabled?: boolean;
}) {
    const isFlat = Array.isArray(lens.options);
    const tone = LENS_TONE[lens.key];

    const toggleFlat = (val: string) => {
        const cur = (mapping[lens.key] as string[] | undefined) ?? [];
        const next = cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val];
        onChange({ ...mapping, [lens.key]: next.length > 0 ? next : undefined });
    };

    const toggleNested = (sub: string, val: string) => {
        const cur = (mapping[lens.key] as Record<string, string[]> | undefined) ?? {};
        const subVals = cur[sub] ?? [];
        const nextSub = subVals.includes(val) ? subVals.filter((v) => v !== val) : [...subVals, val];
        const nextLens: Record<string, string[]> = { ...cur };
        if (nextSub.length > 0) nextLens[sub] = nextSub; else delete nextLens[sub];
        onChange({ ...mapping, [lens.key]: Object.keys(nextLens).length > 0 ? nextLens : undefined });
    };

    const flatSelected = (mapping[lens.key] as string[] | undefined) ?? [];
    const nestedSelected = (mapping[lens.key] as Record<string, string[]> | undefined) ?? {};

    return (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider", tone)}>
                        {lens.short}
                    </span>
                    <span className="text-[12px] font-semibold text-slate-900">{lens.label}</span>
                </div>
                <span className="text-[10px] text-slate-400">{lens.description}</span>
            </div>
            <div className="px-3 py-2.5 space-y-2 bg-white">
                {isFlat ? (
                    <div className="flex flex-wrap gap-1.5">
                        {(lens.options as readonly string[]).map((opt) => {
                            const active = flatSelected.includes(opt);
                            return (
                                <button
                                    type="button"
                                    key={opt}
                                    onClick={() => !disabled && toggleFlat(opt)}
                                    disabled={disabled}
                                    className={cn("text-[11px] px-2 py-1 rounded-md border font-semibold transition-colors",
                                        active ? cn(tone, "ring-1 ring-current/20") : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                                        disabled && "cursor-not-allowed opacity-70")}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    Object.entries(lens.options as Record<string, readonly string[]>).map(([sub, vals]) => (
                        <div key={sub}>
                            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">{sub}</div>
                            <div className="flex flex-wrap gap-1.5">
                                {vals.map((opt) => {
                                    const active = (nestedSelected[sub] ?? []).includes(opt);
                                    return (
                                        <button
                                            type="button"
                                            key={opt}
                                            onClick={() => !disabled && toggleNested(sub, opt)}
                                            disabled={disabled}
                                            className={cn("text-[11px] px-2 py-1 rounded-md border font-semibold transition-colors",
                                                active ? cn(tone, "ring-1 ring-current/20") : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                                                disabled && "cursor-not-allowed opacity-70")}
                                        >
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</span>
            {children}
        </label>
    );
}

export default AccidentsSettingsPage;
