import { useEffect, useMemo, useState } from 'react';
import {
    Network, Building2, Truck, User, ShieldAlert, FileText, Search, Filter,
    ChevronDown, Link2, Check, RotateCcw, CheckCircle2, Circle,
    LayoutTemplate, Plus, Trash2, Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubTabs, type SubTab } from '@/components/ui/SubTabs';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import {
    SEED_KEY_NUMBERS, DOCUMENTS, KEY_NUMBER_GROUPS,
    type KeyNumberGroup, type DocumentsSubTabId, type RelatedToScope,
} from './ComplianceAndDocumentsPage';
import {
    loadCarrierAssignment, saveCarrierAssignment, applyToggle, applyBulk, defaultAssignmentFor,
    loadTemplates, upsertTemplate, deleteTemplate, applyTemplate, templateMatches,
    DOC_IDS_BY_KN_ID, KN_ID_BY_DOC_ID,
    type CarrierComplianceAssignment, type ComplianceTemplate,
} from './carrier-compliance.data';
import { ACCOUNTS_DB } from '@/pages/accounts/accounts.data';
import {
    loadTemplates as loadHiringTemplates,
    type DriverHiringTemplate,
} from '@/pages/settings/driver-hiring-templates.data';

/**
 * Super Admin → Carrier Compliance Setup.
 *
 * Per-carrier on/off switches over the system-wide catalog. Toggling a row
 * whose entry has a linkage cascades to the other side (KN ↔ Document) so
 * paired items always travel together. The catalog itself is not editable
 * here — that's the Compliance and Documents page.
 */

type PageMode = 'compliance' | 'documents' | 'templates';

const RELATED_TO_ICON: Record<RelatedToScope, React.ComponentType<{ size?: number; className?: string }>> = {
    Carrier: Building2,
    Asset:   Truck,
    Driver:  User,
};

const SCOPE_ICON: Record<Exclude<DocumentsSubTabId, 'all'>, React.ComponentType<{ size?: number; className?: string }>> = {
    carrier:   Building2,
    asset:     Truck,
    driver:    User,
    accidents: FileText,
    violation: ShieldAlert,
};

const SCOPE_LABEL: Record<Exclude<DocumentsSubTabId, 'all'>, string> = {
    carrier:   'Carrier',
    asset:     'Asset',
    driver:    'Driver',
    accidents: 'Accidents',
    violation: 'Violation',
};

// ── Sub-tabs with enabled-count badges ────────────────────────────────

function withCount<T extends string>(
    tabs: SubTab<T>[],
    counts: Record<T, { enabled: number; total: number }>,
): SubTab<T>[] {
    return tabs.map(t => ({
        ...t,
        label: `${t.label}  ${counts[t.id].enabled}/${counts[t.id].total}`,
    }));
}

// ── Cascade toast ─────────────────────────────────────────────────────

function CascadeToast({ messages, onDismiss }: {
    messages: string[];
    onDismiss: () => void;
}) {
    useEffect(() => {
        if (messages.length === 0) return;
        const t = setTimeout(onDismiss, 4000);
        return () => clearTimeout(t);
    }, [messages, onDismiss]);

    if (messages.length === 0) return null;
    return (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50 max-w-sm space-y-1.5">
            {messages.map((m, i) => (
                <div
                    key={i}
                    className="pointer-events-auto flex items-start gap-2 rounded-lg border border-blue-200 bg-white px-4 py-3 text-[12px] text-slate-700 shadow-lg"
                >
                    <Link2 size={14} className="mt-0.5 shrink-0 text-blue-600" />
                    <span>{m}</span>
                </div>
            ))}
        </div>
    );
}

// ── Template manager modal — root-level template library ──────────────

/**
 * Two-pane editor:
 *   • Left rail  — list of all templates (seeded + custom). Click to select.
 *                  Plus an "+ New blank template" button at the bottom.
 *   • Right pane — selected template's metadata (name, description) plus
 *                  two collapsible sections of Key Number / Document
 *                  checkboxes. Edits save back to the template's storage
 *                  immediately so the picker on the carrier page stays in
 *                  sync. Seeded templates are read-only.
 */
function TemplateManagerModal({
    templates, appliedTemplateId,
    onApply, onSave, onDelete, onClose,
}: {
    templates: ComplianceTemplate[];
    appliedTemplateId?: string;
    onApply: (t: ComplianceTemplate) => void;
    onSave: (t: ComplianceTemplate) => void;
    onDelete: (t: ComplianceTemplate) => void;
    onClose: () => void;
}) {
    const [selectedId, setSelectedId] = useState<string | null>(templates[0]?.id ?? null);
    const selected = templates.find(t => t.id === selectedId) ?? null;
    const readOnly = !!selected?.isSeed;

    // Local draft so the user can change name/desc without committing per keystroke.
    const [draft, setDraft] = useState<ComplianceTemplate | null>(selected);
    useEffect(() => { setDraft(selected); }, [selected?.id]);

    const dirty = !!draft && !!selected && (
        draft.name !== selected.name
        || (draft.description ?? '') !== (selected.description ?? '')
        || draft.enabledKeyNumberIds.length !== selected.enabledKeyNumberIds.length
        || draft.enabledDocumentTypeIds.length !== selected.enabledDocumentTypeIds.length
        || draft.enabledKeyNumberIds.some(id => !selected.enabledKeyNumberIds.includes(id))
        || draft.enabledDocumentTypeIds.some(id => !selected.enabledDocumentTypeIds.includes(id))
    );

    const createBlank = () => {
        const blank: ComplianceTemplate = {
            id: `tmpl-${Math.random().toString(36).slice(2, 9)}`,
            name: 'New Template',
            description: '',
            enabledKeyNumberIds: [],
            enabledDocumentTypeIds: [],
            isSeed: false,
            updatedAt: new Date().toISOString().slice(0, 10),
        };
        onSave(blank);
        setSelectedId(blank.id);
        setDraft(blank);
    };

    const saveDraft = () => {
        if (!draft) return;
        onSave(draft);
    };

    const toggleKn = (knId: string, on: boolean) => {
        if (!draft || readOnly) return;
        const set = new Set(draft.enabledKeyNumberIds);
        if (on) set.add(knId); else set.delete(knId);
        setDraft({ ...draft, enabledKeyNumberIds: [...set] });
    };
    const toggleDoc = (docId: string, on: boolean) => {
        if (!draft || readOnly) return;
        const set = new Set(draft.enabledDocumentTypeIds);
        if (on) set.add(docId); else set.delete(docId);
        setDraft({ ...draft, enabledDocumentTypeIds: [...set] });
    };

    const [searchKn, setSearchKn] = useState('');
    const [searchDoc, setSearchDoc] = useState('');
    const knQ = searchKn.trim().toLowerCase();
    const docQ = searchDoc.trim().toLowerCase();
    const visibleKns = SEED_KEY_NUMBERS.filter(k => !knQ
        || k.name.toLowerCase().includes(knQ)
        || k.group.toLowerCase().includes(knQ));
    const visibleDocs = DOCUMENTS.filter(d => !docQ
        || d.name.toLowerCase().includes(docQ)
        || d.scope.toLowerCase().includes(docQ));

    return (
        <div
            role="dialog"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6"
            onClick={onClose}
        >
            <div
                className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Compliance Templates</h3>
                        <p className="mt-0.5 text-[12px] text-slate-500">
                            Root-level presets. Define which Key Numbers and Documents each template enables, then apply them to carriers.
                        </p>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left rail — list */}
                    <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50/40">
                        <div className="flex-1 overflow-y-auto px-3 py-3">
                            <div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Built-in</div>
                            <div className="space-y-1">
                                {templates.filter(t => t.isSeed).map(t => (
                                    <TemplateListItem
                                        key={t.id}
                                        template={t}
                                        active={selectedId === t.id}
                                        applied={appliedTemplateId === t.id}
                                        onSelect={() => setSelectedId(t.id)}
                                    />
                                ))}
                            </div>
                            {templates.some(t => !t.isSeed) && (
                                <>
                                    <div className="mb-2 mt-4 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Custom</div>
                                    <div className="space-y-1">
                                        {templates.filter(t => !t.isSeed).map(t => (
                                            <TemplateListItem
                                                key={t.id}
                                                template={t}
                                                active={selectedId === t.id}
                                                applied={appliedTemplateId === t.id}
                                                onSelect={() => setSelectedId(t.id)}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="border-t border-slate-200 bg-white p-3">
                            <Button size="sm" onClick={createBlank} className="w-full gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
                                <Plus size={14} /> New blank template
                            </Button>
                        </div>
                    </aside>

                    {/* Right pane — editor */}
                    <section className="flex flex-1 flex-col overflow-hidden">
                        {!draft ? (
                            <div className="flex flex-1 items-center justify-center bg-slate-50/40 p-10 text-center">
                                <div>
                                    <LayoutTemplate size={28} className="mx-auto text-slate-300" />
                                    <p className="mt-2 text-sm font-medium text-slate-600">Select a template to edit</p>
                                    <p className="mt-1 text-[12px] text-slate-500">Or click <span className="font-semibold">+ New blank template</span> to start fresh.</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Metadata */}
                                <div className="border-b border-slate-200 px-6 py-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-2 flex items-center gap-2">
                                                {draft.isSeed && (
                                                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                                        <Lock size={10} /> Built-in (read-only)
                                                    </span>
                                                )}
                                                {appliedTemplateId === draft.id && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                                        <Check size={10} /> Currently applied
                                                    </span>
                                                )}
                                            </div>
                                            <input
                                                value={draft.name}
                                                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                                                disabled={readOnly}
                                                placeholder="Template name"
                                                className="block w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-base font-bold text-slate-900 hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-default disabled:hover:border-transparent"
                                            />
                                            <textarea
                                                value={draft.description ?? ''}
                                                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                                                disabled={readOnly}
                                                placeholder="Optional description — when to use this template"
                                                rows={2}
                                                className="mt-1 block w-full resize-none rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[12px] text-slate-500 hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-default disabled:hover:border-transparent"
                                            />
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1.5">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => onApply(draft)}
                                                className="gap-1.5"
                                            >
                                                Apply to carrier
                                            </Button>
                                            {!draft.isSeed && (
                                                <button
                                                    type="button"
                                                    onClick={() => onDelete(draft)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                                    title="Delete template"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                                        <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700">
                                            {draft.enabledKeyNumberIds.length} of {SEED_KEY_NUMBERS.length} KN
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded bg-violet-50 px-1.5 py-0.5 font-semibold text-violet-700">
                                            {draft.enabledDocumentTypeIds.length} of {DOCUMENTS.length} Docs
                                        </span>
                                    </p>
                                </div>

                                {/* Two columns of picker lists */}
                                <div className="flex flex-1 overflow-hidden">
                                    {/* KN column */}
                                    <div className="flex flex-1 flex-col overflow-hidden border-r border-slate-200">
                                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/40 px-4 py-2.5">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Key Numbers</p>
                                            <button
                                                type="button"
                                                disabled={readOnly}
                                                onClick={() => setDraft({ ...draft, enabledKeyNumberIds: SEED_KEY_NUMBERS.map(k => k.id) })}
                                                className="text-[11px] font-semibold text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline"
                                            >
                                                Select all
                                            </button>
                                        </div>
                                        <div className="border-b border-slate-100 px-4 py-2">
                                            <div className="relative">
                                                <Search size={13} className="pointer-events-none absolute left-2.5 top-2 text-slate-400" />
                                                <input
                                                    value={searchKn}
                                                    onChange={(e) => setSearchKn(e.target.value)}
                                                    placeholder="Search key numbers…"
                                                    className="h-8 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2 text-[12px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto">
                                            {KEY_NUMBER_GROUPS.map(g => {
                                                const inGroup = visibleKns.filter(k => k.group === g);
                                                if (inGroup.length === 0) return null;
                                                return (
                                                    <div key={g}>
                                                        <p className="sticky top-0 z-10 bg-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                            {g}
                                                        </p>
                                                        {inGroup.map(k => {
                                                            const on = draft.enabledKeyNumberIds.includes(k.id);
                                                            return (
                                                                <label
                                                                    key={k.id}
                                                                    className={cn(
                                                                        "flex cursor-pointer items-center gap-2 border-t border-slate-100 px-4 py-1.5 text-[13px]",
                                                                        on ? "bg-white" : "bg-slate-50/40",
                                                                        readOnly && "cursor-default",
                                                                    )}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={on}
                                                                        disabled={readOnly}
                                                                        onChange={(e) => toggleKn(k.id, e.target.checked)}
                                                                        className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                                                                    />
                                                                    <span className={cn("flex-1 truncate", on ? "text-slate-800" : "text-slate-500")}>
                                                                        {k.name}
                                                                    </span>
                                                                    <span className="text-[10px] uppercase tracking-wide text-slate-400">
                                                                        {k.relatedTo}
                                                                    </span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Docs column */}
                                    <div className="flex flex-1 flex-col overflow-hidden">
                                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/40 px-4 py-2.5">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Documents</p>
                                            <button
                                                type="button"
                                                disabled={readOnly}
                                                onClick={() => setDraft({ ...draft, enabledDocumentTypeIds: DOCUMENTS.map(d => d.id) })}
                                                className="text-[11px] font-semibold text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline"
                                            >
                                                Select all
                                            </button>
                                        </div>
                                        <div className="border-b border-slate-100 px-4 py-2">
                                            <div className="relative">
                                                <Search size={13} className="pointer-events-none absolute left-2.5 top-2 text-slate-400" />
                                                <input
                                                    value={searchDoc}
                                                    onChange={(e) => setSearchDoc(e.target.value)}
                                                    placeholder="Search documents…"
                                                    className="h-8 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2 text-[12px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto">
                                            {(['carrier','asset','driver','accidents','violation'] as Exclude<DocumentsSubTabId,'all'>[]).map(scope => {
                                                const inScope = visibleDocs.filter(d => d.scope === scope);
                                                if (inScope.length === 0) return null;
                                                return (
                                                    <div key={scope}>
                                                        <p className="sticky top-0 z-10 bg-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                            {scope}
                                                        </p>
                                                        {inScope.map(d => {
                                                            const on = draft.enabledDocumentTypeIds.includes(d.id);
                                                            return (
                                                                <label
                                                                    key={d.id}
                                                                    className={cn(
                                                                        "flex cursor-pointer items-center gap-2 border-t border-slate-100 px-4 py-1.5 text-[13px]",
                                                                        on ? "bg-white" : "bg-slate-50/40",
                                                                        readOnly && "cursor-default",
                                                                    )}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={on}
                                                                        disabled={readOnly}
                                                                        onChange={(e) => toggleDoc(d.id, e.target.checked)}
                                                                        className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                                                                    />
                                                                    <span className={cn("flex-1 truncate", on ? "text-slate-800" : "text-slate-500")}>
                                                                        {d.name}
                                                                    </span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </section>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-6 py-3">
                    <span className="text-[11px] text-slate-500">
                        {dirty ? <span className="font-semibold text-amber-600">Unsaved changes</span> : 'All changes saved.'}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={onClose}>Close</Button>
                        {draft && !readOnly && (
                            <Button
                                disabled={!dirty || !draft.name.trim()}
                                onClick={saveDraft}
                                className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                            >
                                <Check className="h-4 w-4" /> Save Template
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Compact row used in the left rail of the manager modal. */
function TemplateListItem({ template, active, applied, onSelect }: {
    template: ComplianceTemplate;
    active: boolean;
    applied: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors",
                active ? "bg-blue-100 ring-1 ring-blue-300" : "hover:bg-slate-100",
            )}
        >
            <LayoutTemplate
                size={14}
                className={cn("mt-0.5 shrink-0", active ? "text-blue-600" : "text-slate-400")}
            />
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                    <span className={cn("truncate text-[13px] font-semibold", active ? "text-blue-900" : "text-slate-800")}>
                        {template.name}
                    </span>
                    {template.isSeed && <Lock size={10} className="shrink-0 text-slate-400" />}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                    <span>{template.enabledKeyNumberIds.length} KN</span>
                    <span>·</span>
                    <span>{template.enabledDocumentTypeIds.length} Docs</span>
                    {applied && <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700"><Check size={9} /> Applied</span>}
                </span>
            </span>
        </button>
    );
}

/** Pretty label for a hiring-template formType id (e.g. `hiring-driver` → `Hiring Driver`). */
function formTypeLabel(id: string): string {
    return id
        .split('-')
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
}

// ── Templates panel (full-width view inside the Templates switch tab) ──

/**
 * Templates view for the current carrier. Lists every available template
 * (built-in + custom) as cards with apply buttons. The active applied
 * template is highlighted; drift surfaces inline. Useful when the admin
 * wants to see all options at once instead of cycling the dropdown.
 */
function TemplatesPanel({
    hiringTemplates, formType, formTypeOptions, onFormTypeChange,
    enabledHiringIds, onToggleHiring, onBulkHiring,
}: {
    hiringTemplates: DriverHiringTemplate[];
    formType: string;
    formTypeOptions: { id: string; label: string }[];
    onFormTypeChange: (id: string) => void;
    enabledHiringIds: string[];
    onToggleHiring: (id: string, enabled: boolean) => void;
    onBulkHiring: (enable: boolean) => void;
}) {
    const enabledSet = new Set(enabledHiringIds);
    const allOn  = enabledSet.size === hiringTemplates.length && hiringTemplates.length > 0;
    const allOff = enabledSet.size === 0;

    return (
        <div className="space-y-6 px-6 py-5">
            {/* ── Hiring Templates (ATS pipelines) ────────────────────────── */}
            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <span className="h-5 w-1 rounded-full bg-violet-500" />
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">Hiring Templates</h2>
                    <span className="text-[11px] text-slate-500">— enable which ATS pipelines this carrier can run</span>
                </div>

                {/* Form type filter + bulk actions */}
                <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex flex-col">
                        <label className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Form type
                        </label>
                        <select
                            value={formType}
                            onChange={(e) => onFormTypeChange(e.target.value)}
                            className="h-10 w-56 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            {formTypeOptions.map(o => (
                                <option key={o.id} value={o.id}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700">
                            {enabledSet.size}<span className="text-slate-400">/{hiringTemplates.length}</span>{' '}
                            <span className="font-normal text-slate-500">enabled</span>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onBulkHiring(true)}
                            disabled={allOn}
                            className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                        >
                            <CheckCircle2 size={14} /> Enable all
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onBulkHiring(false)}
                            disabled={allOff}
                            className="gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                        >
                            <Circle size={14} /> Disable all
                        </Button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    {hiringTemplates.length === 0 ? (
                        <div className="px-4 py-12 text-center">
                            <p className="text-sm font-medium text-slate-700">No hiring templates defined yet</p>
                            <p className="mt-1 text-[12px] text-slate-500">Create templates in Super Admin → Hiring Templates (ATS).</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {hiringTemplates.map(t => {
                                const enabled = enabledSet.has(t.id);
                                return (
                                    <li
                                        key={t.id}
                                        onClick={() => onToggleHiring(t.id, !enabled)}
                                        className={cn(
                                            "group flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors",
                                            enabled ? "bg-white hover:bg-violet-50/40" : "bg-slate-50/60 hover:bg-slate-100/70",
                                        )}
                                    >
                                        <span className="relative -mx-4 -my-3 self-stretch">
                                            <span className={cn(
                                                "absolute inset-y-0 left-0 w-1",
                                                enabled ? "bg-violet-500" : "bg-transparent",
                                            )} />
                                        </span>
                                        <span className={cn(
                                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                                            enabled ? "bg-violet-50 text-violet-600" : "bg-slate-100 text-slate-400",
                                        )}>
                                            <LayoutTemplate size={15} />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className={cn(
                                                    "text-sm font-semibold",
                                                    enabled ? "text-slate-900" : "text-slate-500",
                                                )}>
                                                    {t.name}
                                                </p>
                                                {t.isDefault && (
                                                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                                        Default
                                                    </span>
                                                )}
                                                <span className="text-[11px] text-slate-500">
                                                    {t.steps.length} step{t.steps.length === 1 ? '' : 's'}
                                                </span>
                                            </div>
                                            <p className={cn(
                                                "mt-0.5 text-[12px] leading-snug",
                                                enabled ? "text-slate-500" : "text-slate-400",
                                            )}>
                                                {t.description}
                                            </p>
                                        </div>
                                        <div onClick={(e) => e.stopPropagation()} className="shrink-0 self-center">
                                            <Toggle
                                                checked={enabled}
                                                onCheckedChange={(v) => onToggleHiring(t.id, v)}
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </section>
        </div>
    );
}

// ── Bulk-action toolbar (Enable all / Disable all in the current view) ─

function BulkBar({ visibleCount, enabledInView, query, onQueryChange, onEnableAll, onDisableAll, placeholder }: {
    visibleCount: number;
    enabledInView: number;
    query: string;
    onQueryChange: (q: string) => void;
    onEnableAll: () => void;
    onDisableAll: () => void;
    placeholder: string;
}) {
    const allOn = enabledInView === visibleCount && visibleCount > 0;
    const allOff = enabledInView === 0;
    const pct = visibleCount === 0 ? 0 : Math.round((enabledInView / visibleCount) * 100);

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
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

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all",
                                    allOff ? "bg-slate-300" : allOn ? "bg-emerald-500" : "bg-blue-500",
                                )}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <span className="text-[12px] font-semibold text-slate-700">
                            {enabledInView}<span className="text-slate-400">/{visibleCount}</span>
                        </span>
                        <span className="text-[11px] text-slate-500">enabled</span>
                    </div>
                    <button
                        type="button"
                        onClick={onEnableAll}
                        disabled={allOn || visibleCount === 0}
                        className={cn(
                            "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[12px] font-semibold transition-colors",
                            allOn || visibleCount === 0
                                ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                                : "border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50",
                        )}
                    >
                        <CheckCircle2 size={14} /> Enable all
                    </button>
                    <button
                        type="button"
                        onClick={onDisableAll}
                        disabled={allOff}
                        className={cn(
                            "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[12px] font-semibold transition-colors",
                            allOff
                                ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                                : "border-rose-300 bg-white text-rose-700 hover:bg-rose-50",
                        )}
                    >
                        <Circle size={14} /> Disable all
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Key Numbers panel ─────────────────────────────────────────────────

function KeyNumbersAssignment({ enabledIds, onToggle, onBulk }: {
    enabledIds: Set<string>;
    onToggle: (id: string, enabled: boolean) => void;
    onBulk: (ids: string[], enable: boolean) => void;
}) {
    const [activeGroup, setActiveGroup] = useState<KeyNumberGroup>('Regulatory and Safety Numbers');
    const [query, setQuery] = useState('');

    // Per-group counts for the tab badges.
    const counts = useMemo(() => {
        const out = {} as Record<KeyNumberGroup, { enabled: number; total: number }>;
        for (const g of KEY_NUMBER_GROUPS) out[g] = { enabled: 0, total: 0 };
        for (const k of SEED_KEY_NUMBERS) {
            out[k.group].total += 1;
            if (enabledIds.has(k.id)) out[k.group].enabled += 1;
        }
        return out;
    }, [enabledIds]);

    const groupTabs: SubTab<KeyNumberGroup>[] = useMemo(
        () => withCount(KEY_NUMBER_GROUPS.map(g => ({ id: g, label: g })), counts),
        [counts],
    );

    const q = query.trim().toLowerCase();
    const rows = SEED_KEY_NUMBERS
        .filter(k => k.group === activeGroup)
        .filter(k => !q
            || k.name.toLowerCase().includes(q)
            || k.description.toLowerCase().includes(q));

    const enabledInView = rows.filter(r => enabledIds.has(r.id)).length;

    return (
        <div>
            <div className="border-b border-slate-100 bg-white px-6">
                <SubTabs
                    tabs={groupTabs}
                    activeId={activeGroup}
                    onChange={(id) => setActiveGroup(id)}
                    bordered={false}
                />
            </div>

            <div className="space-y-3 px-6 py-5">
                <BulkBar
                    visibleCount={rows.length}
                    enabledInView={enabledInView}
                    query={query}
                    onQueryChange={setQuery}
                    onEnableAll={() => onBulk(rows.map(r => r.id), true)}
                    onDisableAll={() => onBulk(rows.map(r => r.id), false)}
                    placeholder="Search numbers…"
                />

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3 w-[42%]">Number Name</th>
                                <th className="px-3 py-3 w-[15%]">Related To</th>
                                <th className="px-3 py-3 w-[15%]">Status</th>
                                <th className="px-3 py-3 w-[20%]">Linked Document</th>
                                <th className="px-3 py-3 w-[8%] text-right">Enabled</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-3 py-12 text-center">
                                        <p className="text-sm font-medium text-slate-700">No key numbers in this category</p>
                                        <p className="mt-1 text-[12px] text-slate-500">Try a different tab or clear the search.</p>
                                    </td>
                                </tr>
                            ) : rows.map(k => {
                                const RIcon = RELATED_TO_ICON[k.relatedTo];
                                const cascadedDocs = DOC_IDS_BY_KN_ID.get(k.id) ?? [];
                                const enabled = enabledIds.has(k.id);
                                return (
                                    <tr
                                        key={k.id}
                                        onClick={() => onToggle(k.id, !enabled)}
                                        className={cn(
                                            "group cursor-pointer transition-colors",
                                            enabled ? "bg-white hover:bg-blue-50/40" : "bg-slate-50/60 hover:bg-slate-100/70",
                                        )}
                                    >
                                        <td className="relative px-4 py-3 align-top">
                                            <span className={cn(
                                                "absolute inset-y-0 left-0 w-1 transition-colors",
                                                enabled ? "bg-blue-500" : "bg-transparent",
                                            )} />
                                            <p className={cn("font-semibold", enabled ? "text-slate-900" : "text-slate-400")}>
                                                {k.name}
                                            </p>
                                            <p className={cn("mt-0.5 text-[12px]", enabled ? "text-slate-500" : "text-slate-400")}>
                                                {k.description}
                                            </p>
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 text-[13px]",
                                                enabled ? "text-slate-700" : "text-slate-400",
                                            )}>
                                                <RIcon size={14} className={enabled ? "text-slate-400" : "text-slate-300"} /> {k.relatedTo}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <span className={cn(
                                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                                                k.status === 'Active'
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                    : "border-slate-200 bg-slate-100 text-slate-500",
                                            )}>
                                                {k.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            {cascadedDocs.length === 0 ? (
                                                <span className="text-[12px] text-slate-300">—</span>
                                            ) : (
                                                <span className={cn(
                                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                                    enabled ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500",
                                                )}>
                                                    <Link2 size={11} /> {cascadedDocs.length} cascade{cascadedDocs.length === 1 ? '' : 's'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-end">
                                                <Toggle
                                                    checked={enabled}
                                                    onCheckedChange={(v) => onToggle(k.id, v)}
                                                />
                                            </div>
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

// ── Documents panel ───────────────────────────────────────────────────

const DOC_SUB_TAB_IDS: DocumentsSubTabId[] = ['all', 'carrier', 'asset', 'driver', 'accidents', 'violation'];

function DocumentsAssignment({ enabledIds, onToggle, onBulk }: {
    enabledIds: Set<string>;
    onToggle: (id: string, enabled: boolean) => void;
    onBulk: (ids: string[], enable: boolean) => void;
}) {
    const [activeScope, setActiveScope] = useState<DocumentsSubTabId>('all');
    const [query, setQuery] = useState('');

    // Per-scope counts for the tab badges. 'all' is the running total.
    const counts = useMemo(() => {
        const out = {} as Record<DocumentsSubTabId, { enabled: number; total: number }>;
        for (const t of DOC_SUB_TAB_IDS) out[t] = { enabled: 0, total: 0 };
        for (const d of DOCUMENTS) {
            out.all.total += 1;
            out[d.scope].total += 1;
            if (enabledIds.has(d.id)) {
                out.all.enabled += 1;
                out[d.scope].enabled += 1;
            }
        }
        return out;
    }, [enabledIds]);

    const docTabs: SubTab<DocumentsSubTabId>[] = useMemo(() => withCount([
        { id: 'all',        label: 'All' },
        { id: 'carrier',    label: 'Carrier' },
        { id: 'asset',      label: 'Asset' },
        { id: 'driver',     label: 'Driver' },
        { id: 'accidents',  label: 'Accidents' },
        { id: 'violation',  label: 'Violation' },
    ], counts), [counts]);

    const q = query.trim().toLowerCase();
    const rows = DOCUMENTS
        .filter(d => activeScope === 'all' || d.scope === activeScope)
        .filter(d => !q
            || d.name.toLowerCase().includes(q)
            || (d.linkedTo ?? '').toLowerCase().includes(q));

    const enabledInView = rows.filter(r => enabledIds.has(r.id)).length;

    return (
        <div>
            <div className="border-b border-slate-100 bg-white px-6">
                <SubTabs
                    tabs={docTabs}
                    activeId={activeScope}
                    onChange={(id) => setActiveScope(id)}
                    bordered={false}
                />
            </div>

            <div className="space-y-3 px-6 py-5">
                <BulkBar
                    visibleCount={rows.length}
                    enabledInView={enabledInView}
                    query={query}
                    onQueryChange={setQuery}
                    onEnableAll={() => onBulk(rows.map(r => r.id), true)}
                    onDisableAll={() => onBulk(rows.map(r => r.id), false)}
                    placeholder="Search documents…"
                />

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3 w-[42%]">Document Name</th>
                                <th className="px-3 py-3 w-[15%]">Category</th>
                                <th className="px-3 py-3 w-[15%]">Status</th>
                                <th className="px-3 py-3 w-[20%]">Linked Key Number</th>
                                <th className="px-3 py-3 w-[8%] text-right">Enabled</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-3 py-12 text-center">
                                        <p className="text-sm font-medium text-slate-700">No documents in this scope</p>
                                        <p className="mt-1 text-[12px] text-slate-500">Try a different tab or clear the search.</p>
                                    </td>
                                </tr>
                            ) : rows.map(d => {
                                const ScopeIcon = SCOPE_ICON[d.scope];
                                const linkedKn = KN_ID_BY_DOC_ID.get(d.id);
                                const enabled = enabledIds.has(d.id);
                                return (
                                    <tr
                                        key={d.id}
                                        onClick={() => onToggle(d.id, !enabled)}
                                        className={cn(
                                            "group cursor-pointer transition-colors",
                                            enabled ? "bg-white hover:bg-blue-50/40" : "bg-slate-50/60 hover:bg-slate-100/70",
                                        )}
                                    >
                                        <td className="relative px-4 py-3 align-top">
                                            <span className={cn(
                                                "absolute inset-y-0 left-0 w-1 transition-colors",
                                                enabled ? "bg-blue-500" : "bg-transparent",
                                            )} />
                                            <div className="flex items-start gap-2.5">
                                                <div className={cn(
                                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                                                    !enabled
                                                        ? "bg-slate-100"
                                                        : d.source === 'docu-form' ? "bg-violet-50" : "bg-blue-50",
                                                )}>
                                                    <FileText className={cn(
                                                        "h-4 w-4",
                                                        !enabled
                                                            ? "text-slate-400"
                                                            : d.source === 'docu-form' ? "text-violet-500" : "text-blue-500",
                                                    )} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={cn("font-semibold", enabled ? "text-slate-900" : "text-slate-400")}>
                                                        {d.name}
                                                    </p>
                                                    {d.linkedTo && (
                                                        <p className={cn("mt-0.5 text-[11px]", enabled ? "text-slate-500" : "text-slate-400")}>
                                                            {d.linkedType === 'expense' ? 'Linked to Expense: ' :
                                                             d.linkedType === 'module'  ? 'Linked to ' : 'Linked to: '}
                                                            {d.linkedTo}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 text-[13px]",
                                                enabled ? "text-slate-700" : "text-slate-400",
                                            )}>
                                                <ScopeIcon size={14} className={enabled ? "text-slate-400" : "text-slate-300"} /> {SCOPE_LABEL[d.scope]}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <span className={cn(
                                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                                                d.status === 'Active'
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                    : "border-slate-200 bg-slate-100 text-slate-500",
                                            )}>
                                                {d.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            {linkedKn ? (
                                                <span className={cn(
                                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                                    enabled ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500",
                                                )}>
                                                    <Link2 size={11} /> will cascade
                                                </span>
                                            ) : (
                                                <span className="text-[12px] text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-end">
                                                <Toggle
                                                    checked={enabled}
                                                    onCheckedChange={(v) => onToggle(d.id, v)}
                                                />
                                            </div>
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

// ── Page shell ────────────────────────────────────────────────────────

export const CarrierComplianceSetupPage = () => {
    const [pageMode, setPageMode] = useState<PageMode>('compliance');
    const [carrierId, setCarrierId] = useState<string>(ACCOUNTS_DB[0]?.id ?? '');
    const [assignment, setAssignment] = useState<CarrierComplianceAssignment>(() => loadCarrierAssignment(carrierId));
    const [toastMessages, setToastMessages] = useState<string[]>([]);
    const [savedFlash, setSavedFlash] = useState(false);
    const [templates, setTemplates] = useState<ComplianceTemplate[]>(() => loadTemplates());
    const [hiringTemplates] = useState<DriverHiringTemplate[]>(() => loadHiringTemplates());
    const [formType, setFormType] = useState<string>('hiring-driver');
    const [showTemplateManager, setShowTemplateManager] = useState(false);

    // Form-type options surface from the hiring-templates catalog so the
    // dropdown stays in lockstep with what actually exists in the system.
    const formTypeOptions = useMemo(() => {
        const seen = new Set<string>();
        const out: { id: string; label: string }[] = [];
        for (const t of hiringTemplates) {
            if (seen.has(t.formType)) continue;
            seen.add(t.formType);
            out.push({ id: t.formType, label: formTypeLabel(t.formType) });
        }
        if (out.length === 0) out.push({ id: 'hiring-driver', label: 'Hiring Driver' });
        return out;
    }, [hiringTemplates]);

    const filteredHiringTemplates = useMemo(
        () => hiringTemplates.filter(t => t.formType === formType),
        [hiringTemplates, formType],
    );

    // Reload assignment when the carrier changes.
    useEffect(() => {
        if (!carrierId) return;
        setAssignment(loadCarrierAssignment(carrierId));
    }, [carrierId]);

    // Show a brief "Saved" check after each change.
    const flashSaved = () => {
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1200);
    };

    const enabledKnSet = useMemo(() => new Set(assignment.enabledKeyNumberIds), [assignment]);
    const enabledDocSet = useMemo(() => new Set(assignment.enabledDocumentTypeIds), [assignment]);

    /**
     * Single toggle (with cascade). Uses functional setState so rapid clicks
     * don't read stale closure-captured state.
     */
    const handleToggle = (kind: 'keynumber' | 'document', id: string, enable: boolean) => {
        setAssignment(prev => {
            const { next, cascaded } = applyToggle(prev, kind, id, enable);
            saveCarrierAssignment(next);
            if (cascaded.length > 0) {
                const action = enable ? 'enabled' : 'disabled';
                setToastMessages(cascaded.map(c =>
                    `Also ${action} linked ${c.kind === 'keynumber' ? 'Key Number' : 'Document'}: ${c.name}`
                ));
            }
            flashSaved();
            return next;
        });
    };

    /** Bulk toggle for "Enable all" / "Disable all" buttons (current view only). */
    const handleBulk = (kind: 'keynumber' | 'document', ids: string[], enable: boolean) => {
        setAssignment(prev => {
            const next = applyBulk(prev, kind, ids, enable);
            saveCarrierAssignment(next);
            flashSaved();
            return next;
        });
    };

    /** Reset this carrier's assignment back to the catalog defaults. */
    const handleReset = () => {
        if (!window.confirm('Reset this carrier to the catalog defaults? Every "Active" key number and document type will be re-enabled.')) return;
        const next = defaultAssignmentFor(carrierId);
        setAssignment(next);
        saveCarrierAssignment(next);
        flashSaved();
    };

    /** Apply a template to the current carrier (overwrites + cascades). */
    const handleApplyTemplate = (t: ComplianceTemplate) => {
        const next = applyTemplate(assignment, t);
        setAssignment(next);
        saveCarrierAssignment(next);
        setToastMessages([`Applied template: ${t.name}`]);
        flashSaved();
        setShowTemplateManager(false);
    };

    /** Toggle a hiring template's enabled state for this carrier. */
    const handleToggleHiringTemplate = (templateId: string, enabled: boolean) => {
        const current = assignment.enabledHiringTemplateIds ?? [];
        const next = enabled
            ? [...current.filter(id => id !== templateId), templateId]
            : current.filter(id => id !== templateId);
        const nextAssignment = { ...assignment, enabledHiringTemplateIds: next };
        setAssignment(nextAssignment);
        saveCarrierAssignment(nextAssignment);
        flashSaved();
    };

    /** Bulk enable/disable all hiring templates. */
    const handleBulkHiringTemplates = (enable: boolean) => {
        const next = enable ? hiringTemplates.map(t => t.id) : [];
        const nextAssignment = { ...assignment, enabledHiringTemplateIds: next };
        setAssignment(nextAssignment);
        saveCarrierAssignment(nextAssignment);
        flashSaved();
    };

    /** Clear the template binding (admin enters fully-custom mode). */
    const handleClearTemplate = () => {
        const next = { ...assignment, appliedTemplateId: undefined };
        setAssignment(next);
        saveCarrierAssignment(next);
        flashSaved();
    };

    const handleDeleteTemplate = (t: ComplianceTemplate) => {
        if (!window.confirm(`Delete template "${t.name}"? Carriers currently bound to it will become "Custom".`)) return;
        deleteTemplate(t.id);
        setTemplates(loadTemplates());
        // If this carrier was bound to the deleted template, clear the link.
        if (assignment.appliedTemplateId === t.id) handleClearTemplate();
    };

    const appliedTemplate = templates.find(t => t.id === assignment.appliedTemplateId);
    const templateDrift = appliedTemplate ? !templateMatches(assignment, appliedTemplate) : false;

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

    const selectedCarrier = ACCOUNTS_DB.find(c => c.id === carrierId);
    const knPct = SEED_KEY_NUMBERS.length === 0 ? 0 : Math.round((enabledKnSet.size / SEED_KEY_NUMBERS.length) * 100);
    const docPct = DOCUMENTS.length === 0 ? 0 : Math.round((enabledDocSet.size / DOCUMENTS.length) * 100);

    return (
        <div className="flex h-full flex-col bg-slate-50/50">
            {/* Sticky header */}
            <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
                <div className="px-6 pt-4">
                    <nav className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500" aria-label="Breadcrumb">
                        <span>Super Admin</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-900">Carrier Compliance Setup</span>
                    </nav>
                </div>

                <div className="px-6 pb-4 flex flex-wrap items-start justify-between gap-4">
                    {/* Left: icon + title + subtitle */}
                    <div className="flex items-start gap-3 min-w-0">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-sm">
                            <Network size={18} />
                        </span>
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                Carrier Compliance Setup
                            </h1>
                            <p className="mt-0.5 text-sm text-slate-500">
                                Pick which Key Numbers and Document Types each carrier tracks.
                                Linked items cascade automatically.
                            </p>
                        </div>
                    </div>

                    {/* Right: mode switch on top, Reset below */}
                    <div className="flex flex-col items-end gap-3">
                        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                            {pillBtn('compliance', 'Compliance')}
                            {pillBtn('documents',  'Documents')}
                            {pillBtn('templates',  'Templates')}
                        </div>
                        <div className="flex items-center gap-2">
                            {savedFlash && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                    <Check size={11} /> Saved
                                </span>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleReset}
                                className="gap-1.5"
                                title="Reset this carrier to catalog defaults (every Active item re-enabled)"
                            >
                                <RotateCcw size={14} /> Reset to defaults
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Unified context strip — carrier on left, template on right */}
                <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-3">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-6">
                        {/* Carrier picker */}
                        <div>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Configuring carrier
                            </label>
                            <div className="flex items-center gap-2">
                                <select
                                    value={carrierId}
                                    onChange={(e) => setCarrierId(e.target.value)}
                                    className="h-10 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    {ACCOUNTS_DB.map(c => (
                                        <option key={c.id} value={c.id}>{c.dbaName || c.legalName}</option>
                                    ))}
                                </select>
                            </div>
                            {selectedCarrier && (
                                <p className="mt-1 truncate text-[11px] text-slate-500">
                                    USDOT <span className="font-semibold text-slate-700">{selectedCarrier.dotNumber || '—'}</span>
                                    {' · '}{selectedCarrier.city}, {selectedCarrier.state}, {selectedCarrier.country}
                                </p>
                            )}
                        </div>

                        {/* Template picker */}
                        <div>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Apply template
                            </label>
                            <div className="flex items-center gap-2">
                                <select
                                    value={assignment.appliedTemplateId ?? ''}
                                    onChange={(e) => {
                                        if (!e.target.value) { handleClearTemplate(); return; }
                                        const t = templates.find(x => x.id === e.target.value);
                                        if (t) handleApplyTemplate(t);
                                    }}
                                    className="h-10 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">None (Custom)</option>
                                    <optgroup label="Built-in">
                                        {templates.filter(t => t.isSeed).map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </optgroup>
                                    {templates.some(t => !t.isSeed) && (
                                        <optgroup label="Custom">
                                            {templates.filter(t => !t.isSeed).map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowTemplateManager(true)}
                                    className="h-10 shrink-0 gap-1.5"
                                >
                                    <LayoutTemplate size={14} /> Manage
                                </Button>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                                {appliedTemplate ? (
                                    <span className={cn(
                                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
                                        templateDrift ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700",
                                    )}>
                                        {templateDrift ? '● Modified from template' : <><Check size={11} /> In sync with template</>}
                                    </span>
                                ) : (
                                    <span className="text-slate-400">No template applied · fully custom configuration</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Compact progress row */}
                    <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-200/70 pt-3">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Key Numbers</span>
                            <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
                                <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${knPct}%` }} />
                            </div>
                            <span className="text-[12px] font-semibold text-slate-700">
                                {enabledKnSet.size}<span className="text-slate-400">/{SEED_KEY_NUMBERS.length}</span>
                            </span>
                        </div>
                        <div className="h-4 w-px bg-slate-200" />
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Documents</span>
                            <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
                                <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${docPct}%` }} />
                            </div>
                            <span className="text-[12px] font-semibold text-slate-700">
                                {enabledDocSet.size}<span className="text-slate-400">/{DOCUMENTS.length}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Body */}
            <main className="flex-1 overflow-y-auto">
                {pageMode === 'compliance' && (
                    <KeyNumbersAssignment
                        enabledIds={enabledKnSet}
                        onToggle={(id, enabled) => handleToggle('keynumber', id, enabled)}
                        onBulk={(ids, enable) => handleBulk('keynumber', ids, enable)}
                    />
                )}
                {pageMode === 'documents' && (
                    <DocumentsAssignment
                        enabledIds={enabledDocSet}
                        onToggle={(id, enabled) => handleToggle('document', id, enabled)}
                        onBulk={(ids, enable) => handleBulk('document', ids, enable)}
                    />
                )}
                {pageMode === 'templates' && (
                    <TemplatesPanel
                        hiringTemplates={filteredHiringTemplates}
                        formType={formType}
                        formTypeOptions={formTypeOptions}
                        onFormTypeChange={setFormType}
                        enabledHiringIds={assignment.enabledHiringTemplateIds ?? []}
                        onToggleHiring={handleToggleHiringTemplate}
                        onBulkHiring={handleBulkHiringTemplates}
                    />
                )}
            </main>

            <CascadeToast
                messages={toastMessages}
                onDismiss={() => setToastMessages([])}
            />

            {showTemplateManager && (
                <TemplateManagerModal
                    templates={templates}
                    appliedTemplateId={assignment.appliedTemplateId}
                    onApply={handleApplyTemplate}
                    onSave={(t) => { upsertTemplate(t); setTemplates(loadTemplates()); }}
                    onDelete={handleDeleteTemplate}
                    onClose={() => setShowTemplateManager(false)}
                />
            )}
        </div>
    );
};

export default CarrierComplianceSetupPage;
