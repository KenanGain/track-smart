import { useMemo, useState, useEffect } from "react";
import {
    FileText, Truck, User, LayoutGrid, Hash, CalendarX, FileWarning,
    Clock, AlertTriangle, Search, Plus, Columns, Edit3, ChevronDown, ChevronUp,
    ArrowLeft, Download, Check, AlertCircle, FolderOpen,
    Users, UserCheck, UserMinus, UserX,
    RotateCcw, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DOCUMENTS, SEED_KEY_NUMBERS,
    type DocumentRow, type KeyNumberRow, type KeyNumberGroup,
} from "@/pages/admin/ComplianceAndDocumentsPage";
import {
    loadCarrierAssignment, effectiveDocFlags, effectiveKnFlags, getEntityAssignment,
    type CarrierComplianceAssignment, type EntityScope,
} from "@/pages/admin/carrier-compliance.data";
import { ACCOUNTS_DB, type AccountRecord } from "@/pages/accounts/accounts.data";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-fleet.data";
import { CARRIER_ASSETS } from "@/pages/accounts/carrier-assets.data";
import type { Asset } from "@/pages/assets/assets.data";

interface NewComplianceDocumentsPageProps {
    accountId?: string;
}

type EntityTab = 'Carrier' | 'Asset' | 'Driver';
type ViewMode = 'Compliance' | 'Documents';

const KEY_NUMBER_GROUP_ORDER: KeyNumberGroup[] = [
    'Regulatory and Safety Numbers',
    'Tax and Business Identification Numbers',
    'Bond and Registration Numbers',
    'Carrier & Industry Codes',
    'Other',
];

export function NewComplianceDocumentsPage({ accountId }: NewComplianceDocumentsPageProps = {}) {
    const carrier = useMemo<AccountRecord>(() => {
        if (accountId) {
            const a = ACCOUNTS_DB.find(x => x.id === accountId);
            if (a) return a;
        }
        return ACCOUNTS_DB[0];
    }, [accountId]);

    const assignment = useMemo(() => loadCarrierAssignment(carrier.id), [carrier.id]);

    const [activeTab, setActiveTab] = useState<EntityTab>('Carrier');
    const [viewMode, setViewMode] = useState<ViewMode>('Compliance');

    // Reset selection when changing carrier or tab
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
    useEffect(() => { setSelectedAssetId(null); setSelectedDriverId(null); }, [carrier.id, activeTab]);

    return (
        <div className="flex-1 bg-slate-50 min-h-screen">
            {/* ── Page header ─────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200 px-8 py-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-slate-900">
                            {activeTab === 'Carrier' ? 'Carrier Compliance'
                                : activeTab === 'Asset' ? 'Assets'
                                : 'Drivers'}
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {activeTab === 'Carrier' && 'Manage company-level documents, licenses and permits.'}
                            {activeTab === 'Asset'   && 'Manage vehicle compliance, documentation and status.'}
                            {activeTab === 'Driver'  && 'Manage driver qualification files, licenses and certifications.'}
                        </p>
                    </div>
                    {/* Compliance / Documents toggle */}
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                        {(['Compliance', 'Documents'] as ViewMode[]).map(m => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setViewMode(m)}
                                className={cn(
                                    "px-4 py-1.5 text-sm font-semibold rounded-md transition-colors",
                                    viewMode === m
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "text-slate-600 hover:text-slate-900",
                                )}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab strip — Carrier / Asset / Driver */}
                <div className="flex items-center gap-1 mt-4 -mb-5">
                    {([
                        { id: 'Carrier', label: 'Carrier', Icon: LayoutGrid },
                        { id: 'Asset',   label: 'Asset',   Icon: Truck },
                        { id: 'Driver',  label: 'Driver',  Icon: User },
                    ] as const).map(t => {
                        const active = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setActiveTab(t.id)}
                                className={cn(
                                    'inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                                    active
                                        ? 'text-blue-600 border-blue-600'
                                        : 'text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300',
                                )}
                            >
                                <t.Icon size={15} className={active ? 'text-blue-600' : 'text-slate-400'} />
                                {t.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Page body ───────────────────────────────────────────── */}
            <div className="px-8 py-6 space-y-5">
                {activeTab === 'Carrier' && (
                    <ComplianceDetail
                        scope="Carrier"
                        assignment={assignment}
                        viewMode={viewMode}
                    />
                )}

                {activeTab === 'Asset' && (
                    selectedAssetId ? (
                        <AssetDetail
                            carrierId={carrier.id}
                            assetId={selectedAssetId}
                            assignment={assignment}
                            viewMode={viewMode}
                            onBack={() => setSelectedAssetId(null)}
                        />
                    ) : (
                        <AssetListView
                            carrierId={carrier.id}
                            assignment={assignment}
                            onSelect={(id) => setSelectedAssetId(id)}
                        />
                    )
                )}

                {activeTab === 'Driver' && (
                    selectedDriverId ? (
                        <DriverDetail
                            carrierId={carrier.id}
                            driverId={selectedDriverId}
                            assignment={assignment}
                            viewMode={viewMode}
                            onBack={() => setSelectedDriverId(null)}
                        />
                    ) : (
                        <DriverListView
                            carrierId={carrier.id}
                            assignment={assignment}
                            onSelect={(id) => setSelectedDriverId(id)}
                        />
                    )
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// COMPLIANCE / DOCUMENT DETAIL — used by Carrier tab and by Asset/Driver
// detail screens. Renders KPI strip + Key Numbers (or Documents) grouped.
// ─────────────────────────────────────────────────────────────────────────

interface ComplianceDetailProps {
    scope: 'Carrier' | 'Asset' | 'Driver';
    assignment: CarrierComplianceAssignment;
    viewMode: ViewMode;
    /** When set, filter items by this driver's/asset's per-entity assignment
     *  (overrides the carrier-level enabled lists). */
    entityId?: string;
    /** Optional context line shown above the KPIs (e.g. "Back to List | ACM-T0100"). */
    contextHeader?: React.ReactNode;
}

function ComplianceDetail({ scope, assignment, viewMode, entityId, contextHeader }: ComplianceDetailProps) {
    // For Driver/Asset detail views, resolve the per-entity overrides; for
    // the carrier dashboard, use the carrier-level enabled lists.
    const effective = useMemo(() => {
        if (entityId && (scope === 'Driver' || scope === 'Asset')) {
            const entityScope = scope.toLowerCase() as EntityScope;
            return getEntityAssignment(assignment, entityScope, entityId);
        }
        return {
            enabledKeyNumberIds: assignment.enabledKeyNumberIds,
            enabledDocumentTypeIds: assignment.enabledDocumentTypeIds,
        };
    }, [scope, entityId, assignment]);
    const enabledKnSet = new Set(effective.enabledKeyNumberIds);
    const enabledDocSet = new Set(effective.enabledDocumentTypeIds);

    const keyNumbers = useMemo(() => {
        return SEED_KEY_NUMBERS
            .filter(k => k.status === 'Active')
            .filter(k => k.relatedTo === scope)
            .filter(k => enabledKnSet.has(k.id))
            .map(k => effectiveKnFlags(k, assignment));
    }, [scope, assignment, enabledKnSet]);

    const documents = useMemo(() => {
        const scopeKey = scope.toLowerCase() as 'carrier' | 'asset' | 'driver';
        return DOCUMENTS
            .filter(d => d.status === 'Active')
            .filter(d => d.scope === scopeKey)
            .filter(d => enabledDocSet.has(d.id))
            .map(d => effectiveDocFlags(d, assignment));
    }, [scope, assignment, enabledDocSet]);

    // KPI counts. With no per-entity values in the mock data we treat every
    // enabled item as "missing" so the numbers actually move with the
    // carrier's compliance config — same behaviour as the original page.
    const missingNumber = keyNumbers.filter(k => k.numberRequired).length;
    const missingExpiry = [...keyNumbers.filter(k => k.hasExpiry), ...documents.filter(d => d.expiryRequired)].length;
    const missingDoc    = documents.length + keyNumbers.filter(k => k.docRequired).length;
    const expiringSoon  = 0;
    const expired       = 0;

    return (
        <>
            {contextHeader}

            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <KpiTile label="Missing Number"  value={missingNumber} Icon={Hash}        accent="red" />
                <KpiTile label="Missing Expiry"  value={missingExpiry} Icon={CalendarX}   accent="orange" />
                <KpiTile label="Missing Doc"     value={missingDoc}    Icon={FileWarning} accent="amber" />
                <KpiTile label="Expiring Soon"   value={expiringSoon}  Icon={Clock}       accent="yellow" />
                <KpiTile label="Expired"         value={expired}       Icon={AlertTriangle} accent="red" />
            </div>

            {viewMode === 'Compliance' ? (
                <KeyNumbersCard keyNumbers={keyNumbers} />
            ) : (
                <DocumentsCard documents={documents} />
            )}
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// KEY NUMBERS CARD (grouped by KeyNumberGroup, collapsible)
// ─────────────────────────────────────────────────────────────────────────

function KeyNumbersCard({ keyNumbers }: { keyNumbers: KeyNumberRow[] }) {
    const [search, setSearch] = useState("");
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return keyNumbers;
        return keyNumbers.filter(k => k.name.toLowerCase().includes(q));
    }, [keyNumbers, search]);

    const grouped = useMemo(() => {
        const map = new Map<KeyNumberGroup, KeyNumberRow[]>();
        for (const k of filtered) {
            const arr = map.get(k.group) ?? [];
            arr.push(k);
            map.set(k.group, arr);
        }
        return KEY_NUMBER_GROUP_ORDER
            .filter(g => map.has(g))
            .map(g => [g, map.get(g)!] as const);
    }, [filtered]);

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-5 pb-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <FileText size={18} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Key Numbers</h3>
                </div>
                <button type="button" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-colors">
                    <Plus size={14} /> Add Number
                </button>
            </div>

            <div className="px-5 pb-3 flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[240px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search numbers..."
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                </div>
                <button type="button" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50">
                    <Columns size={14} /> Columns <ChevronDown size={12} />
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="border-y border-slate-200 bg-slate-50/50">
                        <tr className="text-left">
                            <Th>Number Type</Th>
                            <Th>Value</Th>
                            <Th>Status</Th>
                            <Th>Expiry</Th>
                            <Th className="text-right pr-5">Actions</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {grouped.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">
                                    {search
                                        ? "No key numbers match your search."
                                        : "No key numbers enabled for this carrier at this scope."}
                                </td>
                            </tr>
                        )}
                        {grouped.map(([group, items]) => {
                            const isCollapsed = collapsed[group];
                            return (
                                <FragmentRows key={group}>
                                    <tr className="bg-slate-50">
                                        <td colSpan={5} className="px-5 py-2.5">
                                            <button
                                                type="button"
                                                onClick={() => setCollapsed(c => ({ ...c, [group]: !c[group] }))}
                                                className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900"
                                            >
                                                <span>{group}</span>
                                                {isCollapsed
                                                    ? <ChevronDown size={14} className="text-slate-400" />
                                                    : <ChevronUp size={14} className="text-slate-400" />}
                                            </button>
                                        </td>
                                    </tr>
                                    {!isCollapsed && items.map(k => (
                                        <KeyNumberTr key={k.id} kn={k} />
                                    ))}
                                </FragmentRows>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function KeyNumberTr({ kn }: { kn: KeyNumberRow }) {
    // Mock has no per-entity values yet — every required number is "Missing".
    const status: 'Missing' | 'Active' | 'Optional' = kn.numberRequired ? 'Missing' : 'Optional';
    const linkedDoc = kn.linkedDocumentTypeId
        ? DOCUMENTS.find(d => d.id === kn.linkedDocumentTypeId)
        : undefined;
    return (
        <tr className="border-b border-slate-100 hover:bg-slate-50/40 transition-colors">
            <td className="px-5 py-3 align-top">
                <div className="text-sm font-semibold text-slate-900">{kn.name}</div>
                {linkedDoc && (
                    <a className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1 mt-0.5" href="#" onClick={(e) => e.preventDefault()}>
                        <FileText size={10} /> Linked to: {linkedDoc.name}
                    </a>
                )}
            </td>
            <td className="px-5 py-3 align-top text-sm text-slate-400 italic">Not entered</td>
            <td className="px-5 py-3 align-top">
                <StatusPill status={status} />
            </td>
            <td className="px-5 py-3 align-top text-sm text-slate-500 italic">
                {kn.hasExpiry ? 'Not set' : '-'}
            </td>
            <td className="px-5 py-3 align-top text-right pr-5">
                <button type="button" className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Edit">
                    <Edit3 size={14} />
                </button>
            </td>
        </tr>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// DOCUMENTS CARD — when the user toggles to the Documents view
// ─────────────────────────────────────────────────────────────────────────

function DocumentsCard({ documents }: { documents: DocumentRow[] }) {
    const [search, setSearch] = useState("");
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return documents;
        return documents.filter(d => d.name.toLowerCase().includes(q) || d.folder.toLowerCase().includes(q));
    }, [documents, search]);

    const byFolder = useMemo(() => {
        const map = new Map<string, DocumentRow[]>();
        for (const d of filtered) {
            const arr = map.get(d.folder) ?? [];
            arr.push(d);
            map.set(d.folder, arr);
        }
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [filtered]);

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-5 pb-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <FolderOpen size={18} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Documents</h3>
                </div>
                <button type="button" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-colors">
                    <Plus size={14} /> Add Document
                </button>
            </div>

            <div className="px-5 pb-3">
                <div className="relative max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search documents..."
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                </div>
            </div>

            <div className="border-t border-slate-200">
                {byFolder.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-slate-500">
                        {search
                            ? "No documents match your search."
                            : "No documents enabled for this carrier at this scope."}
                    </div>
                ) : (
                    byFolder.map(([folder, docs]) => (
                        <div key={folder}>
                            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                                <FolderOpen size={12} className="text-slate-500" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{folder}</span>
                                <span className="text-[10px] font-bold text-slate-400 tabular-nums">· {docs.length}</span>
                            </div>
                            <table className="min-w-full">
                                <tbody>
                                    {docs.map(d => (
                                        <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                                            <td className="px-5 py-3 w-1/2">
                                                <div className="flex items-center gap-2">
                                                    <FileText size={14} className="text-blue-600 shrink-0" />
                                                    <span className="text-sm font-semibold text-slate-900">{d.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    {d.expiryRequired      && <ReqChip label="Expiry" />}
                                                    {d.issueDateRequired   && <ReqChip label="Issue date" />}
                                                    {d.issueStateRequired  && <ReqChip label="State" />}
                                                    {d.issueCountryRequired&& <ReqChip label="Country" />}
                                                    {d.usedInHiring && (
                                                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            Hiring
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <StatusPill status="Missing" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// ASSET LIST + DETAIL
// ─────────────────────────────────────────────────────────────────────────

function AssetListView({
    carrierId, assignment, onSelect,
}: {
    carrierId: string;
    assignment: CarrierComplianceAssignment;
    onSelect: (assetId: string) => void;
}) {
    const assets: Asset[] = useMemo(() => CARRIER_ASSETS[carrierId] ?? [], [carrierId]);

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState<'all' | 'CMV' | 'Non-CMV'>('all');

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return assets.filter(a => {
            if (category !== 'all' && a.assetCategory !== category) return false;
            if (q) {
                const blob = `${a.unitNumber} ${a.vin} ${a.assetType} ${a.make} ${a.model}`.toLowerCase();
                if (!blob.includes(q)) return false;
            }
            return true;
        });
    }, [assets, search, category]);

    const counts = useMemo(() => ({
        total:        assets.length,
        active:       assets.filter(a => a.operationalStatus === 'Active').length,
        maintenance:  assets.filter(a => a.operationalStatus === 'Maintenance').length,
        outOfService: assets.filter(a => a.operationalStatus === 'OutOfService').length,
        deactivated:  assets.filter(a => a.operationalStatus === 'Deactivated').length,
    }), [assets]);

    // Per-asset "missing" count — reads the per-entity assignment so each
    // row reflects what's enabled for that specific asset (mock has no real
    // values, so every enabled item counts as missing).
    const missingByAsset = useMemo(() => {
        const map = new Map<string, number>();
        for (const a of assets) {
            const ea = getEntityAssignment(assignment, 'asset', a.id);
            const knSet = new Set(ea.enabledKeyNumberIds);
            const docSet = new Set(ea.enabledDocumentTypeIds);
            const kn = SEED_KEY_NUMBERS.filter(k => k.relatedTo === 'Asset' && k.status === 'Active' && knSet.has(k.id)).length;
            const doc = DOCUMENTS.filter(d => d.scope === 'asset' && d.status === 'Active' && docSet.has(d.id)).length;
            map.set(a.id, kn + doc);
        }
        return map;
    }, [assets, assignment]);

    return (
        <>
            {/* KPI strip — status counters */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <KpiTile label="Total Assets"     value={counts.total}        Icon={LayoutGrid} accent="blue" />
                <KpiTile label="Active Assets"    value={counts.active}       Icon={Check}      accent="emerald" />
                <KpiTile label="In Maintenance"   value={counts.maintenance}  Icon={RotateCcw}  accent="orange" />
                <KpiTile label="Out of Service"   value={counts.outOfService} Icon={AlertCircle} accent="amber" />
                <KpiTile label="Deactivated"      value={counts.deactivated}  Icon={XCircle}    accent="red" />
            </div>

            {/* Filter + table card */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[260px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by Unit #, VIN or Type..."
                            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                        />
                    </div>
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                        {([
                            { id: 'all',     label: 'All Assets' },
                            { id: 'CMV',     label: 'Trucks (CMV)' },
                            { id: 'Non-CMV', label: 'Trailers (Non-CMV)' },
                        ] as const).map(c => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => setCategory(c.id)}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                                    category === c.id ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900",
                                )}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                    <button type="button" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50">
                        <Columns size={14} /> Columns <ChevronDown size={12} />
                    </button>
                    <button type="button" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm">
                        <Plus size={14} /> Add Asset
                    </button>
                </div>
                <div className="overflow-x-auto border-t border-slate-200">
                    <table className="min-w-full">
                        <thead className="bg-slate-50/50 border-b border-slate-200">
                            <tr className="text-left">
                                <Th>Unit #</Th>
                                <Th>Type</Th>
                                <Th>Plate (No./State)</Th>
                                <Th>Plate Expiry</Th>
                                <Th>VIN</Th>
                                <Th>Make / Model / Year</Th>
                                <Th>Ownership</Th>
                                <Th>Compliance</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.slice(0, 50).map(a => (
                                <tr
                                    key={a.id}
                                    className="border-b border-slate-100 hover:bg-blue-50/30 cursor-pointer transition-colors"
                                    onClick={() => onSelect(a.id)}
                                >
                                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{a.unitNumber}</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                            {a.assetType} · {a.vehicleType}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700">
                                        {a.plateNumber} <span className="text-[11px] text-slate-400">({a.plateJurisdiction})</span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-blue-700">{a.registrationExpiryDate}</td>
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-[11px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                            {a.vin}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div className="font-semibold text-slate-800">{a.make} {a.model}</div>
                                        <div className="text-[11px] text-slate-500">{a.year} · {a.color?.toUpperCase()}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <OwnershipPill ownership={a.financialStructure} />
                                    </td>
                                    <td className="px-4 py-3">
                                        {(() => {
                                            const m = missingByAsset.get(a.id) ?? 0;
                                            return m > 0 ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-50 text-red-700 border border-red-200">
                                                    {m} No. Missing
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    Complete
                                                </span>
                                            );
                                        })()}
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                                        No assets match the current filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-200 text-[11px] text-slate-500">
                        Showing 1 to {Math.min(filtered.length, 50)} of {filtered.length} results
                    </div>
                )}
            </div>
        </>
    );
}

function AssetDetail({
    carrierId, assetId, assignment, viewMode, onBack,
}: {
    carrierId: string;
    assetId: string;
    assignment: CarrierComplianceAssignment;
    viewMode: ViewMode;
    onBack: () => void;
}) {
    const asset = useMemo(
        () => (CARRIER_ASSETS[carrierId] ?? []).find(a => a.id === assetId),
        [carrierId, assetId],
    );
    if (!asset) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
                Asset not found.
            </div>
        );
    }
    return (
        <ComplianceDetail
            scope="Asset"
            assignment={assignment}
            viewMode={viewMode}
            entityId={asset.id}
            contextHeader={
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                        <ArrowLeft size={14} /> Back to List
                    </button>
                    <span className="text-slate-300">|</span>
                    <span className="text-sm font-bold text-slate-900">
                        {asset.unitNumber} <span className="text-slate-500 font-normal">({asset.vin})</span>
                    </span>
                </div>
            }
        />
    );
}

// ─────────────────────────────────────────────────────────────────────────
// DRIVER LIST + DETAIL
// ─────────────────────────────────────────────────────────────────────────

function DriverListView({
    carrierId, assignment, onSelect,
}: {
    carrierId: string;
    assignment: CarrierComplianceAssignment;
    onSelect: (driverId: string) => void;
}) {
    const drivers = useMemo<any[]>(() => (CARRIER_DRIVERS[carrierId] ?? []) as any[], [carrierId]);
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return drivers;
        return drivers.filter(d => {
            const blob = `${d.name ?? ""} ${d.email ?? ""} ${d.id ?? ""} ${d.licenseNumber ?? ""}`.toLowerCase();
            return blob.includes(q);
        });
    }, [drivers, search]);

    const counts = useMemo(() => ({
        total:      drivers.length,
        active:     drivers.filter(d => d.status === 'Active').length,
        inactive:   drivers.filter(d => d.status === 'Inactive').length,
        onLeave:    drivers.filter(d => d.status === 'On Leave').length,
        terminated: drivers.filter(d => d.status === 'Terminated').length,
    }), [drivers]);

    const missingByDriver = useMemo(() => {
        const map = new Map<string, number>();
        for (const d of drivers) {
            const ea = getEntityAssignment(assignment, 'driver', d.id);
            const knSet = new Set(ea.enabledKeyNumberIds);
            const docSet = new Set(ea.enabledDocumentTypeIds);
            const kn = SEED_KEY_NUMBERS.filter(k => k.relatedTo === 'Driver' && k.status === 'Active' && knSet.has(k.id)).length;
            const doc = DOCUMENTS.filter(d2 => d2.scope === 'driver' && d2.status === 'Active' && docSet.has(d2.id)).length;
            map.set(d.id, kn + doc);
        }
        return map;
    }, [drivers, assignment]);

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <KpiTile label="Total Drivers"      value={counts.total}      Icon={Users}     accent="blue" />
                <KpiTile label="Active Drivers"     value={counts.active}     Icon={UserCheck} accent="emerald" />
                <KpiTile label="Inactive Drivers"   value={counts.inactive}   Icon={UserMinus} accent="slate" />
                <KpiTile label="On Leave"           value={counts.onLeave}    Icon={Clock}     accent="orange" />
                <KpiTile label="Terminated Drivers" value={counts.terminated} Icon={UserX}     accent="red" />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[260px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search drivers by name, ID, or email..."
                            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                        />
                    </div>
                    <button type="button" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50">
                        <Columns size={14} /> Columns <ChevronDown size={12} />
                    </button>
                    <button type="button" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50">
                        <Download size={14} /> Export
                    </button>
                    <button type="button" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm">
                        <Plus size={14} /> Add Driver
                    </button>
                </div>

                <div className="overflow-x-auto border-t border-slate-200">
                    <table className="min-w-full">
                        <thead className="bg-slate-50/50 border-b border-slate-200">
                            <tr className="text-left">
                                <Th>Driver Name</Th>
                                <Th>ID / Details</Th>
                                <Th>Status</Th>
                                <Th>Compliance</Th>
                                <Th>License</Th>
                                <Th>Contact</Th>
                                <Th className="text-right pr-5">Actions</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.slice(0, 50).map(d => (
                                <tr
                                    key={d.id}
                                    className="border-b border-slate-100 hover:bg-blue-50/30 cursor-pointer transition-colors"
                                    onClick={() => onSelect(d.id)}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                                                {d.avatarInitials ?? initialsFrom(d.name)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-slate-900 truncate">{d.name}</div>
                                                <div className="text-[11px] text-slate-500">Hired: {d.hiredDate}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-[11px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                            {d.id}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <DriverStatusPill status={d.status} />
                                    </td>
                                    <td className="px-4 py-3">
                                        {(() => {
                                            const m = missingByDriver.get(d.id) ?? 0;
                                            return m > 0 ? (
                                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-50 text-red-700 border border-red-200">
                                                    {m} MISSING
                                                </span>
                                            ) : (
                                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    COMPLETE
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div className="font-semibold text-slate-800">{d.licenseNumber}</div>
                                        <div className="text-[11px] text-slate-500">{d.licenseState} · Exp: {d.licenseExpiry}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div className="text-slate-700">{d.phone}</div>
                                        <div className="text-[11px] text-blue-600 truncate max-w-[180px]">{d.email}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right pr-5">
                                        <span className="text-sm font-semibold text-blue-600 hover:text-blue-800">Manage</span>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                                        No drivers match the current filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

function DriverDetail({
    carrierId, driverId, assignment, viewMode, onBack,
}: {
    carrierId: string;
    driverId: string;
    assignment: CarrierComplianceAssignment;
    viewMode: ViewMode;
    onBack: () => void;
}) {
    const driver = useMemo<any>(
        () => ((CARRIER_DRIVERS[carrierId] ?? []) as any[]).find(d => d.id === driverId),
        [carrierId, driverId],
    );
    if (!driver) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
                Driver not found.
            </div>
        );
    }
    return (
        <ComplianceDetail
            scope="Driver"
            assignment={assignment}
            viewMode={viewMode}
            entityId={driver.id}
            contextHeader={
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                        <ArrowLeft size={14} /> Back to List
                    </button>
                    <span className="text-slate-300">|</span>
                    <span className="text-sm font-bold text-slate-900">{driver.name}</span>
                </div>
            }
        />
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Reusable bits
// ─────────────────────────────────────────────────────────────────────────

const ACCENT_CLS = {
    red:     { border: 'border-l-red-500',     iconBg: 'bg-red-50',     iconColor: 'text-red-600' },
    orange:  { border: 'border-l-orange-500',  iconBg: 'bg-orange-50',  iconColor: 'text-orange-600' },
    amber:   { border: 'border-l-amber-500',   iconBg: 'bg-amber-50',   iconColor: 'text-amber-600' },
    yellow:  { border: 'border-l-yellow-500',  iconBg: 'bg-yellow-50',  iconColor: 'text-yellow-600' },
    blue:    { border: 'border-l-blue-500',    iconBg: 'bg-blue-50',    iconColor: 'text-blue-600' },
    emerald: { border: 'border-l-emerald-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    slate:   { border: 'border-l-slate-400',   iconBg: 'bg-slate-100',  iconColor: 'text-slate-600' },
} as const;

function KpiTile({
    label, value, Icon, accent,
}: {
    label: string;
    value: number | string;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    accent: keyof typeof ACCENT_CLS;
}) {
    const cls = ACCENT_CLS[accent];
    return (
        <div className={cn(
            "bg-white border border-slate-200 border-l-4 rounded-xl p-3 shadow-sm flex items-center justify-between gap-3",
            cls.border,
        )}>
            <div className="min-w-0">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-2", cls.iconBg)}>
                    <Icon size={14} className={cls.iconColor} />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                    {label}
                </div>
            </div>
            <div className="text-2xl font-black tabular-nums text-slate-900 leading-none">{value}</div>
        </div>
    );
}

function StatusPill({ status }: { status: 'Missing' | 'Active' | 'Optional' | 'Incomplete' }) {
    const cls = status === 'Active'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : status === 'Optional'
            ? 'bg-slate-100 text-slate-600 border-slate-200'
            : status === 'Incomplete'
                ? 'bg-orange-50 text-orange-700 border-orange-200'
                : 'bg-red-50 text-red-700 border-red-200';
    return (
        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border", cls)}>
            {status}
        </span>
    );
}

function DriverStatusPill({ status }: { status: string }) {
    const cls = status === 'Active'      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : status === 'Inactive'  ? 'bg-slate-100 text-slate-600 border-slate-200'
        : status === 'On Leave'  ? 'bg-amber-50 text-amber-700 border-amber-200'
        : status === 'Terminated'? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-slate-100 text-slate-600 border-slate-200';
    return (
        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border", cls)}>
            {status}
        </span>
    );
}

function OwnershipPill({ ownership }: { ownership: string }) {
    const cls = ownership === 'Owned'    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : ownership === 'Leased'   ? 'bg-amber-50 text-amber-700 border-amber-200'
        : ownership === 'Financed' ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-slate-100 text-slate-600 border-slate-200';
    return (
        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border", cls)}>
            {ownership}
        </span>
    );
}

function ReqChip({ label }: { label: string }) {
    return (
        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200">
            {label}
        </span>
    );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <th className={cn("px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500", className)}>
            {children}
        </th>
    );
}

function FragmentRows({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

function initialsFrom(name: string | undefined): string {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
