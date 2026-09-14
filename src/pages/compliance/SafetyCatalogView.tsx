import { useEffect, useMemo, useState } from 'react';
import {
    Building2, Truck, User, FileText, Hash, CalendarClock, Calendar,
    ShieldCheck, Layers, Info, MapPin, Activity,
    Search, Columns, Check, ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight,
    ClipboardList, Table2, X, Eye, SquarePen, Sparkles, History, Plus, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    SAFETY_RECORDS, SAFETY_CATEGORY_ORDER, RECORD_TYPE_ORDER, RECORD_TYPE_LABEL,
    ENTITY_ORDER, isDateMonitored, UPLOAD_MODE_LABEL, DEFAULT_CUSTOM_FORM, defaultVersionLabel, recordFields,
    type SafetyRecord, type RecordTypeId, type EntityId, type UploadMode, type CustomFormConfig,
    SAFETY_CATEGORIES_BY_ENTITY, type SafetyCategory,
} from '@/pages/compliance/safety-software-catalog.data';
import { useCustomSafetyRecords, newCustomRecordId } from '@/pages/compliance/safety-custom-records.data';
import { useSafetyTags } from '@/pages/compliance/safety-tags.data';
import { VersionFields, fillVersionDemo, seedMonitoring } from '@/pages/compliance/DefaultComplianceDataPage';
import { blankVersion, type DocVersion } from '@/pages/compliance/compliance-data-store';

/**
 * Settings → New Compliance & Documents — read-only classification catalog.
 *
 *   • Top-right switch  → filter by RECORD TYPE (Compliance & Documents / Compliance / Document).
 *   • Carrier / Asset / Driver tabs → filter by entity.
 *   • One "Records" list with category sub-tabs, plus search, column show/hide,
 *     column sorting, and pagination (25 default, up to 100).
 */

const ENTITY_ICON: Record<EntityId, React.ComponentType<{ size?: number; className?: string }>> = {
    Carrier: Building2,
    Asset: Truck,
    Driver: User,
};

const RECORD_TYPE_TONE: Record<RecordTypeId, string> = {
    C: 'border-blue-200 bg-blue-50 text-blue-700',
    D: 'border-violet-200 bg-violet-50 text-violet-700',
    DC: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

/** Short labels for the in-row Category column (the sub-tabs carry the full names). */
const CATEGORY_SHORT: Record<SafetyCategory, string> = {
    // Carrier
    'Operating Authority': 'Operating Authority',
    'Safety & Regulatory Permits': 'Safety & Permits',
    'Carrier Codes & Certifications': 'Codes & Certifications',
    'Insurance': 'Insurance',
    // Driver
    'Personal Documents': 'Personal',
    'Travel Documents': 'Travel',
    'Abstracts & Annual Reviews': 'Abstracts & Reviews',
    'Pre-Employment': 'Pre-Employment',
    'Disciplinary Records': 'Disciplinary',
    // Asset
    'Regulatory and Safety Numbers': 'Regulatory & Safety',
    'Tax and Business Identification Numbers': 'Tax & Business ID',
    'Carrier & Industry Codes': 'Carrier & Industry',
    'Bond and Registration Numbers': 'Bond & Registration',
    'Other': 'Other',
};

// ── Column model — drives sorting, show/hide and rendering ─────────────

type ColumnId = 'record' | 'category' | 'entity' | 'type' | 'document' | 'monitoring' | 'jurisdiction';

interface ColumnDef {
    id: ColumnId;
    label: string;
    sortable: boolean;
    /** Cannot be hidden (keeps the list meaningful). */
    locked?: boolean;
    sortValue: (r: SafetyRecord) => string;
    render: (r: SafetyRecord) => React.ReactNode;
    cellClassName?: string;
}

const COLUMNS: ColumnDef[] = [
    {
        id: 'record', label: 'Record & Fields', sortable: true, locked: true,
        sortValue: r => r.recordName, cellClassName: 'w-[30%]',
        render: r => (
            <>
                <div className="flex items-center gap-1.5">
                    <div className="text-sm font-semibold text-slate-900">{r.recordName}</div>
                    {r.custom && <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700"><Sparkles size={8} /> Custom</span>}
                </div>
                {r.description && <div className="mt-0.5 text-[11px] leading-snug text-slate-500">{r.description}</div>}
                <div className="mt-1 flex flex-wrap gap-1.5">
                    {r.numberName && (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                            <Hash size={9} /> {r.numberName}
                        </span>
                    )}
                    {r.documentName && (
                        <span className="inline-flex items-center gap-1 rounded bg-violet-50 border border-violet-200 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                            <FileText size={9} /> {r.documentName}
                        </span>
                    )}
                </div>
                {r.note && <p className="mt-1 text-[11px] leading-snug text-slate-400 italic">{r.note}</p>}
            </>
        ),
    },
    {
        id: 'category', label: 'Category', sortable: true,
        sortValue: r => r.category,
        render: r => (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 whitespace-nowrap">
                {CATEGORY_SHORT[r.category]}
            </span>
        ),
    },
    {
        id: 'entity', label: 'Entity', sortable: true,
        sortValue: r => r.entity,
        render: r => {
            const Icon = ENTITY_ICON[r.entity];
            return (
                <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-700">
                    <Icon size={14} className="text-slate-400" /> {r.entity}
                </span>
            );
        },
    },
    {
        id: 'type', label: 'Record Type', sortable: true,
        sortValue: r => RECORD_TYPE_LABEL[r.type],
        render: r => (
            <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap', RECORD_TYPE_TONE[r.type])}>
                {RECORD_TYPE_LABEL[r.type]}
            </span>
        ),
    },
    {
        id: 'document', label: 'Document', sortable: true,
        sortValue: r => r.docRequirement,
        render: r => (
            <div className="space-y-1">
                <RequirementPill r={r} />
                {r.uploadMode && <UploadModeChip mode={r.uploadMode} />}
            </div>
        ),
    },
    {
        id: 'monitoring', label: 'Monitoring', sortable: true,
        sortValue: r => (r.configuredDate ?? '') + r.monitorType,
        render: r => (
            <div title={r.monitor}>
                <MonitoringCell r={r} />
                <div className="mt-0.5 text-[10px] text-slate-400">Recurring: {r.recurring}</div>
            </div>
        ),
    },
    {
        id: 'jurisdiction', label: 'Jurisdiction', sortable: true,
        sortValue: r => r.jurisdiction,
        render: r => (
            <span className="inline-flex items-start gap-1 text-[12px] text-slate-600 max-w-[220px]">
                <MapPin size={12} className="mt-0.5 shrink-0 text-slate-400" />
                <span>{r.jurisdiction}</span>
            </span>
        ),
    },
];

const ALL_COLUMN_IDS = COLUMNS.map(c => c.id);
const PAGE_SIZES = [10, 25, 50, 100];

/** Free-text search haystack for a record. */
function searchBlob(r: SafetyRecord): string {
    return [
        r.recordName, r.description, r.numberName, r.documentName, r.category, CATEGORY_SHORT[r.category],
        r.entity, RECORD_TYPE_LABEL[r.type], r.docRequirement, r.monitorType, r.configuredDate ?? '',
        r.jurisdiction, r.recurring, r.note ?? '', r.uploadMode ? UPLOAD_MODE_LABEL[r.uploadMode] : '',
    ].join(' ').toLowerCase();
}

// ── Page ──────────────────────────────────────────────────────────────

export function SafetyCatalogView({ accountId }: { accountId?: string }) {
    const [entity, setEntity] = useState<EntityId>('Carrier');
    // Column visibility is held here so it persists across record-type / entity switches.
    const [visibleCols, setVisibleCols] = useState<Set<ColumnId>>(() => new Set(ALL_COLUMN_IDS));
    // This carrier's user-created custom records (editable & deletable) merged into the system-default catalog.
    const { records: customRecords, add: addCustom, update: updateCustom, remove: removeCustom } = useCustomSafetyRecords(accountId);
    const [customModal, setCustomModal] = useState<{ mode: 'add' | 'edit'; record?: SafetyRecord } | null>(null);
    const [pendingDelete, setPendingDelete] = useState<SafetyRecord | null>(null);

    // This carrier's custom records (editable / deletable) shown first, then the read-only system defaults.
    const records = useMemo(() => [...customRecords, ...SAFETY_RECORDS], [customRecords]);

    // Global counts (independent of the current entity tab) for the switch badges.
    const typeCounts = useMemo(() => {
        const m: Record<RecordTypeId, number> = { C: 0, D: 0, DC: 0 };
        for (const r of records) m[r.type]++;
        return m;
    }, [records]);

    // Per-entity counts across every record type.
    const entityCounts = useMemo(() => {
        const m: Record<EntityId, number> = { Carrier: 0, Asset: 0, Driver: 0 };
        for (const r of records) m[r.entity]++;
        return m;
    }, [records]);

    const rows = useMemo(
        () => records.filter(r => r.entity === entity),
        [records, entity],
    );

    return (
        <div className="flex-1 bg-slate-50 min-h-screen">
            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-slate-900">New Compliance &amp; Documents</h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {records.length} records — system-default classification plus any custom records you add.
                        </p>
                    </div>
                    <button type="button" onClick={() => setCustomModal({ mode: 'add' })}
                        className="inline-flex shrink-0 items-center gap-1.5 h-9 px-3.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm">
                        <Plus size={15} /> Add custom record
                    </button>
                </div>

                {/* Entity tabs */}
                <div className="flex items-center gap-1 mt-4 -mb-5">
                    {ENTITY_ORDER.map(e => {
                        const active = entity === e;
                        const Icon = ENTITY_ICON[e];
                        return (
                            <button
                                key={e}
                                type="button"
                                onClick={() => setEntity(e)}
                                className={cn(
                                    'inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                                    active
                                        ? 'text-blue-600 border-blue-600'
                                        : 'text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300',
                                )}
                            >
                                <Icon size={15} className={active ? 'text-blue-600' : 'text-slate-400'} />
                                {e}
                                <span className={cn(
                                    'inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                                    active ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/70 text-slate-600',
                                )}>
                                    {entityCounts[e]}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Body ─────────────────────────────────────────────────── */}
            <div className="px-4 sm:px-8 py-6 space-y-5">
                {/* Record-type summary tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <SummaryTile label="Total Records"          value={records.length}        Icon={Layers}      accent="slate" />
                    <SummaryTile label="Compliances"            value={typeCounts.C}          Icon={Hash}        accent="blue" />
                    <SummaryTile label="Documents"              value={typeCounts.D}          Icon={FileText}    accent="violet" />
                    <SummaryTile label="Compliances & Documents" value={typeCounts.DC}        Icon={ShieldCheck} accent="emerald" />
                </div>

                <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-[13px] text-blue-800">
                    <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
                    <p>
                        Showing <strong>{rows.length}</strong> record{rows.length === 1 ? '' : 's'} for <strong>{entity}</strong>.
                        Use the category sub-tabs, search, and column controls below. Monitoring always tracks the expiry / renewal / next-due date — never the issue date.
                    </p>
                </div>

                {rows.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
                        No records for <strong>{entity}</strong>.
                    </div>
                ) : (
                    <RecordsList
                        key={entity}
                        rows={rows}
                        entity={entity}
                        visibleCols={visibleCols}
                        onVisibleColsChange={setVisibleCols}
                        onEditCustom={r => setCustomModal({ mode: 'edit', record: r })}
                        onDeleteCustom={r => setPendingDelete(r)}
                    />
                )}
            </div>

            {customModal && (
                <CustomRecordModal
                    mode={customModal.mode}
                    initial={customModal.record}
                    entityDefault={entity}
                    onSave={r => { if (customModal.mode === 'edit') updateCustom(r); else addCustom(r); setCustomModal(null); }}
                    onClose={() => setCustomModal(null)}
                />
            )}
            {pendingDelete && (
                <ConfirmDeleteModal
                    record={pendingDelete}
                    onConfirm={() => { removeCustom(pendingDelete.id); setPendingDelete(null); }}
                    onClose={() => setPendingDelete(null)}
                />
            )}
        </div>
    );
}

// ── Add / edit a CUSTOM record ────────────────────────────────────────
const CM_INPUT = 'h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400';
const CM_LABEL = 'block text-[11px] font-semibold text-slate-600 mb-1';

/** On/off pill switch. */
function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
    return (
        <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
            className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors', on ? 'bg-blue-600' : 'bg-slate-300')}>
            <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', on ? 'translate-x-4' : 'translate-x-0.5')} />
        </button>
    );
}

/** "Required" checkbox — shown next to an enabled field so the author can mark it required. */
function RequiredToggle({ required, onChange }: { required: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className={cn('inline-flex cursor-pointer select-none items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors',
            required ? 'text-blue-700' : 'text-slate-400 hover:text-slate-600')}>
            <input type="checkbox" checked={required} onChange={e => onChange(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30" />
            Required
        </label>
    );
}

/** One row in the form-field definition list: label + optional Required toggle + on/off switch (+ inline extras). */
function FieldDefRow({ label, hint, enabled, onEnabled, required, onRequired, children }: {
    label: string; hint?: string; enabled: boolean; onEnabled: (v: boolean) => void;
    required?: boolean; onRequired?: (v: boolean) => void; children?: React.ReactNode;
}) {
    return (
        <div className={cn('px-3.5 py-3 transition-colors', enabled ? 'bg-white' : 'bg-slate-50/50')}>
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className={cn('text-[13px] font-semibold', enabled ? 'text-slate-800' : 'text-slate-400')}>{label}</div>
                    {hint && <div className="mt-0.5 text-[11px] leading-snug text-slate-400">{hint}</div>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {enabled && onRequired && (
                        <>
                            <RequiredToggle required={!!required} onChange={onRequired} />
                            <span className="h-4 w-px bg-slate-200" />
                        </>
                    )}
                    <Switch on={enabled} onChange={onEnabled} />
                </div>
            </div>
            {enabled && children && <div className="mt-3">{children}</div>}
        </div>
    );
}

/** Derive a form definition for the modal — from an existing record's `customForm`, or its flags (legacy custom records), or the default. */
function initFormConfig(initial?: SafetyRecord): CustomFormConfig {
    if (initial?.customForm) return JSON.parse(JSON.stringify(initial.customForm)) as CustomFormConfig;
    if (!initial) return JSON.parse(JSON.stringify(DEFAULT_CUSTOM_FORM)) as CustomFormConfig;
    const hasNumber = initial.type === 'C' || initial.type === 'DC';
    const hasUpload = initial.type === 'D' || initial.type === 'DC';
    const dated = isDateMonitored(initial);
    return {
        numberField: { enabled: hasNumber, required: hasNumber },
        country: { enabled: !initial.hideCountry, required: false },
        state: { enabled: !initial.hideState, required: false },
        issueDate: { enabled: !!initial.tracksIssueDate, required: false },
        expiryDate: { enabled: dated, required: dated },
        status: { enabled: !dated, required: !dated },
        upload: { enabled: hasUpload, required: initial.docRequirement === 'required', multi: !!initial.multiInstance },
        monitoring: { enabled: !initial.hideMonitoring },
        tags: { enabled: true },
        notes: { enabled: true },
    };
}

/**
 * Add / edit a CUSTOM record — a small FORM DEFINITION. The author picks which fields the
 * record's data-entry form shows (and which are required); `VersionFields` on the Default
 * Compliances & Documents page renders exactly that. Record type is derived from the field
 * choices (number field + document → Compliance & Document, etc.).
 */
function CustomRecordModal({ mode, initial, entityDefault, onSave, onClose }: {
    mode: 'add' | 'edit';
    initial?: SafetyRecord;
    entityDefault: EntityId;
    onSave: (r: SafetyRecord) => void;
    onClose: () => void;
}) {
    const [entity, setEntity] = useState<EntityId>(initial?.entity ?? entityDefault);
    const [recordName, setRecordName] = useState(initial?.recordName ?? '');
    const [description, setDescription] = useState(initial?.description ?? '');
    const [category, setCategory] = useState<SafetyCategory>(initial?.category ?? 'Other');
    const [numberName, setNumberName] = useState(initial?.numberName ?? '');
    const [documentName, setDocumentName] = useState(initial?.documentName ?? '');
    const [cf, setCf] = useState<CustomFormConfig>(() => initFormConfig(initial));
    // Define the fields, or preview the real Form / Data tabs the record will render.
    const [view, setView] = useState<'define' | 'form' | 'data'>('define');

    // Live preview uses the real data-entry form (VersionFields) driven off the current definition.
    const { tags: tagCatalog, add: addToCatalog } = useSafetyTags();
    const [pv, setPv] = useState<DocVersion | null>(null);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    // Patch one field's config immutably.
    const set = <K extends keyof CustomFormConfig>(k: K, patch: Partial<CustomFormConfig[K]>) =>
        setCf(prev => ({ ...prev, [k]: { ...prev[k], ...patch } }));

    const hasNumber = cf.numberField.enabled;
    const hasUpload = cf.upload.enabled;
    const derivedType: RecordTypeId = hasNumber && hasUpload ? 'DC' : hasUpload ? 'D' : 'C';
    // Only the record name is required — field labels fall back to sensible defaults ("Number" / "Document").
    const canSave = recordName.trim().length > 0;

    // Build the SafetyRecord this definition represents — used by both Save and the live preview.
    const makeRecord = (id: string): SafetyRecord => {
        const name = recordName.trim() || 'Untitled record';
        const monitorType = cf.expiryDate.enabled ? 'Expiry date' : cf.status.enabled ? 'Active/inactive status' : 'On file';
        return {
            id,
            recordName: name,
            description: description.trim() || name,
            numberName: hasNumber ? (numberName.trim() || 'Number') : '',
            documentName: hasUpload ? (documentName.trim() || 'Document') : '',
            category, entity, type: derivedType,
            docRequirement: hasUpload ? (cf.upload.required ? 'required' : 'optional') : 'none',
            recurring: 'Custom',
            monitorType,
            tracksIssueDate: cf.issueDate.enabled,
            hideState: !cf.state.enabled,
            hideCountry: !cf.country.enabled,
            jurisdiction: '—',
            monitor: `Custom record — ${cf.expiryDate.enabled ? 'monitored on the expiry date' : cf.status.enabled ? 'monitored by status' : 'kept on file'}.`,
            uploadMode: hasUpload ? 'recurring' : undefined,
            multiInstance: hasUpload && cf.upload.multi,
            custom: true,
            // Monitoring, Tags and Notes are common to every record — always included.
            customForm: { ...cf, monitoring: { enabled: true }, tags: { enabled: true }, notes: { enabled: true } },
        };
    };

    const previewRecord = makeRecord(initial?.id ?? 'preview');
    const showForm = () => {
        if (!pv) setPv({ ...blankVersion(previewRecord, defaultVersionLabel(previewRecord)), monitoring: seedMonitoring(previewRecord) });
        setView('form');
    };

    const save = () => {
        if (!canSave) return;
        onSave(makeRecord(initial?.id ?? newCustomRecordId()));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
            <div className="relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">{mode === 'edit' ? 'Edit custom record' : 'Add custom record'}</h3>
                        <p className="mt-0.5 text-[12px] text-slate-500">Define a custom document / compliance for this carrier — choose the fields its form captures and which are required.</p>
                    </div>
                    <button type="button" onClick={onClose} className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
                </div>
                {/* Tabs — same underline pattern as the record View modal (Define fields · Form · Data) */}
                <div className="flex items-center gap-1 border-b border-slate-200 px-5">
                    {([['define', 'Define fields', SquarePen], ['form', 'Form', ClipboardList], ['data', 'Data', Table2]] as const).map(([val, lbl, TabIcon]) => {
                        const active = view === val;
                        return (
                            <button key={val} type="button" onClick={() => (val === 'form' ? showForm() : setView(val))}
                                className={cn('inline-flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-semibold border-b-2 transition-colors',
                                    active ? 'text-blue-600 border-blue-600' : 'text-slate-500 hover:text-slate-800 border-transparent')}>
                                <TabIcon size={14} /> {lbl}
                            </button>
                        );
                    })}
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {view === 'form' ? (
                        <div className="space-y-3">
                            <p className="text-[12px] text-slate-500">Live preview of the data-entry <strong>form</strong> users fill on Default Compliances &amp; Documents — the exact fields and requirements you defined.</p>
                            {pv && (
                                <fieldset disabled className="m-0 min-w-0 border-0 p-0">
                                    <VersionFields record={previewRecord} version={pv} onChange={setPv} tagCatalog={tagCatalog} addToCatalog={addToCatalog} editableLabel />
                                </fieldset>
                            )}
                        </div>
                    ) : view === 'data' ? (
                        <div className="space-y-3">
                            <p className="text-[12px] text-slate-500">The record's <strong>Data</strong> tab — full record metadata plus each field's status (Required / Optional / Off), auto-populated from your definition.</p>
                            <DataView r={previewRecord} />
                        </div>
                    ) : (
                    <>
                    {/* Identity */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={CM_LABEL}>Applies to</label>
                            <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                                {ENTITY_ORDER.map(e => {
                                    const Icon = ENTITY_ICON[e];
                                    const active = entity === e;
                                    return (
                                        <button key={e} type="button" onClick={() => {
                                            setEntity(e);
                                            // Categories are per entity: a heading the new one
                                            // does not file under would put the record in a tab
                                            // that never appears.
                                            if (!SAFETY_CATEGORIES_BY_ENTITY[e].includes(category)) setCategory('Other');
                                        }}
                                            className={cn('flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-semibold transition-colors',
                                                active ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                                            <Icon size={13} /> {e}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <label className={CM_LABEL}>Category</label>
                            <select value={category} onChange={e => setCategory(e.target.value as SafetyCategory)} className={CM_INPUT}>
                                {SAFETY_CATEGORIES_BY_ENTITY[entity].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={CM_LABEL}>Record name <span className="text-rose-500">*</span></label>
                        <input value={recordName} onChange={e => setRecordName(e.target.value)} maxLength={60} placeholder="e.g. City Business License" className={CM_INPUT} />
                    </div>
                    <div>
                        <label className={CM_LABEL}>Description / full name</label>
                        <input value={description} onChange={e => setDescription(e.target.value)} maxLength={120} placeholder="Full / formal name or purpose" className={CM_INPUT} />
                    </div>
                    {/* Form-field definition */}
                    <div className="pt-1">
                        <div className="flex items-center gap-1.5">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Form fields</label>
                            <span className="group relative inline-flex">
                                <Info size={13} className="cursor-help text-slate-400 hover:text-slate-600" />
                                <span className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-72 rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] leading-snug text-slate-500 shadow-lg group-hover:block">
                                    <span className="font-semibold text-slate-700">Always included:</span> Monitoring reminders, Tags and Notes are part of every record. Tags attach to the whole record, or to each document when you choose <span className="font-semibold text-slate-600">Multiple documents</span>.
                                </span>
                            </span>
                        </div>
                        <p className="mb-2.5 mt-0.5 text-[11px] leading-snug text-slate-400">Choose which fields the record's data-entry form captures, and mark the ones that are required.</p>
                        <div className="overflow-hidden rounded-xl border border-slate-200 divide-y divide-slate-100">
                            <FieldDefRow label="Number / code field" hint="A number, code or account value" enabled={cf.numberField.enabled} onEnabled={v => set('numberField', { enabled: v })} required={cf.numberField.required} onRequired={v => set('numberField', { required: v })}>
                                <input value={numberName} onChange={e => setNumberName(e.target.value)} maxLength={60} placeholder="Field label — e.g. License Number (defaults to “Number”)" className={CM_INPUT} />
                            </FieldDefRow>
                            <FieldDefRow label="Country" enabled={cf.country.enabled} onEnabled={v => set('country', { enabled: v })} required={cf.country.required} onRequired={v => set('country', { required: v })} />
                            <FieldDefRow label="State / Province" enabled={cf.state.enabled} onEnabled={v => set('state', { enabled: v })} required={cf.state.required} onRequired={v => set('state', { required: v })} />
                            <FieldDefRow label="Issue date" enabled={cf.issueDate.enabled} onEnabled={v => set('issueDate', { enabled: v })} required={cf.issueDate.required} onRequired={v => set('issueDate', { required: v })} />
                            <FieldDefRow label="Expiry date" hint="Monitored date — drives renewal alerts" enabled={cf.expiryDate.enabled} onEnabled={v => set('expiryDate', { enabled: v })} required={cf.expiryDate.required} onRequired={v => set('expiryDate', { required: v })} />
                            <FieldDefRow label="Status" enabled={cf.status.enabled} onEnabled={v => set('status', { enabled: v })} required={cf.status.required} onRequired={v => set('status', { required: v })} />
                            <FieldDefRow label="Document upload" enabled={cf.upload.enabled} onEnabled={v => set('upload', { enabled: v })} required={cf.upload.required} onRequired={v => set('upload', { required: v })}>
                                <div className="space-y-2">
                                    <input value={documentName} onChange={e => setDocumentName(e.target.value)} maxLength={60} placeholder="Document label — e.g. License Certificate (defaults to “Document”)" className={CM_INPUT} />
                                    <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                                        {([['single', 'One document'], ['multi', 'Multiple documents']] as const).map(([val, lbl]) => {
                                            const active = cf.upload.multi === (val === 'multi');
                                            return (
                                                <button key={val} type="button" onClick={() => set('upload', { multi: val === 'multi' })}
                                                    className={cn('flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-semibold transition-colors',
                                                        active ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                                                    {val === 'single' ? <FileText size={13} /> : <Layers size={13} />} {lbl}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {cf.upload.multi && (
                                        <p className="text-[11px] text-slate-400">Holds several documents — each is tagged individually.</p>
                                    )}
                                </div>
                            </FieldDefRow>
                        </div>
                    </div>
                    </>
                    )}
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                    <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={save} disabled={!canSave}
                        className={cn('inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold', canSave ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed')}>
                        <Check size={15} /> {mode === 'edit' ? 'Save changes' : 'Add record'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ConfirmDeleteModal({ record, onConfirm, onClose }: { record: SafetyRecord; onConfirm: () => void; onClose: () => void }) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
            <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-xl p-5">
                <div className="flex items-start gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center"><Trash2 size={18} /></div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Delete custom record?</h3>
                        <p className="mt-1 text-[13px] text-slate-500"><strong className="text-slate-700">{record.recordName}</strong> will be removed from the catalog. This can&rsquo;t be undone.</p>
                    </div>
                </div>
                <div className="mt-5 flex items-center justify-end gap-2">
                    <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={onConfirm} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700"><Trash2 size={15} /> Delete</button>
                </div>
            </div>
        </div>
    );
}

// ── Records list (search · columns · sort · pagination) ───────────────

function RecordsList({ rows, entity, visibleCols, onVisibleColsChange, onEditCustom, onDeleteCustom }: {
    rows: SafetyRecord[];
    entity: EntityId;
    visibleCols: Set<ColumnId>;
    onVisibleColsChange: (next: Set<ColumnId>) => void;
    onEditCustom: (r: SafetyRecord) => void;
    onDeleteCustom: (r: SafetyRecord) => void;
}) {
    const [activeCategory, setActiveCategory] = useState<SafetyCategory | 'All'>('All');
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<RecordTypeId | 'all'>('all');
    const [sort, setSort] = useState<{ col: ColumnId; dir: 'asc' | 'desc' } | null>(null);
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);
    // Actions → open the record detail modal (view or edit) on the Form or Data tab.
    const [detail, setDetail] = useState<{ record: SafetyRecord; tab: 'form' | 'data'; mode: 'view' | 'edit' } | null>(null);

    const categoryTabs = useMemo(() => {
        const present = SAFETY_CATEGORY_ORDER.filter(c => rows.some(r => r.category === c));
        return [
            { id: 'All' as SafetyCategory | 'All', label: 'All', count: rows.length },
            ...present.map(c => ({ id: c as SafetyCategory | 'All', label: c, count: rows.filter(r => r.category === c).length })),
        ];
    }, [rows]);

    const filtered = useMemo(() => {
        let base = activeCategory === 'All' ? rows : rows.filter(r => r.category === activeCategory);
        if (typeFilter !== 'all') base = base.filter(r => r.type === typeFilter);
        const q = search.trim().toLowerCase();
        return q ? base.filter(r => searchBlob(r).includes(q)) : base;
    }, [rows, activeCategory, typeFilter, search]);

    const sorted = useMemo(() => {
        if (!sort) return filtered;
        const col = COLUMNS.find(c => c.id === sort.col);
        if (!col) return filtered;
        const arr = [...filtered].sort((a, b) =>
            col.sortValue(a).localeCompare(col.sortValue(b), undefined, { numeric: true, sensitivity: 'base' }),
        );
        if (sort.dir === 'desc') arr.reverse();
        return arr;
    }, [filtered, sort]);

    // Any change to the working set resets to the first page.
    useEffect(() => { setPage(1); }, [activeCategory, typeFilter, search, sort, pageSize]);

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pageRows = sorted.slice(start, start + pageSize);

    const cols = COLUMNS.filter(c => visibleCols.has(c.id));

    const toggleSort = (id: ColumnId) => {
        setSort(prev =>
            prev && prev.col === id
                ? (prev.dir === 'asc' ? { col: id, dir: 'desc' } : null)
                : { col: id, dir: 'asc' },
        );
    };

    // View / Edit actions — shared by the desktop table and the mobile cards.
    const renderActions = (r: SafetyRecord) => (
        <div className="flex items-center gap-1">
            <button
                type="button"
                title="View (form & data)"
                onClick={() => setDetail({ record: r, tab: 'form', mode: 'view' })}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600"
            >
                <Eye size={16} />
            </button>
            <button
                type="button"
                title={r.custom ? 'Edit custom record' : 'Edit'}
                onClick={() => (r.custom ? onEditCustom(r) : setDetail({ record: r, tab: 'form', mode: 'edit' }))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600"
            >
                <SquarePen size={16} />
            </button>
            {r.custom && (
                <button
                    type="button"
                    title="Delete custom record"
                    onClick={() => onDeleteCustom(r)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                    <Trash2 size={16} />
                </button>
            )}
        </div>
    );

    return (
        <>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-5 pb-4">
                <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Layers size={18} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">Records</h3>
                    <p className="text-[12px] text-slate-500">All record types · {entity}</p>
                </div>
            </div>

            <CardTabs tabs={categoryTabs} active={activeCategory} onChange={setActiveCategory} />

            {/* Toolbar — search + column selector */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 flex-wrap">
                <div className="relative flex-1 min-w-[220px] max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search records, numbers, jurisdiction…"
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                </div>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as RecordTypeId | 'all')} title="Filter by record type"
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
                    <option value="all">All record types</option>
                    {RECORD_TYPE_ORDER.map(t => <option key={t} value={t}>{RECORD_TYPE_LABEL[t]}</option>)}
                </select>
                <ColumnsDropdown visibleCols={visibleCols} onChange={onVisibleColsChange} />
            </div>

            {/* Records — full table on wide screens, stacked cards on smaller ones */}
            {pageRows.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-slate-500">
                    No records match your search.
                </div>
            ) : (
                <>
                    {/* Wide screens (xl+): full data table */}
                    <div className="hidden xl:block overflow-x-auto">
                        <table className="w-full min-w-[960px]">
                            <thead className="border-b border-slate-200 bg-slate-50/50">
                                <tr className="text-left">
                                    {cols.map(c => (
                                        <SortableTh key={c.id} col={c} sort={sort} onSort={toggleSort} />
                                    ))}
                                    <th className="px-4 py-2.5 pr-5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageRows.map(r => (
                                    <tr key={r.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 align-top">
                                        {cols.map(c => (
                                            <td key={c.id} className={cn('px-4 py-3.5 first:pl-5 align-top', c.cellClassName)}>
                                                {c.render(r)}
                                            </td>
                                        ))}
                                        <td className="px-4 py-3.5 pr-5 align-top">
                                            <div className="flex justify-end">{renderActions(r)}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Smaller screens: one card per record with labelled fields */}
                    <ul className="xl:hidden divide-y divide-slate-100">
                        {pageRows.map(r => {
                            const recordCol = cols.find(c => c.id === 'record');
                            const detailCols = cols.filter(c => c.id !== 'record');
                            return (
                                <li key={r.id} className="p-4 sm:px-5 hover:bg-slate-50/50">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            {recordCol
                                                ? recordCol.render(r)
                                                : <div className="text-sm font-semibold text-slate-900">{r.recordName}</div>}
                                        </div>
                                        <div className="shrink-0">{renderActions(r)}</div>
                                    </div>
                                    {detailCols.length > 0 && (
                                        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2.5 border-t border-slate-100 pt-3 sm:grid-cols-2">
                                            {detailCols.map(c => (
                                                <div key={c.id} className="flex items-start gap-3">
                                                    <span className="w-24 shrink-0 pt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                        {c.label}
                                                    </span>
                                                    <div className="min-w-0 flex-1 text-slate-700">{c.render(r)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}

            {/* Pagination footer */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 flex-wrap">
                <div className="flex items-center gap-3 text-[12px] text-slate-500">
                    <label className="flex items-center gap-1.5">
                        Rows per page
                        <select
                            value={pageSize}
                            onChange={e => setPageSize(Number(e.target.value))}
                            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        >
                            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </label>
                    <span className="tabular-nums">
                        {total === 0 ? '0' : `${start + 1}–${Math.min(start + pageSize, total)}`} of {total}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => setPage(safePage - 1)}
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={14} /> Prev
                    </button>
                    <span className="px-2 text-[12px] text-slate-600 tabular-nums">Page {safePage} of {totalPages}</span>
                    <button
                        type="button"
                        disabled={safePage >= totalPages}
                        onClick={() => setPage(safePage + 1)}
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Next <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </div>

        {detail && (
            <RecordDetailModal
                key={`${detail.record.id}-${detail.mode}`}
                record={detail.record}
                tab={detail.tab}
                mode={detail.mode}
                onTab={t => setDetail(d => (d ? { ...d, tab: t } : d))}
                onClose={() => setDetail(null)}
            />
        )}
        </>
    );
}

function SortableTh({ col, sort, onSort }: {
    col: ColumnDef;
    sort: { col: ColumnId; dir: 'asc' | 'desc' } | null;
    onSort: (id: ColumnId) => void;
}) {
    const active = sort?.col === col.id;
    const SortIcon = !col.sortable ? null : active ? (sort!.dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
    return (
        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 first:pl-5 last:pr-5 whitespace-nowrap">
            {col.sortable ? (
                <button
                    type="button"
                    onClick={() => onSort(col.id)}
                    className={cn('inline-flex items-center gap-1 hover:text-slate-700 transition-colors', active && 'text-blue-600')}
                >
                    {col.label}
                    {SortIcon && <SortIcon size={12} className={active ? 'text-blue-600' : 'text-slate-400'} />}
                </button>
            ) : col.label}
        </th>
    );
}

function ColumnsDropdown({ visibleCols, onChange }: {
    visibleCols: Set<ColumnId>;
    onChange: (next: Set<ColumnId>) => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
            >
                <Columns size={14} /> Columns <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
            </button>
            {open && (
                <>
                    <button type="button" aria-hidden className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white shadow-lg p-1.5">
                        <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Show columns</p>
                        {COLUMNS.map(c => {
                            const checked = visibleCols.has(c.id);
                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    disabled={c.locked}
                                    onClick={() => {
                                        const next = new Set(visibleCols);
                                        if (checked) next.delete(c.id); else next.add(c.id);
                                        onChange(next);
                                    }}
                                    className={cn(
                                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left',
                                        c.locked ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-50',
                                    )}
                                >
                                    <span className={cn(
                                        'flex h-4 w-4 items-center justify-center rounded border',
                                        checked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300',
                                    )}>
                                        {checked && <Check size={11} />}
                                    </span>
                                    <span className="text-slate-700">{c.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Record detail modal (View Form · View Data) ───────────────────────

function RecordDetailModal({ record, tab, mode, onTab, onClose }: {
    record: SafetyRecord;
    tab: 'form' | 'data';
    mode: 'view' | 'edit';
    onTab: (t: 'form' | 'data') => void;
    onClose: () => void;
}) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    const Icon = ENTITY_ICON[record.entity];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
            <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-slate-900">{record.recordName}</h3>
                            <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', RECORD_TYPE_TONE[record.type])}>
                                {RECORD_TYPE_LABEL[record.type]}
                            </span>
                            {mode === 'edit' && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                    <SquarePen size={10} /> Editing
                                </span>
                            )}
                        </div>
                        <p className="mt-0.5 text-[12px] text-slate-500">{record.description}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-600">
                                <Icon size={13} className="text-slate-400" /> {record.entity}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                {CATEGORY_SHORT[record.category]}
                            </span>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 border-b border-slate-200 px-5">
                    {([['form', 'Form', ClipboardList], ['data', 'Data', Table2]] as const).map(([id, label, TabIcon]) => {
                        const active = tab === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => onTab(id)}
                                className={cn(
                                    'inline-flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-semibold border-b-2 transition-colors',
                                    active ? 'text-blue-600 border-blue-600' : 'text-slate-500 hover:text-slate-800 border-transparent',
                                )}
                            >
                                <TabIcon size={14} /> {label}
                            </button>
                        );
                    })}
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-5">
                    {tab === 'form' ? <DefaultFormPreview r={record} editable={mode === 'edit'} /> : <DataView r={record} />}
                </div>
            </div>
        </div>
    );
}

/** Settings preview of the ACTUAL Default Compliances & Documents data-entry form
 *  (the shared `VersionFields`), so the catalog's edit form matches the live page 1:1.
 *  State is local — changes are a preview and are not persisted. In view mode the whole
 *  form is rendered read-only via a disabled fieldset. */
function DefaultFormPreview({ r, editable }: { r: SafetyRecord; editable: boolean }) {
    const { tags: tagCatalog, add: addToCatalog } = useSafetyTags();
    const seed = (): DocVersion => ({ ...blankVersion(r, defaultVersionLabel(r)), monitoring: seedMonitoring(r) });
    const [v, setV] = useState<DocVersion>(seed);
    // Re-seed when the modal is pointed at a different record.
    useEffect(() => { setV(seed()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [r.id]);
    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
                <p className="text-[12px] text-slate-500">
                    {editable
                        ? 'Edit the data-entry form for this record — the same form used on Default Compliances & Documents. Changes are a preview and are not persisted.'
                        : 'Preview of the data-entry form for this record — the same form used on Default Compliances & Documents (read-only).'}
                </p>
                {editable && (
                    <button type="button" onClick={() => setV(cur => fillVersionDemo(r, cur))}
                        className="inline-flex shrink-0 items-center gap-1.5 h-8 px-3 rounded-lg border border-blue-200 bg-blue-50 text-[12px] font-semibold text-blue-700 hover:bg-blue-100">
                        <Sparkles size={13} /> Fill demo data
                    </button>
                )}
            </div>
            <fieldset disabled={!editable} className="m-0 min-w-0 border-0 p-0">
                <VersionFields record={r} version={v} onChange={setV} tagCatalog={tagCatalog} addToCatalog={addToCatalog} editableLabel />
            </fieldset>
        </div>
    );
}

/** Small status chip for a defined form field — Required / Optional / Off. */
function FieldStatus({ enabled, required }: { enabled: boolean; required?: boolean }) {
    if (!enabled) return <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-400">Off</span>;
    if (required) return <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Required</span>;
    return <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">Optional</span>;
}

/** Per-field status list for a CUSTOM record — which fields the form shows and whether they're
 *  required. Renders nothing for system records. Auto-derived from the record's `customForm`. */
function FormFieldsSummary({ r }: { r: SafetyRecord }) {
    const cf = r.customForm;
    if (!cf) return null;
    const fields: { label: string; enabled: boolean; required?: boolean }[] = [
        { label: cf.numberField.enabled && r.numberName ? r.numberName : 'Number / code field', enabled: cf.numberField.enabled, required: cf.numberField.required },
        { label: 'Country', enabled: cf.country.enabled, required: cf.country.required },
        { label: 'State / Province', enabled: cf.state.enabled, required: cf.state.required },
        { label: 'Issue date', enabled: cf.issueDate.enabled, required: cf.issueDate.required },
        { label: 'Expiry date', enabled: cf.expiryDate.enabled, required: cf.expiryDate.required },
        { label: 'Status', enabled: cf.status.enabled, required: cf.status.required },
        { label: `Document upload${cf.upload.enabled ? ` — ${r.documentName || 'Document'}${cf.upload.multi ? ' (multiple)' : ''}` : ''}`, enabled: cf.upload.enabled, required: cf.upload.required },
        { label: 'Monitoring', enabled: cf.monitoring.enabled },
        { label: 'Tags', enabled: cf.tags.enabled },
        { label: 'Notes', enabled: cf.notes.enabled },
    ];
    return (
        <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Form fields</div>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
                {fields.map(f => (
                    <div key={f.label} className={cn('flex items-center justify-between gap-3 px-4 py-2.5', !f.enabled && 'opacity-60')}>
                        <span className="text-[13px] text-slate-800">{f.label}</span>
                        <FieldStatus enabled={f.enabled} required={f.required} />
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Data tab — the record's full metadata, auto-populated from the record (custom or system).
 *  Custom records additionally get a per-field "Form fields" status list. */
function DataView({ r }: { r: SafetyRecord }) {
    const reqLabel = r.docRequirement === 'none' ? 'No document' : r.docRequirement === 'required' ? 'Required' : 'Optional';
    const rows: [string, string][] = [
        ['Record Name', r.recordName],
        ['Description', r.description],
        ['Category', r.category],
        ['Entity', r.entity],
        ['Record Type', RECORD_TYPE_LABEL[r.type]],
        ['Document Requirement', reqLabel],
        ['Compliance / Number Field', r.numberName || '—'],
        ['Document', r.documentName || '—'],
        ['Upload Mode', r.uploadMode ? UPLOAD_MODE_LABEL[r.uploadMode] : 'No document'],
        ['Recurring', r.recurring],
        ['Monitored Date', r.monitorType],
        ['Configured Date', r.configuredDate || '—'],
        ['Tracks Issue Date', r.tracksIssueDate ? 'Yes' : 'No'],
        // Record-specific form fields — the extra selects / text fields and any custom status set.
        ...recordFields(r).map(f => [f.label,
            f.kind === 'select' ? f.options.join(' · ')
            : f.kind === 'date' ? 'Date'
            : f.kind === 'derived' ? 'Calculated automatically'
            : 'Free text'] as [string, string]),
        ...(r.statusOptions ? [[r.statusLabel ?? 'Status', r.statusOptions.join(' · ')] as [string, string]] : []),
        ['Jurisdiction', r.jurisdiction],
        ['Monitoring Guidance', r.monitor],
        ['Note', r.note || '—'],
    ];
    return (
        <div className="space-y-4">
            <dl className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
                {rows.map(([k, v]) => (
                    <div key={k} className="grid grid-cols-3 gap-3 px-4 py-2.5 odd:bg-slate-50/40">
                        <dt className="text-[12px] font-semibold text-slate-500">{k}</dt>
                        <dd className="col-span-2 text-[13px] text-slate-800">{v}</dd>
                    </div>
                ))}
            </dl>
            <FormFieldsSummary r={r} />
        </div>
    );
}

// ── Category sub-tabs ─────────────────────────────────────────────────

function CardTabs({ tabs, active, onChange }: {
    tabs: { id: SafetyCategory | 'All'; label: string; count: number }[];
    active: SafetyCategory | 'All';
    onChange: (t: SafetyCategory | 'All') => void;
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
                                'inline-flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-semibold whitespace-nowrap border-b-2 transition-colors',
                                isActive
                                    ? 'text-blue-600 border-blue-600'
                                    : 'text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300',
                            )}
                        >
                            {t.label}
                            <span className={cn(
                                'inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                                isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/70 text-slate-600',
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

// ── Cell helpers ──────────────────────────────────────────────────────

const UPLOAD_MODE_TONE: Record<UploadMode, string> = {
    single: 'border-slate-200 bg-slate-50 text-slate-500',
    recurring: 'border-blue-200 bg-blue-50 text-blue-700',
    event: 'border-violet-200 bg-violet-50 text-violet-700',
};

function UploadModeChip({ mode }: { mode: UploadMode }) {
    const Icon = mode === 'single' ? FileText : History;
    const short = mode === 'single' ? 'Single' : mode === 'recurring' ? 'Recurring versions' : 'Event versions';
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap', UPLOAD_MODE_TONE[mode])}>
            <Icon size={9} /> {short}
        </span>
    );
}

function RequirementPill({ r }: { r: SafetyRecord }) {
    if (r.docRequirement === 'none') {
        return <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">No document</span>;
    }
    const required = r.docRequirement === 'required';
    return (
        <span className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
            required ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-amber-200 bg-amber-50 text-amber-700',
        )}>
            {required ? 'Required' : 'Optional'}
        </span>
    );
}

function MonitoringCell({ r }: { r: SafetyRecord }) {
    const dated = isDateMonitored(r);
    if (r.configuredDate) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                <CalendarClock size={12} /> {r.monitorType}
                <span className="font-mono text-[10px] text-emerald-600">· {r.configuredDate}</span>
            </span>
        );
    }
    if (dated) {
        return (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700">
                <Calendar size={12} className="text-slate-400" /> {r.monitorType}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500">
            <Activity size={12} className="text-slate-400" /> {r.monitorType}
        </span>
    );
}

// ── Small primitives ──────────────────────────────────────────────────

const ACCENT_CLS = {
    slate:   { border: 'border-l-slate-400',   iconBg: 'bg-slate-100',  iconColor: 'text-slate-600' },
    blue:    { border: 'border-l-blue-500',    iconBg: 'bg-blue-50',    iconColor: 'text-blue-600' },
    violet:  { border: 'border-l-violet-500',  iconBg: 'bg-violet-50',  iconColor: 'text-violet-600' },
    emerald: { border: 'border-l-emerald-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
} as const;

function SummaryTile({ label, value, Icon, accent }: {
    label: string;
    value: number;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    accent: keyof typeof ACCENT_CLS;
}) {
    const cls = ACCENT_CLS[accent];
    return (
        <div className={cn('bg-white border border-slate-200 border-l-4 rounded-xl p-3 shadow-sm flex items-center justify-between gap-3', cls.border)}>
            <div className="min-w-0">
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center mb-2', cls.iconBg)}>
                    <Icon size={14} className={cls.iconColor} />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">{label}</div>
            </div>
            <div className="text-2xl font-black tabular-nums text-slate-900 leading-none">{value}</div>
        </div>
    );
}
