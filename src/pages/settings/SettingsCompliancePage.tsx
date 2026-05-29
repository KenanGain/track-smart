import { useEffect, useMemo, useState } from 'react';
import {
    FileText, Search, Filter, ChevronDown, Info, ShieldCheck, Building2, Truck, User,
    Pencil, Lock, Save, X, Link2, Link2Off, AlertCircle, Check,
    RotateCcw,
    Shield, Calendar, PieChart, Award, Tag as TagIcon, Bookmark, Layers, Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { SubTabs, type SubTab } from '@/components/ui/SubTabs';
import {
    SEED_KEY_NUMBERS, DOCUMENTS, KEY_NUMBER_GROUPS, DOCUMENT_CATEGORIES,
    type KeyNumberRow, type DocumentRow, type KeyNumberGroup,
    type DocumentsSubTabId, type RelatedToScope,
} from '@/pages/admin/ComplianceAndDocumentsPage';
import {
    loadCarrierAssignment, saveCarrierAssignment, patchKnOverride, patchDocOverride,
    effectiveKnFlags, effectiveDocFlags,
    getEntityAssignment, toggleForEntity, clearEntityAssignment,
    effectiveEntityKnFlags, effectiveEntityDocFlags,
    patchEntityKnOverride, patchEntityDocOverride,
    DOC_IDS_BY_KN_ID, KN_ID_BY_DOC_ID, isSystemFormDoc,
    type CarrierComplianceAssignment, type EntityScope,
} from '@/pages/admin/carrier-compliance.data';
import { ACCOUNTS_DB } from '@/pages/accounts/accounts.data';
import { CARRIER_DRIVERS } from '@/pages/accounts/carrier-fleet.data';
import { CARRIER_ASSETS } from '@/pages/accounts/carrier-assets.data';
import {
    loadTagSections,
    type DocTagSection, type TagColorTheme, type TagIconName,
} from '@/pages/settings/docu-form/document-tags.data';

/**
 * Settings → Compliance Setup.
 *
 * Carrier-scoped, read-mostly view of the root catalog. Shows only the key
 * numbers and documents Super Admin has enabled for this carrier (via
 * Carrier Compliance Setup). The carrier admin can tune the per-item
 * compliance flags here — those edits land in `knFlagOverrides` /
 * `docFlagOverrides` on the assignment so they don't bleed into the root
 * catalog or other carriers.
 *
 * What's intentionally NOT here vs. the Super Admin page:
 *   • No "Add Number to Category" / "Add Document Type" buttons (catalog is root-only)
 *   • No edit/delete actions per row
 *   • No "Doc Required" linking modal (linkage is root-defined; carrier inherits)
 *
 * Document Tags are shown read-only here — the carrier can see the tag library
 * their administrator manages, but can't add/rename/delete it.
 */

type PageMode = 'assignment' | 'compliance' | 'documents' | 'tags';

const RELATED_TO_ICON: Record<RelatedToScope, React.ComponentType<{ size?: number; className?: string }>> = {
    Carrier: Building2,
    Asset:   Truck,
    Driver:  User,
};

const SCOPE_LABEL: Record<Exclude<DocumentsSubTabId, 'all'>, string> = {
    carrier:   'Carrier',
    asset:     'Asset',
    driver:    'Driver',
    accidents: 'Accidents',
    violation: 'Violation',
};

const DOCUMENTS_SUB_TABS: SubTab<DocumentsSubTabId>[] = [
    { id: 'all',        label: 'All' },
    { id: 'carrier',    label: 'Carrier' },
    { id: 'asset',      label: 'Asset' },
    { id: 'driver',     label: 'Driver' },
    { id: 'accidents',  label: 'Accidents' },
    { id: 'violation',  label: 'Violation' },
];

export const SettingsCompliancePage = () => {
    const [pageMode, setPageMode] = useState<PageMode>('compliance');
    const [editingKn, setEditingKn] = useState<KeyNumberRow | null>(null);
    const [editingDoc, setEditingDoc] = useState<DocumentRow | null>(null);

    // Carrier scope — in production this would come from a carrier context;
    // for the prototype we pick the first carrier in the directory.
    const carrierId = ACCOUNTS_DB[0]?.id ?? '';
    const carrier = ACCOUNTS_DB.find(c => c.id === carrierId);
    const [assignment, setAssignment] = useState<CarrierComplianceAssignment>(() => loadCarrierAssignment(carrierId));

    useEffect(() => {
        if (!carrierId) return;
        setAssignment(loadCarrierAssignment(carrierId));
    }, [carrierId]);

    const enabledKnSet  = useMemo(() => new Set(assignment.enabledKeyNumberIds),     [assignment]);
    const enabledDocSet = useMemo(() => new Set(assignment.enabledDocumentTypeIds), [assignment]);

    /**
     * Resolve the rows visible to this carrier:
     *   • filter the catalog to the enabled ids
     *   • merge per-carrier flag overrides on top of each row
     */
    const visibleKeyNumbers = useMemo(() => SEED_KEY_NUMBERS
        .filter(k => enabledKnSet.has(k.id))
        .map(k => effectiveKnFlags(k, assignment)), [enabledKnSet, assignment]);

    const visibleDocuments = useMemo(() => DOCUMENTS
        .filter(d => enabledDocSet.has(d.id))
        .map(d => effectiveDocFlags(d, assignment)), [enabledDocSet, assignment]);

    // The main Compliance / Documents tabs show only carrier-level items.
    // Driver- and Asset-scoped items live under the Assignment tab, where they
    // get enabled and configured per individual driver/asset.
    const carrierKeyNumbers = useMemo(
        () => visibleKeyNumbers.filter(k => k.relatedTo === 'Carrier'),
        [visibleKeyNumbers],
    );
    const carrierDocuments = useMemo(
        () => visibleDocuments.filter(d => d.scope !== 'driver' && d.scope !== 'asset'),
        [visibleDocuments],
    );

    const patchKn = (id: string, patch: Partial<KeyNumberRow>) => {
        setAssignment(prev => {
            const next = patchKnOverride(prev, id, patch);
            saveCarrierAssignment(next);
            return next;
        });
    };
    const patchDoc = (id: string, patch: Partial<DocumentRow>) => {
        setAssignment(prev => {
            const next = patchDocOverride(prev, id, patch);
            saveCarrierAssignment(next);
            return next;
        });
    };

    const pillBtn = (mode: PageMode, label: string) => (
        <button
            type="button"
            onClick={() => setPageMode(mode)}
            className={cn(
                "rounded-md px-4 py-1.5 text-[13px] font-semibold leading-5 transition-colors whitespace-nowrap",
                pageMode === mode
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900",
            )}
        >
            {label}
        </button>
    );

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
                            {pageMode === 'assignment' ? 'Assignment'
                                : pageMode === 'compliance' ? 'Key Numbers'
                                : pageMode === 'tags' ? 'Document Tags'
                                : 'Documents'}
                        </h1>
                        <p className="mt-0.5 text-sm text-slate-500">
                            {pageMode === 'assignment'
                                ? `Enable which Driver and Asset documents and key numbers ${carrier?.dbaName || carrier?.legalName || 'this carrier'} tracks. Carrier-scope items are always on.`
                                : pageMode === 'tags'
                                    ? `Document tag library available to ${carrier?.dbaName || carrier?.legalName || 'this carrier'}, managed by your administrator.`
                                    : `Configure how ${carrier?.dbaName || carrier?.legalName || 'this carrier'} tracks compliance items enabled by your administrator.`}
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                            {pillBtn('compliance', 'Compliance')}
                            {pillBtn('documents',  'Documents')}
                            {pillBtn('tags',       'Document Tags')}
                            {pillBtn('assignment', 'Assignment')}
                        </div>
                    </div>
                </div>

                {/* Scope banner — clarifies what the carrier can and can't do here */}
                <div className="flex items-start gap-2 border-t border-slate-100 bg-blue-50/40 px-6 py-2.5">
                    <ShieldCheck size={14} className="mt-0.5 shrink-0 text-blue-600" />
                    <p className="text-[12px] text-blue-800">
                        {pageMode === 'tags' ? (
                            <>Document tags are managed by your account administrator and shown here read-only.</>
                        ) : (
                            <>
                                Catalog is managed by your account administrator. You can configure compliance flags below for each enabled item.
                                Showing <span className="font-semibold">{visibleKeyNumbers.length}</span> key numbers and{' '}
                                <span className="font-semibold">{visibleDocuments.length}</span> documents enabled for this carrier.
                            </>
                        )}
                    </p>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-6 py-6">
                {pageMode === 'assignment' && (
                    <AssignmentView
                        assignment={assignment}
                        onChange={(next) => {
                            setAssignment(next);
                            saveCarrierAssignment(next);
                        }}
                    />
                )}
                {pageMode === 'compliance' && (
                    <CarrierKeyNumbersView rows={carrierKeyNumbers} onPatch={patchKn} onEdit={setEditingKn} />
                )}
                {pageMode === 'documents' && (
                    <CarrierDocumentsView rows={carrierDocuments} onPatch={patchDoc} onEdit={setEditingDoc} />
                )}
                {pageMode === 'tags' && (
                    <CarrierDocumentTagsView />
                )}
            </main>

            {editingKn && (
                <CarrierKeyNumberEditModal
                    row={editingKn}
                    onSave={(patch) => { patchKn(editingKn.id, patch); setEditingKn(null); }}
                    onClose={() => setEditingKn(null)}
                />
            )}
            {editingDoc && (
                <CarrierDocumentEditModal
                    row={editingDoc}
                    onSave={(patch) => { patchDoc(editingDoc.id, patch); setEditingDoc(null); }}
                    onClose={() => setEditingDoc(null)}
                />
            )}
        </div>
    );
};

// ── Document Tags (read-only, root-managed) ───────────────────────────

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

// ── Compliance view ───────────────────────────────────────────────────

function CarrierKeyNumbersView({ rows, onPatch, onEdit }: {
    rows: KeyNumberRow[];
    onPatch: (id: string, patch: Partial<KeyNumberRow>) => void;
    onEdit: (row: KeyNumberRow) => void;
}) {
    const [activeGroup, setActiveGroup] = useState<KeyNumberGroup | 'All'>('All');
    const [query, setQuery] = useState('');

    const counts = useMemo(() => {
        const out = {} as Record<KeyNumberGroup, number>;
        for (const g of KEY_NUMBER_GROUPS) out[g] = 0;
        for (const r of rows) out[r.group] += 1;
        return out;
    }, [rows]);

    const tabs: SubTab<KeyNumberGroup | 'All'>[] = useMemo(
        () => [
            { id: 'All', label: `All (${rows.length})` },
            ...KEY_NUMBER_GROUPS.map(g => ({ id: g, label: `${g} (${counts[g]})` })),
        ],
        [counts, rows.length],
    );

    const q = query.trim().toLowerCase();
    const filtered = rows
        .filter(r => activeGroup === 'All' || r.group === activeGroup)
        .filter(r => !q || r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));

    if (rows.length === 0) {
        return (
            <EmptyState
                title="No key numbers enabled for this carrier"
                hint="Ask your account administrator to enable key numbers via Carrier Compliance Setup."
            />
        );
    }

    return (
        <div className="space-y-3">
            <SubTabs tabs={tabs} activeId={activeGroup} onChange={setActiveGroup} bordered={false} />

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <Toolbar query={query} onQueryChange={setQuery} placeholder="Search key numbers…" total={filtered.length} totalAll={rows.length} />
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px] text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                                <th className="px-4 py-3 w-[32%]">Number Name</th>
                                <th className="px-2 py-3 w-[7%] text-center">In Hiring /<br/>Form</th>
                                <th className="px-2 py-3 w-[7%] text-center">Number<br/>Required</th>
                                <th className="px-2 py-3 w-[7%] text-center">Doc<br/>Required</th>
                                <th className="px-2 py-3 w-[7%] text-center">Has<br/>Expiry</th>
                                <th className="px-2 py-3 w-[7%] text-center">Issue<br/>Date</th>
                                <th className="px-2 py-3 w-[7%] text-center">Issue<br/>State</th>
                                <th className="px-2 py-3 w-[7%] text-center">Issue<br/>Country</th>
                                <th className="px-3 py-3 w-[7%]">Status</th>
                                <th className="px-3 py-3 w-[5%] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center">
                                        <p className="text-sm font-medium text-slate-700">No key numbers in this category</p>
                                        <p className="mt-1 text-[12px] text-slate-500">Try a different tab or clear the search.</p>
                                    </td>
                                </tr>
                            ) : filtered.map(k => {
                                const linkedDocIds = DOC_IDS_BY_KN_ID.get(k.id) ?? [];
                                const linkedDocNames = linkedDocIds
                                    .map(id => DOCUMENTS.find(d => d.id === id)?.name)
                                    .filter((n): n is string => !!n);
                                return (
                                    <tr key={k.id} className="border-t border-slate-100 transition-colors hover:bg-blue-50/30">
                                        <td className="px-4 py-3 align-top">
                                            <p className="font-semibold text-slate-900">{k.name}</p>
                                            {linkedDocNames.length > 0 ? (
                                                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-blue-600">
                                                    <Link2 size={10} className="shrink-0" />
                                                    Linked to: {linkedDocNames.join(', ')}
                                                </p>
                                            ) : (
                                                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                                                    <Link2 size={10} className="shrink-0" />
                                                    Not linked
                                                </p>
                                            )}
                                            <p className="mt-0.5 text-[12px] text-slate-500">{k.description}</p>
                                        </td>
                                        <td className="px-2 py-3 align-top">
                                            <div className="flex justify-center">
                                                <Toggle checked={!!k.usedInHiring} onCheckedChange={(v) => onPatch(k.id, { usedInHiring: v })} />
                                            </div>
                                        </td>
                                        <td className="px-2 py-3 align-top">
                                            <div className="flex justify-center">
                                                <Toggle checked={k.numberRequired} onCheckedChange={(v) => onPatch(k.id, { numberRequired: v })} />
                                            </div>
                                        </td>
                                        <td className="px-2 py-3 align-top">
                                            <div className="flex justify-center">
                                                <Toggle checked={k.docRequired} onCheckedChange={(v) => onPatch(k.id, { docRequired: v })} />
                                            </div>
                                        </td>
                                        <td className="px-2 py-3 align-top">
                                            <div className="flex justify-center">
                                                <Toggle checked={k.hasExpiry} onCheckedChange={(v) => onPatch(k.id, { hasExpiry: v })} />
                                            </div>
                                        </td>
                                        <td className="px-2 py-3 align-top">
                                            <div className="flex justify-center">
                                                <Toggle checked={k.issueDateRequired} onCheckedChange={(v) => onPatch(k.id, { issueDateRequired: v })} />
                                            </div>
                                        </td>
                                        <td className="px-2 py-3 align-top">
                                            <div className="flex justify-center">
                                                <Toggle checked={k.issueStateRequired} onCheckedChange={(v) => onPatch(k.id, { issueStateRequired: v })} />
                                            </div>
                                        </td>
                                        <td className="px-2 py-3 align-top">
                                            <div className="flex justify-center">
                                                <Toggle checked={k.issueCountryRequired} onCheckedChange={(v) => onPatch(k.id, { issueCountryRequired: v })} />
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <StatusPill status={k.status} />
                                        </td>
                                        <td className="px-3 py-3 align-top text-right">
                                            <button
                                                type="button"
                                                onClick={() => onEdit(k)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                                                title="Edit compliance flags"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ── Documents view ────────────────────────────────────────────────────

function CarrierDocumentsView({ rows, onPatch, onEdit }: {
    rows: DocumentRow[];
    onPatch: (id: string, patch: Partial<DocumentRow>) => void;
    onEdit: (row: DocumentRow) => void;
}) {
    const [activeScope, setActiveScope] = useState<DocumentsSubTabId>('all');
    const [query, setQuery] = useState('');

    const counts = useMemo(() => {
        const out: Record<DocumentsSubTabId, number> = { all: 0, carrier: 0, asset: 0, driver: 0, accidents: 0, violation: 0 };
        for (const d of rows) {
            out.all += 1;
            out[d.scope] += 1;
        }
        return out;
    }, [rows]);

    // Driver/Asset documents are configured under the Assignment tab, so the
    // carrier-level Documents view only offers carrier / accidents / violation.
    const tabs: SubTab<DocumentsSubTabId>[] = useMemo(() => DOCUMENTS_SUB_TABS
        .filter(t => t.id !== 'asset' && t.id !== 'driver')
        .map(t => ({ ...t, label: `${t.label} (${counts[t.id]})` })), [counts]);

    const q = query.trim().toLowerCase();
    const filtered = rows
        .filter(d => activeScope === 'all' || d.scope === activeScope)
        .filter(d => !q || d.name.toLowerCase().includes(q) || (d.linkedTo ?? '').toLowerCase().includes(q));

    if (rows.length === 0) {
        return (
            <EmptyState
                title="No documents enabled for this carrier"
                hint="Ask your account administrator to enable documents via Carrier Compliance Setup."
            />
        );
    }

    return (
        <div className="space-y-3">
            <SubTabs tabs={tabs} activeId={activeScope} onChange={setActiveScope} bordered={false} />

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <Toolbar query={query} onQueryChange={setQuery} placeholder="Search documents…" total={filtered.length} totalAll={rows.length} />
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1400px] text-sm">
                        <thead className="bg-slate-50">
                            <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                                <th className="px-4 py-3 w-[22%]">Document Name</th>
                                <th className="px-3 py-3 w-[8%]">Category</th>
                                <th className="px-3 py-3 w-[9%]">Requirement</th>
                                <th className="px-2 py-3 w-[7%] text-center">In Hiring /<br/>Form</th>
                                <th className="px-2 py-3 w-[7%] text-center">Allow<br/>Multiple</th>
                                <th className="px-2 py-3 w-[7%] text-center">Expiry<br/>Req.</th>
                                <th className="px-2 py-3 w-[7%] text-center">Issue<br/>Date</th>
                                <th className="px-2 py-3 w-[7%] text-center">Issue<br/>State</th>
                                <th className="px-2 py-3 w-[7%] text-center">Issue<br/>Country</th>
                                <th className="px-3 py-3 w-[7%]">Status</th>
                                <th className="px-3 py-3 w-[5%] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center">
                                        <p className="text-sm font-medium text-slate-700">No documents in this scope</p>
                                        <p className="mt-1 text-[12px] text-slate-500">Try a different sub-tab or clear the search.</p>
                                    </td>
                                </tr>
                            ) : filtered.map(d => {
                                const linkedKnId = d.linkedKeyNumberId ?? KN_ID_BY_DOC_ID.get(d.id);
                                const linkedKnName = linkedKnId
                                    ? SEED_KEY_NUMBERS.find(k => k.id === linkedKnId)?.name
                                    : (d.linkedType === 'keynumber' ? d.linkedTo : undefined);
                                return (
                                <tr key={d.id} className="transition-colors hover:bg-blue-50/30">
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex items-start gap-2.5">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50">
                                                <FileText className="h-4 w-4 text-blue-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-900">{d.name}</p>
                                                {linkedKnName ? (
                                                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-blue-600">
                                                        <Link2 size={10} className="shrink-0" />
                                                        Linked to: {linkedKnName}
                                                    </p>
                                                ) : (
                                                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                                                        <Link2 size={10} className="shrink-0" />
                                                        Not linked
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 align-top text-sm text-slate-700">{SCOPE_LABEL[d.scope]}</td>
                                    <td className="px-3 py-3 align-top">
                                        <RequirementPillSm level={d.requirementLevel} />
                                    </td>
                                    <td className="px-2 py-3 align-top">
                                        <div className="flex justify-center">
                                            <Toggle checked={!!d.usedInHiring} onCheckedChange={(v) => onPatch(d.id, { usedInHiring: v })} />
                                        </div>
                                    </td>
                                    <td className="px-2 py-3 align-top">
                                        <div className="flex justify-center">
                                            <Toggle checked={!!d.allowMultiple} onCheckedChange={(v) => onPatch(d.id, { allowMultiple: v })} />
                                        </div>
                                    </td>
                                    <td className="px-2 py-3 align-top">
                                        <div className="flex justify-center">
                                            <Toggle checked={d.expiryRequired} onCheckedChange={(v) => onPatch(d.id, { expiryRequired: v })} />
                                        </div>
                                    </td>
                                    <td className="px-2 py-3 align-top">
                                        <div className="flex justify-center">
                                            <Toggle checked={d.issueDateRequired} onCheckedChange={(v) => onPatch(d.id, { issueDateRequired: v })} />
                                        </div>
                                    </td>
                                    <td className="px-2 py-3 align-top">
                                        <div className="flex justify-center">
                                            <Toggle checked={d.issueStateRequired} onCheckedChange={(v) => onPatch(d.id, { issueStateRequired: v })} />
                                        </div>
                                    </td>
                                    <td className="px-2 py-3 align-top">
                                        <div className="flex justify-center">
                                            <Toggle checked={d.issueCountryRequired} onCheckedChange={(v) => onPatch(d.id, { issueCountryRequired: v })} />
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 align-top">
                                        <StatusPill status={d.status === 'Draft' ? 'Inactive' : d.status} />
                                    </td>
                                    <td className="px-3 py-3 align-top text-right">
                                        <button
                                            type="button"
                                            onClick={() => onEdit(d)}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                                            title="Edit compliance flags"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ── Shared bits ────────────────────────────────────────────────────────

function Toolbar({ query, onQueryChange, placeholder, total, totalAll }: {
    query: string;
    onQueryChange: (q: string) => void;
    placeholder: string;
    total: number;
    totalAll: number;
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/40 px-4 py-3">
            <div className="flex items-center gap-2">
                <div className="relative">
                    <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
                    <input
                        value={query}
                        onChange={(e) => onQueryChange(e.target.value)}
                        placeholder={placeholder}
                        className="h-9 w-72 rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                    <Filter size={13} /> Filter <ChevronDown size={12} />
                </button>
            </div>
            <span className="text-[12px] text-slate-500">
                Showing <span className="font-semibold text-slate-800">{total}</span> of {totalAll}
            </span>
        </div>
    );
}

function RequirementPillSm({ level }: { level?: 'required' | 'optional' | 'not_required' }) {
    const v = level ?? 'required';
    const styles: Record<typeof v, string> = {
        required:     'border-blue-200 bg-blue-50 text-blue-700',
        optional:     'border-slate-200 bg-slate-50 text-slate-600',
        not_required: 'border-rose-200 bg-rose-50 text-rose-700',
    };
    const labels: Record<typeof v, string> = {
        required:     'Required',
        optional:     'Optional',
        not_required: 'Not Required',
    };
    return (
        <span className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
            styles[v],
        )}>
            {labels[v]}
        </span>
    );
}

function StatusPill({ status }: { status: 'Active' | 'Inactive' }) {
    return (
        <span className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
            status === 'Active'
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-100 text-slate-500",
        )}>
            {status}
        </span>
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

// ── Edit modals ────────────────────────────────────────────────────────

/**
 * Edit form for a key number, scoped to per-carrier flag overrides.
 * Catalog fields (name, description, related-to, status, linked document)
 * are read-only — those are root-managed. The carrier admin only adjusts
 * the compliance toggles, which save as overrides on the assignment.
 */
function CarrierKeyNumberEditModal({ row, onSave, onClose, entityName }: {
    row: KeyNumberRow;
    onSave: (patch: Partial<KeyNumberRow>) => void;
    onClose: () => void;
    /** When set, the modal edits a single driver/asset's flags instead of the carrier default. */
    entityName?: string;
}) {
    const [draft, setDraft] = useState({
        usedInHiring:         !!row.usedInHiring,
        numberRequired:       row.numberRequired,
        docRequired:          row.docRequired,
        hasExpiry:            row.hasExpiry,
        issueDateRequired:    row.issueDateRequired,
        issueStateRequired:   row.issueStateRequired,
        issueCountryRequired: row.issueCountryRequired,
    });
    const up = (p: Partial<typeof draft>) => setDraft(d => ({ ...d, ...p }));
    const RIcon = RELATED_TO_ICON[row.relatedTo];

    const linkedDocIds = DOC_IDS_BY_KN_ID.get(row.id) ?? [];
    const linkedDocNames = linkedDocIds
        .map(id => DOCUMENTS.find(d => d.id === id)?.name)
        .filter((n): n is string => !!n);

    return (
        <div
            role="dialog"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6"
            onClick={onClose}
        >
            <div
                className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Edit Compliance Flags</h3>
                        <p className="mt-0.5 text-[12px] text-slate-500">
                            {entityName ? <>Configuration for <span className="font-semibold text-slate-700">{row.name}</span> · <span className="font-semibold text-slate-700">{entityName}</span>.</>
                                        : <>Per-carrier configuration for <span className="font-semibold text-slate-700">{row.name}</span>.</>}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50/40 px-6 py-5">
                    {/* Read-only catalog info */}
                    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                        <div className="mb-2 flex items-center gap-2">
                            <Lock size={12} className="text-slate-400" />
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Catalog details (managed by administrator)
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <FieldRow label="Number Name" value={row.name} />
                            <FieldRow label="Related To" valueNode={
                                <span className="inline-flex items-center gap-1.5">
                                    <RIcon size={13} className="text-slate-400" /> {row.relatedTo}
                                </span>
                            } />
                            <FieldRow label="Group" value={row.group} />
                            <FieldRow label="Status" valueNode={<StatusPill status={row.status} />} />
                            <FieldRow
                                label="Description"
                                value={row.description}
                                span={2}
                            />
                            <FieldRow
                                label="Linked Documents"
                                valueNode={
                                    linkedDocNames.length === 0 ? (
                                        <span className="inline-flex items-center gap-1 text-slate-400">
                                            <Link2 size={11} /> Not linked
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-blue-600">
                                            <Link2 size={11} /> {linkedDocNames.join(', ')}
                                        </span>
                                    )
                                }
                                span={2}
                            />
                        </div>
                    </section>

                    {/* Editable compliance flags */}
                    <section className="rounded-xl border border-slate-200 bg-white">
                        <div className="border-b border-slate-100 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                {entityName ? `Compliance flags (${entityName})` : 'Compliance flags (per-carrier)'}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                                {entityName
                                    ? `Adjust how this key number behaves for ${entityName} only. The carrier default and other drivers/assets are unchanged.`
                                    : 'Adjust how this key number behaves for your carrier. Changes do not affect other carriers.'}
                            </p>
                        </div>
                        <div className="space-y-2 px-4 py-3">
                            <ToggleRow label="Used in Hiring / Templates / Form" help="Surfaces this number inside the Docu/Form Generator (hiring templates and applicant forms)"
                                checked={draft.usedInHiring}         onChange={(v) => up({ usedInHiring: v })} />
                            <ToggleRow label="Number Required"        help="Makes this number mandatory"
                                checked={draft.numberRequired}       onChange={(v) => up({ numberRequired: v })} />
                            <ToggleRow label="Doc Required"           help="Requires an upload + validates against document type"
                                checked={draft.docRequired}          onChange={(v) => up({ docRequired: v })} />
                            <ToggleRow label="Has Expiry"             help="Enables expiry and renewal tracking"
                                checked={draft.hasExpiry}            onChange={(v) => up({ hasExpiry: v })} />
                            <ToggleRow label="Issue Date Required"    help="Makes issue date mandatory"
                                checked={draft.issueDateRequired}    onChange={(v) => up({ issueDateRequired: v })} />
                            <ToggleRow label="Issue State Required"   help="Requires selection of issuing state/province"
                                checked={draft.issueStateRequired}   onChange={(v) => up({ issueStateRequired: v })} />
                            <ToggleRow label="Issue Country Required" help="Requires selection of issuing country"
                                checked={draft.issueCountryRequired} onChange={(v) => up({ issueCountryRequired: v })} />
                        </div>
                    </section>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-3">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSave(draft)} className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
                        <Save className="h-4 w-4" /> Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}

/**
 * Edit form for a document, scoped to per-carrier flag overrides.
 * Same locked-catalog / editable-flags split as the key number editor.
 */
function CarrierDocumentEditModal({ row, onSave, onClose, entityName }: {
    row: DocumentRow;
    onSave: (patch: Partial<DocumentRow>) => void;
    onClose: () => void;
    /** When set, the modal edits a single driver/asset's flags instead of the carrier default. */
    entityName?: string;
}) {
    const [draft, setDraft] = useState({
        usedInHiring:         !!row.usedInHiring,
        allowMultiple:        !!row.allowMultiple,
        expiryRequired:       row.expiryRequired,
        issueDateRequired:    row.issueDateRequired,
        issueStateRequired:   row.issueStateRequired,
        issueCountryRequired: row.issueCountryRequired,
    });
    const up = (p: Partial<typeof draft>) => setDraft(d => ({ ...d, ...p }));

    const linkedKnId = row.linkedKeyNumberId ?? KN_ID_BY_DOC_ID.get(row.id);
    const linkedKnName = linkedKnId
        ? SEED_KEY_NUMBERS.find(k => k.id === linkedKnId)?.name
        : (row.linkedType === 'keynumber' ? row.linkedTo : undefined);

    return (
        <div
            role="dialog"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6"
            onClick={onClose}
        >
            <div
                className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Edit Compliance Flags</h3>
                        <p className="mt-0.5 text-[12px] text-slate-500">
                            {entityName ? <>Configuration for <span className="font-semibold text-slate-700">{row.name}</span> · <span className="font-semibold text-slate-700">{entityName}</span>.</>
                                        : <>Per-carrier configuration for <span className="font-semibold text-slate-700">{row.name}</span>.</>}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50/40 px-6 py-5">
                    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                        <div className="mb-2 flex items-center gap-2">
                            <Lock size={12} className="text-slate-400" />
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Catalog details (managed by administrator)
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <FieldRow label="Document Name" value={row.name} />
                            <FieldRow label="Category" value={SCOPE_LABEL[row.scope]} />
                            <FieldRow label="Folder" value={row.folder} />
                            <FieldRow label="Status" valueNode={<StatusPill status={row.status === 'Draft' ? 'Inactive' : row.status} />} />
                            {row.description && <FieldRow label="Description" value={row.description} span={2} />}
                            <FieldRow
                                label="Linked Key Number"
                                valueNode={
                                    linkedKnName ? (
                                        <span className="inline-flex items-center gap-1 text-blue-600">
                                            <Link2 size={11} /> {linkedKnName}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-slate-400">
                                            <Link2 size={11} /> Not linked
                                        </span>
                                    )
                                }
                                span={2}
                            />
                        </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white">
                        <div className="border-b border-slate-100 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                {entityName ? `Compliance flags (${entityName})` : 'Compliance flags (per-carrier)'}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                                {entityName
                                    ? `Adjust how this document behaves for ${entityName} only. The carrier default and other drivers/assets are unchanged.`
                                    : 'Adjust how this document behaves for your carrier. Changes do not affect other carriers.'}
                            </p>
                        </div>
                        <div className="space-y-2 px-4 py-3">
                            <ToggleRow label="Used in Hiring / Templates / Form" help="Surfaces this doc inside hiring templates and applicant forms"
                                checked={draft.usedInHiring}         onChange={(v) => up({ usedInHiring: v })} />
                            <ToggleRow label="Allow Multiple"         help="More than one file per applicant"
                                checked={draft.allowMultiple}        onChange={(v) => up({ allowMultiple: v })} />
                            <ToggleRow label="Expiry Required"        help="Capture an expiry date on upload"
                                checked={draft.expiryRequired}       onChange={(v) => up({ expiryRequired: v })} />
                            <ToggleRow label="Issue Date Required"    help="Capture an issue date on upload"
                                checked={draft.issueDateRequired}    onChange={(v) => up({ issueDateRequired: v })} />
                            <ToggleRow label="Issue State Required"   help="Requires selection of issuing state/province"
                                checked={draft.issueStateRequired}   onChange={(v) => up({ issueStateRequired: v })} />
                            <ToggleRow label="Issue Country Required" help="Requires selection of issuing country"
                                checked={draft.issueCountryRequired} onChange={(v) => up({ issueCountryRequired: v })} />
                        </div>
                    </section>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-3">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSave(draft)} className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
                        <Save className="h-4 w-4" /> Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}

function FieldRow({ label, value, valueNode, span }: {
    label: string;
    value?: string;
    valueNode?: React.ReactNode;
    span?: 1 | 2;
}) {
    return (
        <div className={cn(span === 2 && "sm:col-span-2")}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <div className="mt-0.5 text-[13px] text-slate-800">{valueNode ?? value ?? '—'}</div>
        </div>
    );
}

function ToggleRow({ label, help, checked, onChange }: {
    label: string;
    help: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
            <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-800">{label}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{help}</p>
            </div>
            <Toggle checked={checked} onCheckedChange={onChange} />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// ASSIGNMENT VIEW
// Carrier-side enable/disable of Driver- and Asset-scoped Key Numbers and
// Documents. Carrier scope is read-only here (always on at the carrier
// level; tuned by Super Admin in Carrier Compliance Setup).
// Each toggle uses applyToggle() so linked KN↔Doc pairs cascade together.
// ─────────────────────────────────────────────────────────────────────────

type AssignmentScope = 'Driver' | 'Asset';
type AssignmentView2 = 'compliance' | 'documents';

interface EntityRow {
    id: string;
    name: string;
    sub?: string;
    initials?: string;
}

function AssignmentView({
    assignment, onChange,
}: {
    assignment: CarrierComplianceAssignment;
    onChange: (next: CarrierComplianceAssignment) => void;
}) {
    const [scope, setScope] = useState<AssignmentScope>('Driver');
    const [innerView, setInnerView] = useState<AssignmentView2>('compliance');
    const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
    const [activeGroup, setActiveGroup] = useState<string>('All');
    const [itemQuery, setItemQuery] = useState('');
    // Per-entity requirement editor — { kind, id } of the catalog row being configured.
    const [configuring, setConfiguring] = useState<{ kind: 'keynumber' | 'document'; id: string } | null>(null);

    // Reset selection + group when scope changes
    useEffect(() => {
        setSelectedEntityId(null);
        setActiveGroup('All');
        setConfiguring(null);
    }, [scope]);

    // Pull entities (drivers or assets) for the carrier in scope
    const entities = useMemo<EntityRow[]>(() => {
        if (scope === 'Driver') {
            const drivers = (CARRIER_DRIVERS[assignment.carrierId] ?? []) as any[];
            return drivers.map(d => ({
                id: d.id,
                name: d.name,
                sub: `Hired ${d.hiredDate ?? '—'} · ${d.licenseNumber ?? 'No license'}`,
                initials: d.avatarInitials ?? initialsFrom(d.name),
            }));
        }
        const assets = CARRIER_ASSETS[assignment.carrierId] ?? [];
        return assets.map(a => ({
            id: a.id,
            name: a.unitNumber,
            sub: `${a.assetType} · ${a.make} ${a.model}`,
            initials: a.unitNumber.slice(-2).toUpperCase(),
        }));
    }, [scope, assignment.carrierId]);

    // Auto-select the first entity when entering a scope
    useEffect(() => {
        if (entities.length === 0) setSelectedEntityId(null);
        else if (!entities.some(e => e.id === selectedEntityId)) {
            setSelectedEntityId(entities[0].id);
        }
    }, [entities, selectedEntityId]);

    const scopeKey = scope.toLowerCase() as EntityScope;

    // Catalog items at the carrier level for the current scope
    const carrierEnabledKnSet  = useMemo(() => new Set(assignment.enabledKeyNumberIds),     [assignment]);
    const carrierEnabledDocSet = useMemo(() => new Set(assignment.enabledDocumentTypeIds), [assignment]);

    const knCatalog = useMemo(
        () => SEED_KEY_NUMBERS
            .filter(k => k.status === 'Active' && k.relatedTo === scope && carrierEnabledKnSet.has(k.id)),
        [scope, carrierEnabledKnSet],
    );
    const docCatalog = useMemo(
        () => DOCUMENTS
            .filter(d => d.status === 'Active' && d.scope === scopeKey && carrierEnabledDocSet.has(d.id)),
        [scopeKey, carrierEnabledDocSet],
    );

    const knById  = useMemo(() => new Map(SEED_KEY_NUMBERS.map(k => [k.id, k])), []);
    const docById = useMemo(() => new Map(DOCUMENTS.map(d => [d.id, d])),         []);

    const selectedEntity = entities.find(e => e.id === selectedEntityId) ?? null;
    const entityAssignment = selectedEntity
        ? getEntityAssignment(assignment, scopeKey, selectedEntity.id)
        : null;
    const entityKnSet  = useMemo(
        () => new Set(entityAssignment?.enabledKeyNumberIds ?? []),
        [entityAssignment],
    );
    const entityDocSet = useMemo(
        () => new Set(entityAssignment?.enabledDocumentTypeIds ?? []),
        [entityAssignment],
    );

    // Group taxonomies: KN by KeyNumberGroup, Doc by folder
    const knGroupRows: { id: string; label: string; rows: KeyNumberRow[] }[] = useMemo(() => {
        const map = new Map<string, KeyNumberRow[]>();
        for (const k of knCatalog) {
            const arr = map.get(k.group) ?? [];
            arr.push(k);
            map.set(k.group, arr);
        }
        return KEY_NUMBER_GROUPS
            .filter(g => map.has(g))
            .map(g => ({ id: g, label: g, rows: map.get(g)! }));
    }, [knCatalog]);

    const docGroupRows: { id: string; label: string; rows: DocumentRow[] }[] = useMemo(() => {
        const map = new Map<string, DocumentRow[]>();
        for (const d of docCatalog) {
            const cat = d.category ?? 'Other';
            const arr = map.get(cat) ?? [];
            arr.push(d);
            map.set(cat, arr);
        }
        // Order groups by the canonical category order.
        return DOCUMENT_CATEGORIES
            .filter(c => map.has(c))
            .map(c => ({ id: c, label: c, rows: map.get(c)! }));
    }, [docCatalog]);

    // Keep active group valid when switching scope/view. Defaults to "All".
    useEffect(() => {
        const groups = innerView === 'compliance' ? knGroupRows : docGroupRows;
        if (groups.length === 0) { setActiveGroup(''); return; }
        if (activeGroup !== 'All' && !groups.some(g => g.id === activeGroup)) setActiveGroup('All');
    }, [innerView, knGroupRows, docGroupRows, activeGroup]);

    // Group sub-tabs — an "All" tab (every category) followed by each group.
    const groupTabs = useMemo<{ id: string; label: string; rows: (KeyNumberRow | DocumentRow)[] }[]>(() => {
        const groups = innerView === 'compliance' ? knGroupRows : docGroupRows;
        const allRows = groups.flatMap(g => g.rows as (KeyNumberRow | DocumentRow)[]);
        return [{ id: 'All', label: 'All', rows: allRows }, ...groups];
    }, [innerView, knGroupRows, docGroupRows]);

    // Active group rows + per-row filter
    const activeRows = useMemo<(KeyNumberRow | DocumentRow)[]>(() => {
        const g = groupTabs.find(x => x.id === activeGroup) ?? groupTabs[0];
        if (!g) return [];
        const q = itemQuery.trim().toLowerCase();
        if (!q) return g.rows;
        return g.rows.filter(r => {
            const blob = innerView === 'compliance'
                ? `${(r as KeyNumberRow).name} ${(r as KeyNumberRow).description}`
                : `${(r as DocumentRow).name} ${(r as DocumentRow).category ?? ''}`;
            return blob.toLowerCase().includes(q);
        });
    }, [innerView, groupTabs, activeGroup, itemQuery]);

    const activeEnabled = innerView === 'compliance'
        ? activeRows.filter(r => entityKnSet.has((r as KeyNumberRow).id)).length
        : activeRows.filter(r => entityDocSet.has((r as DocumentRow).id)).length;

    // Toggle handlers (cascade KN↔Doc through toggleForEntity)
    const onToggleKn = (id: string, enable: boolean) => {
        if (!selectedEntity) return;
        onChange(toggleForEntity(assignment, scopeKey, selectedEntity.id, 'keynumber', id, enable));
    };
    const onToggleDoc = (id: string, enable: boolean) => {
        if (!selectedEntity) return;
        onChange(toggleForEntity(assignment, scopeKey, selectedEntity.id, 'document', id, enable));
    };
    const onEnableAllInGroup = () => {
        if (!selectedEntity) return;
        let next = assignment;
        for (const r of activeRows) {
            const kind = innerView === 'compliance' ? 'keynumber' : 'document';
            next = toggleForEntity(next, scopeKey, selectedEntity.id, kind, r.id, true);
        }
        onChange(next);
    };
    const onDisableAllInGroup = () => {
        if (!selectedEntity) return;
        let next = assignment;
        for (const r of activeRows) {
            const kind = innerView === 'compliance' ? 'keynumber' : 'document';
            // System/form docs are mandatory — never disable them.
            if (kind === 'document' && isSystemFormDoc(r as DocumentRow)) continue;
            next = toggleForEntity(next, scopeKey, selectedEntity.id, kind, r.id, false);
        }
        onChange(next);
    };
    const onResetToDefault = () => {
        if (!selectedEntity) return;
        onChange(clearEntityAssignment(assignment, scopeKey, selectedEntity.id));
    };

    // Per-entity requirement-flag edits (inline toggles + Actions modal).
    const patchEntityKn = (id: string, patch: Partial<KeyNumberRow>) => {
        if (!selectedEntity) return;
        onChange(patchEntityKnOverride(assignment, scopeKey, selectedEntity.id, id, patch));
    };
    const patchEntityDoc = (id: string, patch: Partial<DocumentRow>) => {
        if (!selectedEntity) return;
        onChange(patchEntityDocOverride(assignment, scopeKey, selectedEntity.id, id, patch));
    };

    // Count only the items in this entity's scope (the entity's enabled set
    // inherits the whole carrier list by default, so size alone over-counts).
    const totalKn = knCatalog.length;
    const totalDoc = docCatalog.length;
    const enabledKn = useMemo(() => knCatalog.filter(k => entityKnSet.has(k.id)).length, [knCatalog, entityKnSet]);
    const enabledDoc = useMemo(() => docCatalog.filter(d => entityDocSet.has(d.id)).length, [docCatalog, entityDocSet]);

    return (
        <div className="space-y-5">
            {/* Scope picker + inner view (Compliance | Documents) — matches the
                Carrier Compliance Setup screenshot's top-right pill row. */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
                    {(['Driver', 'Asset'] as AssignmentScope[]).map(s => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => setScope(s)}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-semibold rounded-md transition-colors whitespace-nowrap",
                                scope === s ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900",
                            )}
                        >
                            {s === 'Driver' ? <User size={13} /> : <Truck size={13} />}
                            {s} assignments
                        </button>
                    ))}
                </div>
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                    {([
                        { id: 'compliance', label: 'Compliance' },
                        { id: 'documents',  label: 'Documents' },
                    ] as const).map(v => (
                        <button
                            key={v.id}
                            type="button"
                            onClick={() => setInnerView(v.id)}
                            className={cn(
                                "px-4 py-1.5 text-[13px] font-semibold rounded-md transition-colors",
                                innerView === v.id ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900",
                            )}
                        >
                            {v.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Configuring entity card — mirrors "Configuring Carrier" block */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="px-5 py-4 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Configuring {scope}
                        </label>
                        <div className="mt-1.5 relative">
                            <select
                                value={selectedEntityId ?? ''}
                                onChange={(e) => setSelectedEntityId(e.target.value)}
                                className="w-full h-10 pl-3 pr-9 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:bg-slate-50"
                                disabled={entities.length === 0}
                            >
                                {entities.length === 0 ? (
                                    <option value="">No {scope.toLowerCase()}s available</option>
                                ) : entities.map(e => (
                                    <option key={e.id} value={e.id}>{e.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                        </div>
                        {selectedEntity?.sub && (
                            <p className="mt-1 text-[11px] text-slate-500">{selectedEntity.sub}</p>
                        )}
                    </div>

                    <div className="flex items-start lg:items-end lg:justify-end">
                        <button
                            type="button"
                            onClick={onResetToDefault}
                            disabled={!selectedEntity}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RotateCcw size={13} /> Reset to default
                        </button>
                    </div>
                </div>

                {/* Progress bars (matches screenshot's KEY NUMBERS / DOCUMENTS pair) */}
                <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <ProgressLine label="KEY NUMBERS" enabled={enabledKn} total={totalKn} color="blue" />
                    <ProgressLine label="DOCUMENTS"   enabled={enabledDoc} total={totalDoc} color="violet" />
                </div>
            </div>

            {/* Empty states */}
            {entities.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center text-sm text-slate-500">
                    No {scope.toLowerCase()}s registered for this carrier.
                </div>
            ) : (innerView === 'compliance' ? knGroupRows : docGroupRows).length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center">
                    <AlertCircle size={20} className="text-amber-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">
                        No {scope.toLowerCase()}-scope {innerView === 'compliance' ? 'key numbers' : 'documents'} enabled at the carrier level
                    </p>
                    <p className="text-[12px] text-slate-500 mt-1 max-w-md mx-auto">
                        Ask your account administrator to enable items in <span className="font-semibold">Super Admin → Carrier Compliance Setup</span> first.
                    </p>
                </div>
            ) : (
                <>
                    {/* Group sub-tabs with per-group enabled/total counts (All first) */}
                    <div className="border-b border-slate-200 overflow-x-auto no-scrollbar">
                        <div className="flex items-center gap-1 -mb-px">
                            {groupTabs.map(g => {
                                const gEnabled = innerView === 'compliance'
                                    ? g.rows.filter(r => entityKnSet.has((r as KeyNumberRow).id)).length
                                    : g.rows.filter(r => entityDocSet.has((r as DocumentRow).id)).length;
                                const isActive = activeGroup === g.id;
                                return (
                                    <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => setActiveGroup(g.id)}
                                        className={cn(
                                            "px-4 py-3 text-[13px] font-semibold whitespace-nowrap border-b-2 transition-colors",
                                            isActive
                                                ? "text-blue-600 border-blue-600"
                                                : "text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300",
                                        )}
                                    >
                                        {g.label}
                                        <span className={cn(
                                            "ml-1.5 inline-flex items-center justify-center px-1.5 rounded-full text-[10px] font-bold tabular-nums",
                                            isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600",
                                        )}>
                                            {gEnabled}/{g.rows.length}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Filter bar */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 flex items-center gap-3 flex-wrap">
                        <div className="relative flex-1 min-w-[240px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={itemQuery}
                                onChange={(e) => setItemQuery(e.target.value)}
                                placeholder={`Search ${innerView === 'compliance' ? 'numbers' : 'documents'}...`}
                                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                            />
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold tabular-nums">
                            <Check size={11} strokeWidth={3} /> {activeEnabled}/{activeRows.length} enabled
                        </span>
                        <button
                            type="button"
                            onClick={onEnableAllInGroup}
                            disabled={!selectedEntity}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
                        >
                            <Check size={12} /> Enable all
                        </button>
                        <button
                            type="button"
                            onClick={onDisableAllInGroup}
                            disabled={!selectedEntity}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-red-200 bg-white text-[12px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                            <X size={12} /> Disable all
                        </button>
                    </div>

                    {/* Items table — per-individual requirement config. The Enabled
                        toggle picks which carrier-enabled items apply to this
                        driver/asset; the requirement toggles + Actions modal save
                        per-entity overrides and unlock only when the row is enabled. */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-[1100px] w-full">
                                <thead className="bg-slate-50/60 border-b border-slate-200">
                                    <tr className="text-left">
                                        <Th>{innerView === 'compliance' ? 'Number Name' : 'Document Name'}</Th>
                                        <Th>{innerView === 'compliance' ? 'Related To' : 'Category'}</Th>
                                        <FlagTh>In Hiring /<br/>Form</FlagTh>
                                        {innerView === 'compliance' ? (
                                            <>
                                                <FlagTh>Number<br/>Required</FlagTh>
                                                <FlagTh>Doc<br/>Required</FlagTh>
                                                <FlagTh>Has<br/>Expiry</FlagTh>
                                            </>
                                        ) : (
                                            <>
                                                <FlagTh>Allow<br/>Multiple</FlagTh>
                                                <FlagTh>Expiry<br/>Req.</FlagTh>
                                            </>
                                        )}
                                        <FlagTh>Issue<br/>Date</FlagTh>
                                        <FlagTh>Issue<br/>State</FlagTh>
                                        <FlagTh>Issue<br/>Country</FlagTh>
                                        <Th>Status</Th>
                                        <Th className="text-center">Enabled</Th>
                                        <Th className="text-right pr-5">Actions</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={innerView === 'compliance' ? 12 : 11} className="px-5 py-12 text-center text-sm text-slate-500">
                                                No items match your search.
                                            </td>
                                        </tr>
                                    ) : innerView === 'compliance' ? (
                                        (activeRows as KeyNumberRow[]).map(k => {
                                            const enabled = entityKnSet.has(k.id);
                                            const ef = effectiveEntityKnFlags(k, assignment, scopeKey, selectedEntity?.id ?? '');
                                            const RelatedIcon = RELATED_TO_ICON[k.relatedTo];
                                            return (
                                                <tr key={k.id} className={cn(
                                                    "border-b border-slate-100 last:border-b-0 transition-colors",
                                                    enabled ? "bg-blue-50/20 hover:bg-blue-50/40" : "hover:bg-slate-50/40",
                                                )}>
                                                    <td className="px-5 py-3 align-top">
                                                        <div className="text-sm font-semibold text-slate-900">{k.name}</div>
                                                        <div className="mt-0.5">{renderCascadeBadge(k.id, 'keynumber', entityDocSet, docById)}</div>
                                                        {k.description && <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{k.description}</div>}
                                                    </td>
                                                    <td className="px-3 py-3 align-top">
                                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                                                            <RelatedIcon size={12} className="text-slate-400" /> {k.relatedTo}
                                                        </span>
                                                    </td>
                                                    <FlagTd checked={!!ef.usedInHiring}       onChange={(v) => patchEntityKn(k.id, { usedInHiring: v })}         enabled={enabled} />
                                                    <FlagTd checked={ef.numberRequired}       onChange={(v) => patchEntityKn(k.id, { numberRequired: v })}       enabled={enabled} />
                                                    <FlagTd checked={ef.docRequired}          onChange={(v) => patchEntityKn(k.id, { docRequired: v })}          enabled={enabled} />
                                                    <FlagTd checked={ef.hasExpiry}            onChange={(v) => patchEntityKn(k.id, { hasExpiry: v })}            enabled={enabled} />
                                                    <FlagTd checked={ef.issueDateRequired}    onChange={(v) => patchEntityKn(k.id, { issueDateRequired: v })}    enabled={enabled} />
                                                    <FlagTd checked={ef.issueStateRequired}   onChange={(v) => patchEntityKn(k.id, { issueStateRequired: v })}   enabled={enabled} />
                                                    <FlagTd checked={ef.issueCountryRequired} onChange={(v) => patchEntityKn(k.id, { issueCountryRequired: v })} enabled={enabled} />
                                                    <td className="px-3 py-3 align-top"><StatusPill status={k.status} /></td>
                                                    <td className="px-3 py-3 align-top text-center">
                                                        <div className="flex justify-center">
                                                            <Toggle checked={enabled} onCheckedChange={(v) => onToggleKn(k.id, v)} />
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 align-top text-right pr-5">
                                                        <ConfigureBtn enabled={enabled} onClick={() => setConfiguring({ kind: 'keynumber', id: k.id })} />
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        (activeRows as DocumentRow[]).map(d => {
                                            // System/form docs are mandatory — always enabled & locked on.
                                            const mandatory = isSystemFormDoc(d);
                                            const enabled = entityDocSet.has(d.id) || mandatory;
                                            const ef = effectiveEntityDocFlags(d, assignment, scopeKey, selectedEntity?.id ?? '');
                                            const status: 'Active' | 'Inactive' = d.status === 'Draft' ? 'Inactive' : d.status;
                                            return (
                                                <tr key={d.id} className={cn(
                                                    "border-b border-slate-100 last:border-b-0 transition-colors",
                                                    enabled ? "bg-blue-50/20 hover:bg-blue-50/40" : "hover:bg-slate-50/40",
                                                )}>
                                                    <td className="px-5 py-3 align-top">
                                                        <div className="flex items-start gap-2">
                                                            <FileText size={14} className="text-blue-500 mt-0.5 shrink-0" />
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-sm font-semibold text-slate-900">{d.name}</span>
                                                                    {mandatory && (
                                                                        <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-600">
                                                                            Required
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="mt-0.5">{renderCascadeBadge(d.id, 'document', entityKnSet, knById)}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 align-top text-[13px] text-slate-700">{SCOPE_LABEL[d.scope]}</td>
                                                    <FlagTd checked={!!ef.usedInHiring}       onChange={(v) => patchEntityDoc(d.id, { usedInHiring: v })}        enabled={enabled} />
                                                    <FlagTd checked={!!ef.allowMultiple}      onChange={(v) => patchEntityDoc(d.id, { allowMultiple: v })}       enabled={enabled} />
                                                    <FlagTd checked={ef.expiryRequired}       onChange={(v) => patchEntityDoc(d.id, { expiryRequired: v })}      enabled={enabled} />
                                                    <FlagTd checked={ef.issueDateRequired}    onChange={(v) => patchEntityDoc(d.id, { issueDateRequired: v })}   enabled={enabled} />
                                                    <FlagTd checked={ef.issueStateRequired}   onChange={(v) => patchEntityDoc(d.id, { issueStateRequired: v })}  enabled={enabled} />
                                                    <FlagTd checked={ef.issueCountryRequired} onChange={(v) => patchEntityDoc(d.id, { issueCountryRequired: v })} enabled={enabled} />
                                                    <td className="px-3 py-3 align-top"><StatusPill status={status} /></td>
                                                    <td className="px-3 py-3 align-top">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            {mandatory && (
                                                                <Lock size={11} className="text-violet-400" aria-label="Always enabled — system/form document" />
                                                            )}
                                                            <span
                                                                className={cn(mandatory && "pointer-events-none")}
                                                                title={mandatory ? "Always enabled — system/form document" : undefined}
                                                            >
                                                                <Toggle checked={enabled} onCheckedChange={(v) => { if (!mandatory) onToggleDoc(d.id, v); }} />
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 align-top text-right pr-5">
                                                        <ConfigureBtn enabled={enabled} onClick={() => setConfiguring({ kind: 'document', id: d.id })} />
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Per-entity requirement editor — reuses the carrier flag modals,
                but saves to the selected driver/asset's flag overrides. */}
            {configuring && selectedEntity && (() => {
                if (configuring.kind === 'keynumber') {
                    const catalogRow = knById.get(configuring.id);
                    if (!catalogRow) return null;
                    const effRow = effectiveEntityKnFlags(catalogRow, assignment, scopeKey, selectedEntity.id);
                    return (
                        <CarrierKeyNumberEditModal
                            row={effRow}
                            entityName={selectedEntity.name}
                            onSave={(patch) => { patchEntityKn(configuring.id, patch); setConfiguring(null); }}
                            onClose={() => setConfiguring(null)}
                        />
                    );
                }
                const catalogRow = docById.get(configuring.id);
                if (!catalogRow) return null;
                const effRow = effectiveEntityDocFlags(catalogRow, assignment, scopeKey, selectedEntity.id);
                return (
                    <CarrierDocumentEditModal
                        row={effRow}
                        entityName={selectedEntity.name}
                        onSave={(patch) => { patchEntityDoc(configuring.id, patch); setConfiguring(null); }}
                        onClose={() => setConfiguring(null)}
                    />
                );
            })()}
        </div>
    );
}

// ── Reusable bits for the new Assignment table ──────────────────────────

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <th className={cn("px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500", className)}>
            {children}
        </th>
    );
}

/** Compact, centered 2-line header cell for a requirement-flag column. */
function FlagTh({ children }: { children: React.ReactNode }) {
    return (
        <th className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider leading-tight text-slate-500">
            {children}
        </th>
    );
}

/** Centered requirement-flag toggle cell — locked when the row isn't enabled. */
function FlagTd({ checked, onChange, enabled }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    enabled: boolean;
}) {
    return (
        <td className="px-2 py-3 align-top">
            <div className="flex justify-center">
                <Toggle checked={checked} onCheckedChange={onChange} disabled={!enabled} />
            </div>
        </td>
    );
}

/** Actions pencil — opens the full per-entity flag editor; locked when disabled. */
function ConfigureBtn({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!enabled}
            title={enabled ? 'Edit all requirement flags for this item' : 'Enable this item to configure its requirements'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
        >
            <Pencil size={14} />
        </button>
    );
}

function ProgressLine({ label, enabled, total, color }: {
    label: string;
    enabled: number;
    total: number;
    color: 'blue' | 'violet';
}) {
    const pct = total > 0 ? Math.round((enabled / total) * 100) : 0;
    const fill = color === 'blue' ? 'bg-blue-500' : 'bg-violet-500';
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
                <span className="text-[11px] font-bold tabular-nums text-slate-700">
                    <span className={color === 'blue' ? 'text-blue-700' : 'text-violet-700'}>{enabled}</span>
                    <span className="text-slate-400">/{total}</span>
                </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={cn("h-full transition-all", fill)} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

// Cascade badge that mirrors the "X cascade(s)" link style from the
// Carrier Compliance Setup screenshot. Green when the linked partner is
// also enabled for this entity, amber when out of sync, grey when standalone.
function renderCascadeBadge(
    rowId: string,
    kind: 'keynumber' | 'document',
    partnerEnabledSet: Set<string>,
    partnerById: Map<string, { id: string; name: string }>,
): React.ReactNode {
    const partnerIds = kind === 'keynumber'
        ? (DOC_IDS_BY_KN_ID.get(rowId) ?? [])
        : (KN_ID_BY_DOC_ID.get(rowId) ? [KN_ID_BY_DOC_ID.get(rowId)!] : []);
    if (partnerIds.length === 0) {
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                <Link2Off size={11} /> —
            </span>
        );
    }
    const resolved = partnerIds.map(id => ({
        id,
        name: partnerById.get(id)?.name ?? '—',
        enabled: partnerEnabledSet.has(id),
    }));
    const allHealthy = resolved.every(r => r.enabled);
    const allBroken = resolved.every(r => !r.enabled);
    const cls = allHealthy
        ? "text-emerald-700"
        : allBroken
            ? "text-slate-500"
            : "text-amber-700";
    const Icon = allHealthy ? Link2 : allBroken ? Link2Off : AlertCircle;
    const label = `${resolved.length} cascade${resolved.length === 1 ? '' : 's'}`;
    const titles = resolved.map(r => `${r.name}${r.enabled ? '' : ' (disabled)'}`).join(', ');
    return (
        <span
            className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", cls)}
            title={titles}
        >
            <Icon size={11} /> {label}
        </span>
    );
}

function initialsFrom(name: string | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}





export default SettingsCompliancePage;
