import { useEffect, useMemo, useState } from 'react';
import {
    FileText, ChevronDown, Info, ShieldCheck, Building2, Truck, User,
    Lock, Save, X,
    Shield, Calendar, PieChart, Award, Tag as TagIcon, Bookmark, Layers, Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    SEED_KEY_NUMBERS, DOCUMENTS,
} from '@/pages/admin/ComplianceAndDocumentsPage';
import {
    loadCarrierAssignment, saveCarrierAssignment, applyToggle,
    getEntityAssignment, toggleForEntity,
    DOC_IDS_BY_KN_ID, KN_ID_BY_DOC_ID, isSystemFormDoc,
    type CarrierComplianceAssignment, type EntityScope,
} from '@/pages/admin/carrier-compliance.data';
import {
    loadMonitoringConfigs, saveMonitoringConfigs, monitorItemKey,
    DEFAULT_MONITORING, type MonitoringConfig,
} from '@/pages/compliance/compliance-monitoring.data';
import { MonitoringNotificationsForm } from '@/components/compliance/MonitoringNotificationsForm';
import { KeyNumbersAssignment, DocumentsAssignment } from '@/pages/admin/CarrierComplianceSetupPage';
import { ACCOUNTS_DB } from '@/pages/accounts/accounts.data';
import { getDriversForAccount, getAssetsForAccount } from '@/pages/accounts/carrier-fleet.data';
import {
    loadTagSections,
    type DocTagSection, type TagColorTheme, type TagIconName,
} from '@/pages/settings/docu-form/document-tags.data';

/**
 * Settings â†’ Compliance Setup (carrier-facing).
 *
 * Scope-aware view of the root catalog. A Carrier / Driver / Asset switch
 * picks whose configuration we're editing:
 *   â€¢ Carrier  â€” the carrier-wide defaults (assignment + monitoring scope = carrierId)
 *   â€¢ Driver   â€” one driver's per-entity override (driverAssignments + monitoring scope = driverId)
 *   â€¢ Asset    â€” one asset's per-entity override  (assetAssignments + monitoring scope = assetId)
 *
 * Each row offers exactly two controls â€” **Enable/disable** and **Monitoring**
 * (a toggle + reminder summary + pencil for date-bearing items). The per-flag
 * columns and the catalog (names, requirements, linkage) stay root-managed.
 *
 * All writes land in the SAME stores the Super Admin / Service Profile
 * Carrier Compliance Setup reads (`ats:carrier-compliance-v2` and the
 * per-scope monitoring store), so changes here flow up the hierarchy and
 * back down for the matching carrier / driver / asset.
 */

type PageMode = 'compliance' | 'documents' | 'tags';
type ScopeKind = 'carrier' | 'driver' | 'asset';


const SCOPE_META: Record<ScopeKind, { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
    carrier: { label: 'Carrier Profile', icon: Building2 },
    driver:  { label: 'Driver',          icon: User },
    asset:   { label: 'Asset',           icon: Truck },
};

/** Inline monitoring controls passed to the tables (toggle + summary + edit pencil). */
type RowMonitoring = {
    cfgFor: (key: string) => MonitoringConfig;
    onToggle: (key: string, on: boolean) => void;
    onEdit: (key: string, name: string) => void;
};

export const SettingsCompliancePage = ({ accountId }: { accountId?: string } = {}) => {
    const [scope, setScope] = useState<ScopeKind>('carrier');
    const [pageMode, setPageMode] = useState<PageMode>('compliance');

    // The individual carrier profile being configured follows the top navbar
    // account switcher; fall back to the first carrier if none is selected.
    const carrierId = (accountId && ACCOUNTS_DB.some(c => c.id === accountId)) ? accountId : (ACCOUNTS_DB[0]?.id ?? '');
    const carrier = ACCOUNTS_DB.find(c => c.id === carrierId);
    const [assignment, setAssignment] = useState<CarrierComplianceAssignment>(() => loadCarrierAssignment(carrierId));

    useEffect(() => {
        if (!carrierId) return;
        setAssignment(loadCarrierAssignment(carrierId));
    }, [carrierId]);

    // Reset entity selection + scope back to Carrier when the carrier changes.
    useEffect(() => { setScope('carrier'); }, [carrierId]);

    // Drivers / assets for the picker (driver & asset scopes).
    const drivers = useMemo(() => getDriversForAccount(carrierId), [carrierId]);
    const assets = useMemo(() => getAssetsForAccount(carrierId), [carrierId]);
    const entities = scope === 'driver' ? drivers.map(d => ({ id: d.id, label: d.name }))
        : scope === 'asset' ? assets.map(a => ({ id: a.id, label: `${a.year} ${a.make} ${a.model} Â· #${a.unitNumber}` }))
        : [];

    const [entityId, setEntityId] = useState('');
    // Default the entity picker to the first available entity on scope change.
    useEffect(() => {
        if (scope === 'carrier') return;
        setEntityId(prev => entities.some(e => e.id === prev) ? prev : (entities[0]?.id ?? ''));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scope, carrierId]);

    const entityLabel = entities.find(e => e.id === entityId)?.label ?? '';

    // Active scope id drives BOTH the enabled sets and the monitoring store.
    const scopeId = scope === 'carrier' ? carrierId : entityId;

    // Resolve the enabled sets for the active scope.
    const entityAssignment = useMemo(
        () => (scope !== 'carrier' && entityId) ? getEntityAssignment(assignment, scope as EntityScope, entityId) : null,
        [assignment, scope, entityId],
    );
    const enabledKnSet = useMemo(() => new Set(
        scope === 'carrier' ? assignment.enabledKeyNumberIds : (entityAssignment?.enabledKeyNumberIds ?? []),
    ), [assignment, entityAssignment, scope]);
    const enabledDocSet = useMemo(() => new Set(
        scope === 'carrier' ? assignment.enabledDocumentTypeIds : (entityAssignment?.enabledDocumentTypeIds ?? []),
    ), [assignment, entityAssignment, scope]);

    // â”€â”€ Monitoring (per active scope id) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [monConfigs, setMonConfigs] = useState<Record<string, MonitoringConfig>>(() => loadMonitoringConfigs(carrierId));
    const [editingMonitor, setEditingMonitor] = useState<{ key: string; name: string } | null>(null);

    useEffect(() => {
        if (!scopeId) { setMonConfigs({}); return; }
        setMonConfigs(loadMonitoringConfigs(scopeId));
    }, [scopeId]);

    const monCfgFor = (key: string) => monConfigs[key] ?? DEFAULT_MONITORING;
    const setMonCfg = (key: string, cfg: MonitoringConfig) =>
        setMonConfigs(prev => { const next = { ...prev, [key]: cfg }; if (scopeId) saveMonitoringConfigs(scopeId, next); return next; });
    const rowMonitoring: RowMonitoring = {
        cfgFor: monCfgFor,
        onToggle: (key, on) => setMonCfg(key, { ...monCfgFor(key), enabled: on }),
        onEdit: (key, name) => setEditingMonitor({ key, name }),
    };

    // Only the items root has enabled for this carrier/entity are shown here
    // (system/form docs are always included). Disabled items don't appear.
    const catalogKeyNumbers = useMemo(
        () => SEED_KEY_NUMBERS.filter(k => k.status === 'Active' && enabledKnSet.has(k.id)),
        [enabledKnSet],
    );
    const catalogDocuments = useMemo(
        () => DOCUMENTS.filter(d => d.status === 'Active' && (enabledDocSet.has(d.id) || isSystemFormDoc(d))),
        [enabledDocSet],
    );

    const enabledKnCount  = catalogKeyNumbers.filter(k => enabledKnSet.has(k.id)).length;
    const enabledDocCount = catalogDocuments.filter(d => enabledDocSet.has(d.id)).length;

    /**
     * Keep monitoring in lockstep with field enablement: a date-bearing item
     * that gets enabled has its monitoring switched on; disabling turns it off.
     * Covers the toggled item AND its cascaded KNâ†”Doc partner.
     */
    const syncMonitoring = (kind: 'keynumber' | 'document', id: string, enable: boolean) => {
        if (!scopeId) return;
        const affected: { k: 'kn' | 'doc'; id: string }[] = [];
        if (kind === 'keynumber') {
            affected.push({ k: 'kn', id });
            for (const docId of DOC_IDS_BY_KN_ID.get(id) ?? []) affected.push({ k: 'doc', id: docId });
        } else {
            affected.push({ k: 'doc', id });
            const knId = KN_ID_BY_DOC_ID.get(id);
            if (knId) affected.push({ k: 'kn', id: knId });
        }
        const configs = loadMonitoringConfigs(scopeId);
        let changed = false;
        for (const a of affected) {
            const dateBearing = a.k === 'kn'
                ? (() => { const r = SEED_KEY_NUMBERS.find(x => x.id === a.id); return !!r && (r.hasExpiry || r.issueDateRequired); })()
                : (() => { const r = DOCUMENTS.find(x => x.id === a.id); return !!r && (r.expiryRequired || r.issueDateRequired); })();
            if (!dateBearing) continue;
            const key = monitorItemKey(a.k, a.id);
            const cur = configs[key] ?? DEFAULT_MONITORING;
            if (cur.enabled !== enable) { configs[key] = { ...cur, enabled: enable }; changed = true; }
        }
        if (changed) saveMonitoringConfigs(scopeId, configs);
    };

    /** Enable/disable a key number or document for the active scope (cascades links + monitoring). */
    const toggleEnabled = (kind: 'keynumber' | 'document', id: string, enable: boolean) => {
        setAssignment(prev => {
            const next = scope === 'carrier'
                ? applyToggle(prev, kind, id, enable).next
                : toggleForEntity(prev, scope as EntityScope, entityId, kind, id, enable);
            saveCarrierAssignment(next);
            return next;
        });
        syncMonitoring(kind, id, enable);
        if (scopeId) setMonConfigs(loadMonitoringConfigs(scopeId));
    };

    /** Enable all / Disable all for the visible rows. */
    const bulkToggle = (kind: 'keynumber' | 'document', ids: string[], enable: boolean) => {
        ids.forEach(id => toggleEnabled(kind, id, enable));
    };

    const changeScope = (next: ScopeKind) => {
        setScope(next);
        if (next !== 'carrier' && pageMode === 'tags') setPageMode('compliance');
    };

    const scopeBtn = (kind: ScopeKind) => {
        const Icon = SCOPE_META[kind].icon;
        return (
            <button
                key={kind}
                type="button"
                onClick={() => changeScope(kind)}
                className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold leading-5 transition-colors whitespace-nowrap",
                    scope === kind ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900",
                )}
            >
                <Icon size={14} /> {SCOPE_META[kind].label}
            </button>
        );
    };

    const pillBtn = (mode: PageMode, label: string) => (
        <button
            type="button"
            onClick={() => setPageMode(mode)}
            className={cn(
                "rounded-md px-4 py-1.5 text-[13px] font-semibold leading-5 transition-colors whitespace-nowrap",
                pageMode === mode ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900",
            )}
        >
            {label}
        </button>
    );

    const carrierName = carrier?.dbaName || carrier?.legalName || 'this carrier';
    const scopeNoun = scope === 'carrier' ? carrierName : (entityLabel || SCOPE_META[scope].label);

    return (
        <div className="flex h-full flex-col bg-slate-50/50">
            <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
                <div className="px-6 pt-4">
                    <nav className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500" aria-label="Breadcrumb">
                        <span>Settings</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-900">Compliance Setup</span>
                    </nav>
                </div>

                <div className="px-6 pb-4 flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            {pageMode === 'compliance' ? 'Key Numbers'
                                : pageMode === 'tags' ? 'Document Tags'
                                : 'Documents'}
                        </h1>
                        <p className="mt-0.5 text-sm text-slate-500">
                            {pageMode === 'tags'
                                ? `Document tag library available to ${carrierName}, managed by your administrator.`
                                : `Enable or disable which compliance items ${scopeNoun} tracks, and set monitoring for each.`}
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                        {/* Carrier / Driver / Asset scope switch */}
                        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                            {scopeBtn('carrier')}
                            {scopeBtn('driver')}
                            {scopeBtn('asset')}
                        </div>

                        {/* Entity picker (driver / asset scopes) */}
                        {scope !== 'carrier' && (
                            <div className="relative">
                                <select
                                    value={entityId}
                                    onChange={(e) => setEntityId(e.target.value)}
                                    className="h-9 w-72 appearance-none rounded-md border border-slate-300 bg-white pl-3 pr-9 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    {entities.length === 0 && <option value="">No {scope}s found</option>}
                                    {entities.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                                </select>
                                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-2.5 text-slate-400" />
                            </div>
                        )}

                        {/* Compliance / Documents / Document Tags (tags = carrier scope only) */}
                        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                            {pillBtn('compliance', 'Compliance')}
                            {pillBtn('documents',  'Documents')}
                            {scope === 'carrier' && pillBtn('tags', 'Document Tags')}
                        </div>
                    </div>
                </div>

                {/* Scope banner */}
                <div className="flex items-start gap-2 border-t border-slate-100 bg-blue-50/40 px-6 py-2.5">
                    <ShieldCheck size={14} className="mt-0.5 shrink-0 text-blue-600" />
                    <p className="text-[12px] text-blue-800">
                        {pageMode === 'tags' ? (
                            <>Document tags are managed by your account administrator and shown here read-only.</>
                        ) : scope === 'carrier' ? (
                            <>
                                Carrier-wide defaults. Toggle items on or off and set monitoring for {carrierName}.
                                <span className="font-semibold"> {enabledKnCount}</span> key numbers and{' '}
                                <span className="font-semibold">{enabledDocCount}</span> documents currently enabled.
                            </>
                        ) : !entityId ? (
                            <>Select a {scope} above to configure its compliance items.</>
                        ) : (
                            <>
                                Per-{scope} configuration for <span className="font-semibold">{entityLabel}</span> â€” overrides the carrier default for this {scope} only.
                                <span className="font-semibold"> {enabledKnCount}</span> key numbers and{' '}
                                <span className="font-semibold">{enabledDocCount}</span> documents currently enabled.
                            </>
                        )}
                    </p>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-6 py-6">
                {scope !== 'carrier' && !entityId ? (
                    <EmptyState
                        title={`No ${scope} selected`}
                        hint={entities.length === 0
                            ? `This carrier has no ${scope}s to configure.`
                            : `Choose a ${scope} from the picker above to set its compliance items.`}
                    />
                ) : (
                    <>
                        {pageMode === 'compliance' && (
                            <KeyNumbersAssignment
                                enabledIds={enabledKnSet}
                                onToggle={(id, enable) => toggleEnabled('keynumber', id, enable)}
                                onBulk={(ids, enable) => bulkToggle('keynumber', ids, enable)}
                                monitoring={rowMonitoring}
                                visibleIds={enabledKnSet}
                            />
                        )}
                        {pageMode === 'documents' && (
                            <DocumentsAssignment
                                enabledIds={enabledDocSet}
                                onToggle={(id, enable) => toggleEnabled('document', id, enable)}
                                onBulk={(ids, enable) => bulkToggle('document', ids, enable)}
                                monitoring={rowMonitoring}
                                visibleIds={enabledDocSet}
                            />
                        )}
                        {pageMode === 'tags' && scope === 'carrier' && (
                            <CarrierDocumentTagsView />
                        )}
                    </>
                )}
            </main>

            {editingMonitor && (
                <MonitoringEditModal
                    name={editingMonitor.name}
                    value={monCfgFor(editingMonitor.key)}
                    onSave={(cfg) => { setMonCfg(editingMonitor.key, cfg); setEditingMonitor(null); }}
                    onClose={() => setEditingMonitor(null)}
                />
            )}

        </div>
    );
};

// â”€â”€ Document Tags (read-only, root-managed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TAG_ICON_MAP: Record<TagIconName, React.ComponentType<{ size?: number; className?: string }>> = {
    Shield, FileText, Calendar, PieChart, Award, Tag: TagIcon, Bookmark, Layers, Hash,
};

const TAG_THEME_MAP: Record<TagColorTheme, { header: string; chip: string; dot: string }> = {
    blue:    { header: 'bg-blue-50 text-blue-600',       chip: 'border-blue-200 bg-blue-50 text-blue-700',          dot: 'bg-blue-500' },
    emerald: { header: 'bg-emerald-50 text-emerald-600', chip: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
    amber:   { header: 'bg-amber-50 text-amber-600',     chip: 'border-amber-200 bg-amber-50 text-amber-700',       dot: 'bg-amber-500' },
    violet:  { header: 'bg-violet-50 text-violet-600',   chip: 'border-violet-200 bg-violet-50 text-violet-700',    dot: 'bg-violet-500' },
    rose:    { header: 'bg-rose-50 text-rose-600',       chip: 'border-rose-200 bg-rose-50 text-rose-700',          dot: 'bg-rose-500' },
    indigo:  { header: 'bg-indigo-50 text-indigo-600',   chip: 'border-indigo-200 bg-indigo-50 text-indigo-700',    dot: 'bg-indigo-500' },
    cyan:    { header: 'bg-cyan-50 text-cyan-600',       chip: 'border-cyan-200 bg-cyan-50 text-cyan-700',          dot: 'bg-cyan-500' },
};

function CarrierDocumentTagsView() {
    const sections = useMemo<DocTagSection[]>(() => loadTagSections(), []);

    if (sections.length === 0) {
        return <EmptyState title="No document tags defined" hint="Your account administrator hasn't set up any document tags yet." />;
    }

    return (
        <div className="space-y-4">
            {sections.map(sec => {
                const Icon = TAG_ICON_MAP[sec.icon] ?? TagIcon;
                const theme = TAG_THEME_MAP[sec.colorTheme] ?? TAG_THEME_MAP.blue;
                return (
                    <div key={sec.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", theme.header)}>
                                    <Icon size={16} />
                                </span>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-slate-900">{sec.title}</h3>
                                    <p className="text-[12px] text-slate-500">{sec.description}</p>
                                </div>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                <Lock size={10} /> Read-only
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-3">
                            {sec.tags.length === 0 ? (
                                <span className="text-[12px] text-slate-400">No tags in this section.</span>
                            ) : sec.tags.map(t => (
                                <span
                                    key={t.id}
                                    className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium", theme.chip)}
                                >
                                    <span className={cn("h-1.5 w-1.5 rounded-full", theme.dot)} />
                                    {t.label}
                                </span>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}


function EmptyState({ title, hint }: { title: string; hint: string }) {
    return (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Info className="h-5 w-5 text-slate-400" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
            <p className="mt-1 text-[12px] text-slate-500">{hint}</p>
        </div>
    );
}

// â”€â”€ Monitoring edit modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MonitoringEditModal({ name, value, onSave, onClose }: {
    name: string; value: MonitoringConfig; onSave: (cfg: MonitoringConfig) => void; onClose: () => void;
}) {
    const [draft, setDraft] = useState<MonitoringConfig>(value);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="flex max-h-[90vh] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/30 px-6 py-5">
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-slate-900">Monitoring Settings</h3>
                        <p className="mt-0.5 truncate text-sm text-slate-500">{name}</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    <MonitoringNotificationsForm value={draft} onChange={setDraft} />
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={() => onSave(draft)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700">
                        <Save className="h-4 w-4" /> Save
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SettingsCompliancePage;
