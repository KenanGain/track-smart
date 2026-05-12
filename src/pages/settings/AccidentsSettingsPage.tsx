import { useEffect, useMemo, useState } from "react";
import {
    Search, Plus, Eye, Edit, X, ChevronDown, RotateCcw,
    Trash2, Tag, Layers, Settings as SettingsIcon, ShieldAlert, Hash, Layers3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubTabs } from "@/components/ui/SubTabs";
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

// ── Page ───────────────────────────────────────────────────────────────────

export function AccidentsSettingsPage() {
    const [activeTab, setActiveTab] = useState<MainCategory | "all">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [overrides, setOverrides] = useState<Record<string, BuiltinOverride>>(() => loadOverrides());
    const [custom, setCustom] = useState<AccidentTypeDef[]>(() => loadCustom());

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

    const visibleRows = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return allRows.filter((t) => {
            if (activeTab !== "all") {
                const cats = getMainCategories(t);
                if (!cats.includes(activeTab as MainCategory)) return false;
            }
            if (!q) return true;
            return (
                t.displayName.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q) ||
                t.group.toLowerCase().includes(q)
            );
        });
    }, [allRows, searchQuery, activeTab]);

    const stats = useMemo(() => {
        const fmcsa = ACCIDENT_TYPES.filter((t) => t.fromFmcsa).length;
        const customCount = custom.length;
        const overriddenCount = Object.values(overrides).filter((o) => o.riskType != null || o.riskPoints != null || o.classMapping != null).length;
        return { total: allRows.length, fmcsa, custom: customCount, overrides: overriddenCount };
    }, [allRows.length, custom.length, overrides]);

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
    const resetAllOverrides = () => setOverrides({});

    const editing = (modalState.kind === "edit" || modalState.kind === "view")
        ? allRows.find((r) => r.id === modalState.id) ?? null
        : null;

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <div className="px-8 py-6 max-w-[1600px] mx-auto w-full">

                {/* Header */}
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <nav className="flex text-sm text-slate-500 mb-1 font-medium items-center gap-2">
                            <span>Settings</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-900">Accident Types</span>
                        </nav>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
                            Accident Type Configuration
                        </h1>
                        <p className="text-slate-600 max-w-3xl text-sm">
                            Configure accident types and map each one onto FMCSA / CVOR / NSC class taxonomies plus driver and vehicle action triggers.
                            These mappings drive the groupings used in <span className="font-semibold text-slate-900">Beta Safety Analysis → Accident / Collision</span>.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {stats.overrides > 0 && (
                            <Button variant="outline" onClick={resetAllOverrides}
                                className="h-9 px-3 text-xs font-semibold uppercase tracking-wide border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100">
                                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                                Reset {stats.overrides} override{stats.overrides > 1 ? "s" : ""}
                            </Button>
                        )}
                        <Button onClick={() => setModalState({ kind: "create" })}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-9 px-4 text-xs font-semibold uppercase tracking-wide">
                            <Plus className="h-3.5 w-3.5 mr-2" />
                            Add Accident Type
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                    <StatCard label="Total Accident Types"  value={stats.total}     icon={Layers}      tone="blue"   />
                    <StatCard label="From FMCSA SMS"        value={stats.fmcsa}     icon={ShieldAlert} tone="emerald"/>
                    <StatCard label="Custom / Internal"     value={stats.custom}    icon={Tag}         tone="violet" />
                    <StatCard label="With Overrides"        value={stats.overrides} icon={SettingsIcon}tone="amber"  />
                </div>

                {/* Tabs & Search */}
                <div className="flex flex-col space-y-4 mb-4">
                    <SubTabs
                        tabs={[
                            { id: "all", label: "All Accidents", count: allRows.length },
                            ...MAIN_CATEGORIES.map((c) => ({
                                id: c.id,
                                label: c.label,
                                count: allRows.filter((t) => getMainCategories(t).includes(c.id)).length,
                            })),
                        ]}
                        activeId={activeTab}
                        onChange={(id) => setActiveTab(id as MainCategory | "all")}
                    />
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                placeholder="Search accident types…"
                                className="pl-8 h-8 bg-white border-slate-200 text-xs"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                            {visibleRows.length} Accident Type{visibleRows.length === 1 ? "" : "s"} Found
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <tr>
                                    <th className="px-4 py-2 w-[24%]">Display Name</th>
                                    {activeTab === "all" && <th className="px-4 py-2 w-[10%]">Group</th>}
                                    <th className="px-4 py-2">Description</th>
                                    <th className="px-4 py-2 text-center w-[9%]">Risk Type</th>
                                    <th className="px-4 py-2 text-center w-[7%]">Risk Pts</th>
                                    <th className="px-4 py-2 w-[20%]">Class Mapping</th>
                                    <th className="px-4 py-2 text-right w-[110px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibleRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={activeTab === "all" ? 7 : 6} className="px-6 py-12 text-center text-slate-500">
                                            <p className="font-medium text-sm">No accident types found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    visibleRows.map((t) => (
                                        <tr key={t.id} className="group hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-3 align-middle">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-900 text-sm" title={t.displayName}>{t.displayName}</span>
                                                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                        {t.fromFmcsa && (<span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 font-bold uppercase tracking-wider">FMCSA</span>)}
                                                        {t.isCustom && (<span className="text-[10px] px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded border border-violet-200 font-bold uppercase tracking-wider">Custom</span>)}
                                                        {t.isOverridden && (<span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200 font-bold uppercase tracking-wider">Edited</span>)}
                                                        {getMainCategories(t).map((cat) => {
                                                            const meta = MAIN_CATEGORIES.find((c) => c.id === cat);
                                                            return (
                                                                <span key={cat} className={cn("text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider", MAIN_CATEGORY_TONE[cat])}>
                                                                    {meta?.label ?? cat}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </td>
                                            {activeTab === "all" && (
                                                <td className="px-4 py-3 align-middle">
                                                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap", ACCIDENT_GROUP_TONE[t.group])}>
                                                        {t.group}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="px-4 py-3 align-middle">
                                                <p className="text-xs text-slate-600 leading-snug line-clamp-2 max-w-2xl" title={t.description}>{t.description}</p>
                                            </td>
                                            <td className="px-4 py-3 align-middle text-center">
                                                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-bold uppercase tracking-wider", RISK_TYPE_TONE[t.defaultRiskType])}>
                                                    {t.defaultRiskType}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 align-middle text-center">
                                                <div className="inline-flex items-center justify-center gap-1 text-slate-700">
                                                    <Hash className="w-3 h-3 text-slate-400" />
                                                    <span className="font-semibold text-sm tabular-nums">{t.defaultRiskPoints}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-middle">
                                                <ClassMappingSummary mapping={t.defaultClassMapping} />
                                            </td>
                                            <td className="px-4 py-3 align-middle text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="sm" onClick={() => setModalState({ kind: "view", id: t.id })}
                                                        className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="View Details">
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => setModalState({ kind: "edit", id: t.id })}
                                                        className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="Edit">
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>
                                                    {t.isCustom && (
                                                        <Button variant="ghost" size="sm" onClick={() => { if (window.confirm(`Delete "${t.displayName}"?`)) deleteCustom(t.id); }}
                                                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Delete">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

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
        <div className="flex items-center gap-1 flex-wrap">
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

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: React.ElementType; tone: "blue" | "emerald" | "violet" | "amber"; }) {
    const valueTone = tone === "blue" ? "text-slate-900"
        : tone === "emerald" ? "text-emerald-600"
        : tone === "violet" ? "text-violet-600"
        : "text-amber-600";
    const iconBg = tone === "blue" ? "bg-blue-50 text-blue-600"
        : tone === "emerald" ? "bg-emerald-50 text-emerald-600"
        : tone === "violet" ? "bg-violet-50 text-violet-600"
        : "bg-amber-50 text-amber-600";
    return (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
                    <p className={cn("text-2xl font-bold mt-1 tabular-nums", valueTone)}>{value}</p>
                </div>
                <div className={cn("p-3 rounded-lg", iconBg)}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
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
