import { useMemo, useState, useEffect } from "react";
import {
    FileText, Truck, User, LayoutGrid, Hash, CalendarX, FileWarning,
    Clock, AlertTriangle, Search, Plus, Columns, Edit3, ChevronDown,
    ArrowLeft, Download, Check, AlertCircle, FolderOpen,
    Users, UserCheck, UserMinus, UserX,
    RotateCcw, XCircle, UploadCloud, Paperclip, Link2, Link2Off,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DOCUMENTS, SEED_KEY_NUMBERS, DOCUMENT_CATEGORIES,
    type DocumentRow, type KeyNumberRow, type KeyNumberGroup,
} from "@/pages/admin/ComplianceAndDocumentsPage";
import {
    loadCarrierAssignment, effectiveDocFlags, effectiveKnFlags, getEntityAssignment,
    effectiveEntityKnFlags, effectiveEntityDocFlags, DOC_IDS_BY_KN_ID, KN_ID_BY_DOC_ID,
    type CarrierComplianceAssignment, type EntityScope,
} from "@/pages/admin/carrier-compliance.data";
import { ACCOUNTS_DB, type AccountRecord } from "@/pages/accounts/accounts.data";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-fleet.data";
import { CARRIER_ASSETS } from "@/pages/accounts/carrier-assets.data";
import type { Asset } from "@/pages/assets/assets.data";
import { useAppData } from "@/context/AppDataContext";
import { ComplianceKeyNumberModal, type ComplianceKeyNumberSave } from "@/components/compliance/ComplianceKeyNumberModal";
import { ComplianceUploadModal } from "@/components/compliance/ComplianceUploadModal";
import { ComplianceDataChips, type DataChipItem } from "@/components/compliance/ComplianceDataChips";
import type { KeyNumberValue, UploadedDocument } from "@/types/key-numbers.types";
import { Toggle } from "@/components/ui/toggle";
import { loadMonitoringConfigs, monitorItemKey, DEFAULT_MONITORING } from "@/pages/compliance/compliance-monitoring.data";
import { setEntityMonitoring, nextAlertIndicator, type MonitoringConfig } from "@/utils/entity-monitoring";

/** Storage key for an entered key-number value. Carrier scope keys by the
 *  catalog row id; per-entity (asset/driver) scope namespaces by entity id —
 *  mirrors the convention used by the legacy compliance page. */
function keyNumberStorageId(rowId: string, entityId?: string): string {
    return entityId ? `${entityId}_${rowId}` : rowId;
}

/** Composite key for an uploaded supporting document, scoped per entity.
 *  `kind` separates a key number's supporting doc ('kn') from a document row ('doc'). */
function uploadKey(kind: 'kn' | 'doc', rowId: string, entityId?: string): string {
    return `${kind}:${entityId ?? 'carrier'}:${rowId}`;
}

/** A key number needs a supporting document when Settings marks it Doc Required
 *  or the catalog links it to a document. */
function keyNumberNeedsDoc(kn: KeyNumberRow): boolean {
    return !!kn.docRequired || (DOC_IDS_BY_KN_ID.get(kn.id)?.length ?? 0) > 0;
}

const MON_TONE_CLASS: Record<string, string> = {
    ok: 'text-emerald-600', warning: 'text-amber-600 font-semibold', danger: 'text-rose-600 font-semibold', muted: 'text-slate-400',
};

/** Per-entity monitoring toggle + "next alert" indicator; "—" for non-date items. */
function MonitoringToggleCell({ dateBearing, rawExpiry, cfg, onToggle }: {
    dateBearing: boolean;
    rawExpiry: string | null;
    cfg: MonitoringConfig;
    onToggle: (enabled: boolean) => void;
}) {
    if (!dateBearing) return <span className="text-[11px] text-slate-300">—</span>;
    const ind = nextAlertIndicator(rawExpiry, cfg);
    return (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Toggle checked={cfg.enabled} onCheckedChange={(v) => onToggle(v)} />
            <span className={`text-[11px] whitespace-nowrap ${MON_TONE_CLASS[ind.tone]}`}>{ind.text}</span>
        </div>
    );
}

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

    // Driver/Asset detail views layer the per-individual requirement overrides
    // configured in Settings → Assignment on top of the carrier defaults, so
    // the profile reflects what was set up for this specific driver/asset.
    const isEntity = !!entityId && (scope === 'Driver' || scope === 'Asset');

    const keyNumbers = useMemo(() => {
        const entityScope = scope.toLowerCase() as EntityScope;
        return SEED_KEY_NUMBERS
            .filter(k => k.status === 'Active')
            .filter(k => k.relatedTo === scope)
            .filter(k => enabledKnSet.has(k.id))
            .map(k => isEntity
                ? effectiveEntityKnFlags(k, assignment, entityScope, entityId!)
                : effectiveKnFlags(k, assignment));
    }, [scope, assignment, enabledKnSet, isEntity, entityId]);

    const documents = useMemo(() => {
        const scopeKey = scope.toLowerCase() as 'carrier' | 'asset' | 'driver';
        const entityScope = scope.toLowerCase() as EntityScope;
        return DOCUMENTS
            .filter(d => d.status === 'Active')
            .filter(d => d.scope === scopeKey)
            .filter(d => enabledDocSet.has(d.id))
            .map(d => isEntity
                ? effectiveEntityDocFlags(d, assignment, entityScope, entityId!)
                : effectiveDocFlags(d, assignment));
    }, [scope, assignment, enabledDocSet, isEntity, entityId]);

    // KPI counts react to what's actually been entered / uploaded for this scope.
    const { keyNumberValues, documentUploads } = useAppData();
    const knValue = (id: string) => keyNumberValues[keyNumberStorageId(id, entityId)];
    const knDocUploaded = (id: string) => (documentUploads[uploadKey('kn', id, entityId)]?.length ?? 0) > 0;
    const docUploaded = (id: string) => (documentUploads[uploadKey('doc', id, entityId)]?.length ?? 0) > 0;

    const missingNumber = keyNumbers.filter(k => k.numberRequired && !knValue(k.id)?.value?.trim()).length;
    const missingExpiry = [
        ...keyNumbers.filter(k => k.hasExpiry && !knValue(k.id)?.expiryDate),
        ...documents.filter(d => d.expiryRequired && !documentUploads[uploadKey('doc', d.id, entityId)]?.[0]?.expiryDate),
    ].length;
    const missingDoc = documents.filter(d => d.requirementLevel !== 'optional' && !docUploaded(d.id)).length
        + keyNumbers.filter(k => keyNumberNeedsDoc(k) && !knDocUploaded(k.id)).length;
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
                <KeyNumbersCard keyNumbers={keyNumbers} scope={scope} entityId={entityId} monitorScopeId={entityId ?? assignment.carrierId} />
            ) : (
                <DocumentsCard documents={documents} entityId={entityId} monitorScopeId={entityId ?? assignment.carrierId} />
            )}
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// CARD SUB-TABS — group/category navigation shared by both lists
// ─────────────────────────────────────────────────────────────────────────

function CardTabs<T extends string>({ tabs, active, onChange }: {
    tabs: { id: T; label: string; count: number }[];
    active: T;
    onChange: (t: T) => void;
}) {
    return (
        <div className="border-y border-slate-200 bg-slate-50/40 px-5 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 -mb-px">
                {tabs.map(t => {
                    const isActive = active === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => onChange(t.id)}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-semibold whitespace-nowrap border-b-2 transition-colors",
                                isActive
                                    ? "text-blue-600 border-blue-600"
                                    : "text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300",
                            )}
                        >
                            {t.label}
                            <span className={cn(
                                "inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                                isActive ? "bg-blue-100 text-blue-700" : "bg-slate-200/70 text-slate-600",
                            )}>
                                {t.count}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// KEY NUMBERS CARD — group sub-tabs + value entry (no add; catalog is root)
// ─────────────────────────────────────────────────────────────────────────

function KeyNumbersCard({
    keyNumbers, scope, entityId, monitorScopeId,
}: {
    keyNumbers: KeyNumberRow[];
    scope: 'Carrier' | 'Asset' | 'Driver';
    entityId?: string;
    monitorScopeId: string;
}) {
    const { keyNumberValues, updateKeyNumberValue, documentUploads, uploadDocument } = useAppData();
    const [search, setSearch] = useState("");

    // Per-entity monitoring (same store as the Settings/Admin pages, keyed by carrier/entity id).
    const [mon, setMon] = useState<Record<string, MonitoringConfig>>(() => loadMonitoringConfigs(monitorScopeId));
    useEffect(() => { setMon(loadMonitoringConfigs(monitorScopeId)); }, [monitorScopeId]);
    const cfgFor = (id: string): MonitoringConfig => mon[monitorItemKey('kn', id)] ?? DEFAULT_MONITORING;
    const toggleMon = (kn: KeyNumberRow, enabled: boolean) => {
        const linked = DOC_IDS_BY_KN_ID.get(kn.id)?.[0];
        setEntityMonitoring(monitorScopeId, 'kn', kn.id, { ...cfgFor(kn.id), enabled }, linked);
        setMon(loadMonitoringConfigs(monitorScopeId));
    };
    const [activeGroup, setActiveGroup] = useState<KeyNumberGroup | 'All'>('All');
    // The form handles value + supporting-document upload; one Edit action per row.
    const [editRow, setEditRow] = useState<KeyNumberRow | null>(null);

    const uploadedDocsFor = (rowId: string): UploadedDocument[] =>
        documentUploads[uploadKey('kn', rowId, entityId)] ?? [];

    const valueFor = (rowId: string): KeyNumberValue | undefined =>
        keyNumberValues[keyNumberStorageId(rowId, entityId)];

    const handleSave = (rowId: string, payload: ComplianceKeyNumberSave) => {
        const storageId = keyNumberStorageId(rowId, entityId);
        const existingDocs = keyNumberValues[storageId]?.documents ?? [];
        updateKeyNumberValue(
            storageId, payload.value, payload.expiryDate, payload.issueDate,
            undefined, existingDocs, payload.issuingState, payload.issuingCountry,
        );
        if (payload.documents !== undefined) {
            uploadDocument(uploadKey('kn', rowId, entityId), payload.documents);
        }
    };

    const tabs = useMemo(() => {
        const present = KEY_NUMBER_GROUP_ORDER.filter(g => keyNumbers.some(k => k.group === g));
        return [
            { id: 'All' as KeyNumberGroup | 'All', label: 'All', count: keyNumbers.length },
            ...present.map(g => ({ id: g as KeyNumberGroup | 'All', label: g, count: keyNumbers.filter(k => k.group === g).length })),
        ];
    }, [keyNumbers]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return keyNumbers
            .filter(k => activeGroup === 'All' || k.group === activeGroup)
            .filter(k => !q || k.name.toLowerCase().includes(q));
    }, [keyNumbers, activeGroup, search]);

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-5 pb-4">
                <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FileText size={18} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">Key Numbers</h3>
                    <p className="text-[12px] text-slate-500">Enter values and upload supporting documents.</p>
                </div>
            </div>

            <CardTabs tabs={tabs} active={activeGroup} onChange={setActiveGroup} />

            <div className="px-5 py-3">
                <div className="relative max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search numbers..."
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                </div>
            </div>

            <div className="overflow-x-auto border-t border-slate-100">
                <table className="min-w-full">
                    <thead className="border-b border-slate-200 bg-slate-50/50">
                        <tr className="text-left">
                            <Th>Number Type</Th>
                            <Th>Value</Th>
                            <Th>Details</Th>
                            <Th>Status</Th>
                            <Th>Monitoring</Th>
                            <Th className="text-right pr-5">Actions</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
                                    {search
                                        ? "No key numbers match your search."
                                        : "No key numbers enabled for this carrier at this scope."}
                                </td>
                            </tr>
                        ) : rows.map(k => (
                            <KeyNumberTr
                                key={k.id}
                                kn={k}
                                value={valueFor(k.id)}
                                uploadedDocs={uploadedDocsFor(k.id)}
                                onEdit={() => setEditRow(k)}
                                monCfg={cfgFor(k.id)}
                                onToggleMon={(v) => toggleMon(k, v)}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            <ComplianceKeyNumberModal
                isOpen={editRow !== null}
                onClose={() => setEditRow(null)}
                mode="edit"
                scope={scope}
                availableKeyNumbers={keyNumbers}
                editRow={editRow}
                existingValue={editRow ? valueFor(editRow.id) ?? null : null}
                existingDocuments={editRow ? uploadedDocsFor(editRow.id) : []}
                onSave={handleSave}
            />
        </div>
    );
}

function KeyNumberTr({
    kn, value, uploadedDocs = [], onEdit, monCfg, onToggleMon,
}: {
    kn: KeyNumberRow;
    value?: KeyNumberValue;
    uploadedDocs?: UploadedDocument[];
    onEdit: () => void;
    monCfg: MonitoringConfig;
    onToggleMon: (enabled: boolean) => void;
}) {
    const uploadedDoc = uploadedDocs[0];
    const hasValue = !!value?.value?.trim();
    // Required-but-empty reads as Missing; entered reads as Active; otherwise Optional.
    const status: 'Missing' | 'Active' | 'Optional' = hasValue
        ? 'Active'
        : kn.numberRequired ? 'Missing' : 'Optional';
    const linkedDoc = kn.linkedDocumentTypeId
        ? DOCUMENTS.find(d => d.id === kn.linkedDocumentTypeId)
        : undefined;
    const detailItems: DataChipItem[] = [];
    if (kn.hasExpiry)            detailItems.push({ label: 'Expiry',  value: value?.expiryDate, required: true });
    if (kn.issueDateRequired)   detailItems.push({ label: 'Issue',   value: value?.issueDate, required: true });
    if (kn.issueStateRequired)  detailItems.push({ label: 'State',   value: value?.issuingState, required: true });
    if (kn.issueCountryRequired) detailItems.push({ label: 'Country', value: value?.issuingCountry, required: true });
    return (
        <tr className="border-b border-slate-100 hover:bg-slate-50/40 transition-colors">
            <td className="px-5 py-3 align-top">
                <div className="text-sm font-semibold text-slate-900">{kn.name}</div>
                {linkedDoc && (
                    <a className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1 mt-0.5" href="#" onClick={(e) => e.preventDefault()}>
                        <FileText size={10} /> Linked to: {linkedDoc.name}
                    </a>
                )}
                {uploadedDoc && (
                    <div className="mt-1 inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                        <Paperclip size={10} /> {uploadedDoc.fileName}
                    </div>
                )}
            </td>
            <td className="px-5 py-3 align-top text-sm">
                {hasValue
                    ? <span className="font-medium text-slate-800">{value!.value}</span>
                    : <span className="text-slate-400 italic">Not entered</span>}
            </td>
            <td className="px-5 py-3 align-top">
                {detailItems.length > 0
                    ? <ComplianceDataChips items={detailItems} />
                    : <span className="text-[11px] text-slate-400">—</span>}
            </td>
            <td className="px-5 py-3 align-top">
                <StatusPill status={status} />
            </td>
            <td className="px-5 py-3 align-top">
                <MonitoringToggleCell
                    dateBearing={!!(kn.hasExpiry || kn.issueDateRequired)}
                    rawExpiry={value?.expiryDate ?? null}
                    cfg={monCfg}
                    onToggle={onToggleMon}
                />
            </td>
            <td className="px-5 py-3 align-top text-right pr-5">
                <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                    title="Edit / enter value &amp; upload document"
                >
                    <Edit3 size={14} />
                </button>
            </td>
        </tr>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// DOCUMENTS CARD — when the user toggles to the Documents view
// ─────────────────────────────────────────────────────────────────────────

/** Shows whether a document is linked (key number / expense / module / Docu-Form). */
function DocumentLinkage({ doc }: { doc: DocumentRow }) {
    if (doc.linkedType === 'keynumber' && doc.linkedTo) {
        return <span className="inline-flex items-center gap-1 text-[11px] text-blue-600"><FileText size={10} /> Linked to: {doc.linkedTo}</span>;
    }
    if (doc.linkedType === 'expense' && doc.linkedTo) {
        return <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700"><FileText size={10} /> Linked to Expense: {doc.linkedTo}</span>;
    }
    if (doc.linkedType === 'module' && doc.linkedTo) {
        return <span className="inline-flex items-center gap-1 text-[11px] text-amber-700"><Link2 size={10} /> Linked to {doc.linkedTo}</span>;
    }
    if (doc.source === 'docu-form') {
        return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-600"><FileText size={10} /> Docu/Form</span>;
    }
    return <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><Link2Off size={10} /> Not linked</span>;
}

function DocumentsCard({ documents, entityId, monitorScopeId }: { documents: DocumentRow[]; entityId?: string; monitorScopeId: string }) {
    const { documentUploads, uploadDocument } = useAppData();
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [uploadRow, setUploadRow] = useState<DocumentRow | null>(null);

    // Per-entity monitoring — shared with the linked key number (same store + scope).
    const [mon, setMon] = useState<Record<string, MonitoringConfig>>(() => loadMonitoringConfigs(monitorScopeId));
    useEffect(() => { setMon(loadMonitoringConfigs(monitorScopeId)); }, [monitorScopeId]);
    const docCfgFor = (id: string): MonitoringConfig =>
        mon[monitorItemKey('doc', id)]
        ?? (KN_ID_BY_DOC_ID.get(id) ? mon[monitorItemKey('kn', KN_ID_BY_DOC_ID.get(id)!)] : undefined)
        ?? DEFAULT_MONITORING;
    const toggleDocMon = (d: DocumentRow, enabled: boolean) => {
        const linkedKn = KN_ID_BY_DOC_ID.get(d.id);
        setEntityMonitoring(monitorScopeId, 'doc', d.id, { ...docCfgFor(d.id), enabled }, linkedKn);
        setMon(loadMonitoringConfigs(monitorScopeId));
    };

    const uploadedFor = (id: string): UploadedDocument[] =>
        documentUploads[uploadKey('doc', id, entityId)] ?? [];
    const catOf = (d: DocumentRow) => d.category ?? 'Other';

    const tabs = useMemo(() => {
        const present = DOCUMENT_CATEGORIES.filter(c => documents.some(d => catOf(d) === c));
        return [
            { id: 'All', label: 'All', count: documents.length },
            ...present.map(c => ({ id: c as string, label: c, count: documents.filter(d => catOf(d) === c).length })),
        ];
    }, [documents]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return documents
            .filter(d => activeCategory === 'All' || catOf(d) === activeCategory)
            .filter(d => !q || d.name.toLowerCase().includes(q) || (d.category ?? '').toLowerCase().includes(q));
    }, [documents, activeCategory, search]);

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-5 pb-4">
                <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FolderOpen size={18} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">Documents</h3>
                    <p className="text-[12px] text-slate-500">Upload required documents and capture their details.</p>
                </div>
            </div>

            <CardTabs tabs={tabs} active={activeCategory} onChange={setActiveCategory} />

            <div className="px-5 py-3">
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

            <div className="overflow-x-auto border-t border-slate-100">
                <table className="min-w-full">
                    <thead className="border-b border-slate-200 bg-slate-50/50">
                        <tr className="text-left">
                            <Th>Document</Th>
                            <Th>Compliance Data</Th>
                            <Th>Status</Th>
                            <Th>Monitoring</Th>
                            <Th className="text-right pr-5">Actions</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">
                                    {search
                                        ? "No documents match your search."
                                        : "No documents enabled for this carrier at this scope."}
                                </td>
                            </tr>
                        ) : rows.map(d => {
                            const uploaded = uploadedFor(d.id);
                            const hasFiles = uploaded.length > 0;
                            const u = uploaded[0];
                            const status: 'Complete' | 'Optional' | 'Missing' = hasFiles
                                ? 'Complete'
                                : d.requirementLevel === 'optional' ? 'Optional' : 'Missing';
                            const dataItems: DataChipItem[] = [];
                            if (d.expiryRequired)       dataItems.push({ label: 'Expiry',  value: u?.expiryDate, required: true });
                            if (d.issueDateRequired)    dataItems.push({ label: 'Issue',   value: u?.issueDate, required: true });
                            if (d.issueStateRequired)   dataItems.push({ label: 'State',   value: u?.issuingState, required: true });
                            if (d.issueCountryRequired) dataItems.push({ label: 'Country', value: u?.issuingCountry, required: true });
                            return (
                                <tr key={d.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/40">
                                    <td className="px-5 py-3 align-top w-2/5">
                                        <div className="flex items-center gap-2">
                                            <FileText size={14} className="text-blue-600 shrink-0" />
                                            <span className="text-sm font-semibold text-slate-900">{d.name}</span>
                                        </div>
                                        <div className="mt-0.5 ml-6"><DocumentLinkage doc={d} /></div>
                                        {hasFiles && (
                                            <div className="mt-1 ml-6 flex flex-wrap gap-1">
                                                {uploaded.map(f => (
                                                    <span key={f.id} className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                                                        <Paperclip size={10} /> {f.fileName}
                                                        {f.expiryDate && <span className="text-emerald-500">· exp {f.expiryDate}</span>}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 align-top">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {dataItems.length > 0
                                                ? <ComplianceDataChips items={dataItems} />
                                                : <span className="text-[11px] text-slate-400">No extra fields</span>}
                                            {d.usedInHiring && (
                                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    Hiring
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 align-top">
                                        <StatusPill status={status} />
                                    </td>
                                    <td className="px-5 py-3 align-top">
                                        <MonitoringToggleCell
                                            dateBearing={!!(d.expiryRequired || d.issueDateRequired)}
                                            rawExpiry={u?.expiryDate ?? null}
                                            cfg={docCfgFor(d.id)}
                                            onToggle={(v) => toggleDocMon(d, v)}
                                        />
                                    </td>
                                    <td className="px-5 py-3 align-top text-right pr-5">
                                        <button
                                            type="button"
                                            onClick={() => setUploadRow(d)}
                                            className={cn(
                                                "inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100",
                                                hasFiles ? "text-emerald-600 hover:text-emerald-700" : "text-slate-400 hover:text-blue-600",
                                            )}
                                            title={hasFiles ? "Manage uploaded files" : "Upload document"}
                                        >
                                            <UploadCloud size={14} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <ComplianceUploadModal
                isOpen={uploadRow !== null}
                onClose={() => setUploadRow(null)}
                title={uploadRow ? uploadRow.name : ''}
                expiryRequired={!!uploadRow?.expiryRequired}
                issueDateRequired={!!uploadRow?.issueDateRequired}
                issueStateRequired={!!uploadRow?.issueStateRequired}
                issueCountryRequired={!!uploadRow?.issueCountryRequired}
                allowMultiple={!!uploadRow?.allowMultiple}
                numberOfSlots={uploadRow?.numberOfSlots}
                slotLabels={uploadRow?.slotLabels}
                existing={uploadRow ? uploadedFor(uploadRow.id) : null}
                onSave={(docs) => { if (uploadRow) uploadDocument(uploadKey('doc', uploadRow.id, entityId), docs); }}
            />
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

function StatusPill({ status }: { status: 'Missing' | 'Active' | 'Optional' | 'Incomplete' | 'Complete' }) {
    const cls = status === 'Active' || status === 'Complete'
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

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <th className={cn("px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500", className)}>
            {children}
        </th>
    );
}


function initialsFrom(name: string | undefined): string {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
