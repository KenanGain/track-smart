import { useEffect, useMemo, useState } from "react";
import {
    FlaskConical, Sparkles, AlertTriangle, Layers3,
    ShieldAlert, Search,
} from "lucide-react";
import { SubTabs } from "@/components/ui/SubTabs";
import { Input } from "@/components/ui/input";
import {
    ACCIDENT_TYPES,
    CLASS_MAPPING_LENSES,
    LENS_TONE,
    ACCIDENT_GROUP_TONE,
    RISK_TYPE_TONE,
    type AccidentClassMapping,
    type AccidentTypeDef,
} from "@/data/accident-types.data";
import { cn } from "@/lib/utils";

// ── Storage (read-only here — owned by AccidentsSettingsPage) ──────────────

const OVERRIDES_KEY = "tracksmart_accident_type_overrides_v2";
const CUSTOM_KEY    = "tracksmart_accident_type_custom_v2";

interface BuiltinOverride {
    riskType?: AccidentTypeDef["defaultRiskType"];
    riskPoints?: number;
    classMapping?: AccidentClassMapping;
}

function loadOverrides(): Record<string, BuiltinOverride> {
    if (typeof window === "undefined") return {};
    try { const raw = window.localStorage.getItem(OVERRIDES_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
function loadCustom(): AccidentTypeDef[] {
    if (typeof window === "undefined") return [];
    try { const raw = window.localStorage.getItem(CUSTOM_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

// ── Composed type with effective mapping ───────────────────────────────────

interface EffectiveType extends AccidentTypeDef {
    isCustom: boolean;
}

function composeTypes(
    overrides: Record<string, BuiltinOverride>,
    custom: AccidentTypeDef[],
): EffectiveType[] {
    const rows: EffectiveType[] = [];
    for (const t of ACCIDENT_TYPES) {
        const ov = overrides[t.id];
        rows.push({
            ...t,
            defaultRiskType:    ov?.riskType    ?? t.defaultRiskType,
            defaultRiskPoints:  ov?.riskPoints  ?? t.defaultRiskPoints,
            defaultClassMapping: ov?.classMapping ?? t.defaultClassMapping,
            isCustom: false,
        });
    }
    for (const c of custom) rows.push({ ...c, isCustom: true });
    return rows;
}

// ── Page ───────────────────────────────────────────────────────────────────

type SubTabId = "overview" | "accidents";

export function BetaSafetyAnalysisPage() {
    const [activeTab, setActiveTab] = useState<SubTabId>("accidents");
    const [overrides, setOverrides] = useState<Record<string, BuiltinOverride>>(() => loadOverrides());
    const [custom, setCustom] = useState<AccidentTypeDef[]>(() => loadCustom());

    // Refresh from localStorage whenever the tab gains focus, so saves made
    // in Settings appear here without requiring a full page reload.
    useEffect(() => {
        const refresh = () => {
            setOverrides(loadOverrides());
            setCustom(loadCustom());
        };
        window.addEventListener("focus", refresh);
        window.addEventListener("storage", refresh);
        return () => {
            window.removeEventListener("focus", refresh);
            window.removeEventListener("storage", refresh);
        };
    }, []);

    const types = useMemo(() => composeTypes(overrides, custom), [overrides, custom]);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-5">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center shadow-sm">
                        <FlaskConical size={20} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold text-slate-900">Beta Safety Analysis</h1>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200 text-[10px] font-bold uppercase tracking-wider">
                                <Sparkles size={10} /> Beta
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Carrier safety reports built from the configurable Accident / Collision mappings — set up in Settings &rsaquo; Accidents.
                        </p>
                    </div>
                </div>
            </div>

            {/* Sub-tabs */}
            <div className="bg-white border-b border-slate-200 px-8">
                <SubTabs
                    tabs={[
                        { id: "overview",  label: "Overview" },
                        { id: "accidents", label: "Accident / Collision", icon: AlertTriangle, count: types.length },
                    ]}
                    activeId={activeTab}
                    onChange={(id) => setActiveTab(id as SubTabId)}
                />
            </div>

            {activeTab === "overview" && (
                <div className="px-8 py-8">
                    <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm p-10 text-center">
                        <div className="h-14 w-14 mx-auto rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
                            <FlaskConical size={26} />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900 mb-1">Beta workspace</h2>
                        <p className="text-sm text-slate-500 max-w-md mx-auto">
                            The Accident / Collision tab uses the class mappings configured in Settings &rsaquo; Accidents to group every accident type onto the FMCSA, CVOR, NSC, PEI, NS and behavioural lenses you'd report against.
                        </p>
                    </div>
                </div>
            )}

            {activeTab === "accidents" && <AccidentCollisionView types={types} />}
        </div>
    );
}

// ── Accident / Collision sub-view ──────────────────────────────────────────

function AccidentCollisionView({ types }: { types: EffectiveType[] }) {
    const [activeLens, setActiveLens] = useState<keyof AccidentClassMapping>("fmcsaInspection");
    const [search, setSearch] = useState("");

    // Buckets: lens-class-key → list of types mapped to it.
    // For nested lenses (PEI, NS) keys are formatted as "Sub » Value".
    const buckets = useMemo(() => {
        const map = new Map<string, EffectiveType[]>();
        for (const t of types) {
            const m = t.defaultClassMapping?.[activeLens];
            if (!m) continue;
            if (Array.isArray(m)) {
                for (const v of m) {
                    const arr = map.get(v) ?? [];
                    arr.push(t);
                    map.set(v, arr);
                }
            } else {
                for (const [sub, vals] of Object.entries(m as Record<string, string[]>)) {
                    for (const v of vals ?? []) {
                        const k = `${sub} » ${v}`;
                        const arr = map.get(k) ?? [];
                        arr.push(t);
                        map.set(k, arr);
                    }
                }
            }
        }
        return map;
    }, [types, activeLens]);

    // Unmapped pile: types with no value on the active lens.
    const unmapped = useMemo(() => {
        return types.filter((t) => {
            const m = t.defaultClassMapping?.[activeLens];
            if (!m) return true;
            if (Array.isArray(m)) return m.length === 0;
            return Object.values(m as Record<string, string[]>).every((arr) => !arr || arr.length === 0);
        });
    }, [types, activeLens]);

    const lens = CLASS_MAPPING_LENSES.find((l) => l.key === activeLens)!;
    const lensTone = LENS_TONE[activeLens];

    // Search filter (filters within each bucket).
    const filterTypes = (list: EffectiveType[]): EffectiveType[] => {
        const q = search.trim().toLowerCase();
        if (!q) return list;
        return list.filter((t) =>
            t.displayName.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.group.toLowerCase().includes(q),
        );
    };

    const totalMapped = useMemo(() => {
        const set = new Set<string>();
        for (const arr of buckets.values()) for (const t of arr) set.add(t.id);
        return set.size;
    }, [buckets]);

    return (
        <div className="px-8 py-6">
            {/* Lens picker + search */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-5">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Layers3 size={14} className="text-slate-500" />
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500">Group by</span>
                    </div>
                    <div className="relative max-w-xs flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            placeholder="Search accident types in this view…"
                            className="pl-8 h-8 bg-white border-slate-200 text-xs"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="px-4 py-3 flex items-center gap-2 flex-wrap">
                    {CLASS_MAPPING_LENSES.map((l) => {
                        const active = l.key === activeLens;
                        return (
                            <button
                                type="button"
                                key={l.key as string}
                                onClick={() => setActiveLens(l.key)}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-bold uppercase tracking-wider transition-colors",
                                    active ? cn(LENS_TONE[l.key], "ring-2 ring-current/20") : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                                )}
                            >
                                <span>{l.short}</span>
                                <span className="text-[10px] font-semibold opacity-70 normal-case">{l.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Active lens header */}
            <div className="flex items-baseline justify-between gap-3 mb-3">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">{lens.label}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{lens.description}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                        <span className="font-semibold text-slate-700 tabular-nums">{buckets.size}</span> classes
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                        <span className="font-semibold text-slate-700 tabular-nums">{totalMapped}</span> mapped types
                    </span>
                    {unmapped.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700">
                            <span className="font-semibold tabular-nums">{unmapped.length}</span> unmapped
                        </span>
                    )}
                </div>
            </div>

            {/* Buckets */}
            {buckets.size === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
                    No accident types are mapped to <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider mx-1", lensTone)}>{lens.short}</span>.
                    Open <span className="font-semibold text-slate-700">Settings &rsaquo; Accidents</span> and edit a row to add mappings here.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from(buckets.entries())
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([className, items]) => {
                            const filtered = filterTypes(items);
                            const totalPts = filtered.reduce((s, t) => s + t.defaultRiskPoints, 0);
                            const critical = filtered.filter((t) => t.defaultRiskType === "Critical").length;
                            return (
                                <div key={className} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider", lensTone)}>
                                                {lens.short}
                                            </span>
                                            <h3 className="text-[13px] font-semibold text-slate-900 truncate" title={className}>{className}</h3>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 shrink-0">
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-semibold tabular-nums">
                                                {filtered.length}
                                            </span>
                                            {critical > 0 && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 border border-red-200 text-red-700 font-bold uppercase tracking-wider">
                                                    <ShieldAlert size={9} /> {critical}
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-bold tabular-nums" title="Sum of risk points">
                                                {totalPts}pts
                                            </span>
                                        </div>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {filtered.length === 0 ? (
                                            <div className="px-4 py-3 text-[11px] text-slate-400 italic">No matches for current search.</div>
                                        ) : (
                                            filtered.map((t) => (
                                                <div key={t.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[12px] font-semibold text-slate-900 truncate" title={t.displayName}>{t.displayName}</span>
                                                            {t.isCustom && (
                                                                <span className="text-[9px] px-1 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 font-bold uppercase tracking-wider">Custom</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-semibold whitespace-nowrap", ACCIDENT_GROUP_TONE[t.group])}>
                                                                {t.group}
                                                            </span>
                                                            <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider", RISK_TYPE_TONE[t.defaultRiskType])}>
                                                                {t.defaultRiskType}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="font-mono text-[12px] font-semibold tabular-nums text-slate-700 shrink-0">
                                                        {t.defaultRiskPoints} pts
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}

            {/* Unmapped types */}
            {unmapped.length > 0 && (
                <div className="mt-6">
                    <div className="text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-2">
                        Unmapped on this lens
                    </div>
                    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
                        <div className="divide-y divide-slate-100">
                            {filterTypes(unmapped).map((t) => (
                                <div key={t.id} className="px-4 py-2 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[12px] font-semibold text-slate-700 truncate" title={t.displayName}>{t.displayName}</span>
                                        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-semibold whitespace-nowrap", ACCIDENT_GROUP_TONE[t.group])}>
                                            {t.group}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">No {lens.short} class set</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BetaSafetyAnalysisPage;
