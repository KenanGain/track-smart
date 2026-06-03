import { useMemo, useState } from 'react';
import { Plus, Trash2, FileText, Search, Check, Link2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { type FormDocument, type FormField } from '@/pages/ats/application-forms.data';
import { uid } from '@/pages/ats/driver-application.data';
import { loadDocumentTypes, type DocumentType } from '@/pages/ats/document-types.data';
import { DOCUMENTS } from '@/pages/admin/ComplianceAndDocumentsPage';
import { loadAdminDocuments, adminDocsAsFormTypes } from '@/pages/admin/compliance-catalog.data';

/**
 * Per-form documents editor.
 *
 * Documents are picked from the master Document Types library. For each linked
 * doc the admin can override:
 *   • **Label** — text shown to the applicant on this form
 *   • **Placement** — where the upload widget appears (Required Documents
 *     section at the bottom, immediately after a specific field, or inline at
 *     the end of all fields)
 *   • **Required** — overrides the type's default required flag
 *
 * Inherited metadata (category, expiry / issue / state / country requirements)
 * is pulled from the linked type and shown as read-only badges.
 */

/** Placement options offered to the admin per doc. */
function placementOptions(fields: FormField[]) {
    const fieldOpts = fields
        .filter(f => f.type !== 'heading' && f.type !== 'alert' && f.type !== 'paragraph' && f.type !== 'bullet-list')
        .map(f => ({ value: `after:${f.id}`, label: `After: ${f.label || 'Untitled field'}` }));
    return [
        { value: 'bottom',      label: 'Required Documents (bottom)' },
        { value: 'inline-end',  label: 'Inline — after all fields' },
        ...fieldOpts,
    ];
}

function placementLabel(placement: string | undefined, fields: FormField[]) {
    if (!placement || placement === 'bottom') return 'Required Documents (bottom)';
    if (placement === 'inline-end') return 'Inline — after all fields';
    if (placement.startsWith('after:')) {
        const fid = placement.slice('after:'.length);
        const f = fields.find(x => x.id === fid);
        return `After: ${f?.label ?? '(removed field)'}`;
    }
    return placement;
}

/** Build a FormDocument from a Document Type — copies the type's defaults so existing forms keep working
 *  even if the linked type is later edited or removed. */
function fromType(t: DocumentType, label?: string, placement?: string): FormDocument {
    return {
        id: uid(),
        documentTypeId: t.id,
        label: (label && label.trim().length > 0) ? label.trim() : t.name,
        category: t.category,
        required: t.required,
        allowMultiple: t.allowMultiple,
        numberOfSlots: t.numberOfSlots,
        slotLabels: t.slotLabels,
        expiryRequired: t.expiryRequired,
        issueDateRequired: t.issueDateRequired,
        issueStateRequired: t.issueStateRequired,
        issueCountryRequired: t.issueCountryRequired,
        status: t.status,
        addedDate: t.addedDate,
        placement: placement ?? 'bottom',
    };
}

interface PickerDraft {
    typeId: string;
    label: string;
    placement: string;
}

/** Picker dialog — selects one or more Document Types from the master library and
 *  lets the admin set a label and placement per pick. */
function DocumentPicker({ fields, alreadyLinkedIds, onPick, onClose }: {
    fields: FormField[];
    alreadyLinkedIds: Set<string>;
    onPick: (drafts: { type: DocumentType; label: string; placement: string }[]) => void;
    onClose: () => void;
}) {
    // Only show document types flagged for Hiring/Templates/Form usage. The
    // catalog admin sets `usingInHiring` (Super Admin → Compliance and
    // Documents → "Used in Hiring / Templates / Form") to decide what flows
    // into the Docu/Form Generator. We reflect the admin Compliance & Documents
    // catalog as the source, merged with any legacy ATS types (deduped by id).
    const types = useMemo(() => {
        const adminTypes = adminDocsAsFormTypes(loadAdminDocuments(DOCUMENTS));
        const legacy = loadDocumentTypes().filter(t => t.status === 'Active' && t.usingInHiring);
        const seen = new Set(adminTypes.map(t => t.id));
        return [...adminTypes, ...legacy.filter(t => !seen.has(t.id))];
    }, []);
    const [query, setQuery] = useState('');
    const [drafts, setDrafts] = useState<Record<string, PickerDraft>>({});
    const placements = useMemo(() => placementOptions(fields), [fields]);

    const filtered = types.filter(t => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
    });

    const togglePick = (t: DocumentType) => {
        setDrafts(prev => {
            const next = { ...prev };
            if (next[t.id]) {
                delete next[t.id];
            } else {
                next[t.id] = { typeId: t.id, label: t.name, placement: 'bottom' };
            }
            return next;
        });
    };
    const updateDraft = (id: string, patch: Partial<PickerDraft>) =>
        setDrafts(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

    const selectedCount = Object.keys(drafts).length;

    const confirm = () => {
        const picks = Object.values(drafts).map(d => {
            const type = types.find(t => t.id === d.typeId)!;
            return { type, label: d.label, placement: d.placement };
        });
        if (picks.length > 0) onPick(picks);
        onClose();
    };

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add Documents to Form</DialogTitle>
                </DialogHeader>
                <p className="text-xs text-slate-500">
                    Pick one or more document types from your library. For each pick, set the
                    label shown to the applicant and where the upload widget appears on the form.
                </p>

                <div className="relative">
                    <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
                    <input
                        autoFocus
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search by name or category…"
                        className="h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                <div className="max-h-[55vh] space-y-1.5 overflow-y-auto">
                    {filtered.length === 0 && (
                        <div className="px-3 py-8 text-center text-sm text-slate-400">
                            No document types match “{query}”.
                        </div>
                    )}
                    {filtered.map(t => {
                        const alreadyLinked = alreadyLinkedIds.has(t.id);
                        const draft = drafts[t.id];
                        const picked = !!draft;
                        return (
                            <div
                                key={t.id}
                                className={cn(
                                    "rounded-lg border bg-white transition-colors",
                                    picked ? "border-blue-400 bg-blue-50/40" : "border-slate-200",
                                    alreadyLinked && "opacity-60",
                                )}
                            >
                                <label className={cn(
                                    "flex items-center gap-3 px-3 py-2",
                                    alreadyLinked ? "cursor-not-allowed" : "cursor-pointer",
                                )}>
                                    <input
                                        type="checkbox"
                                        checked={picked}
                                        disabled={alreadyLinked}
                                        onChange={() => !alreadyLinked && togglePick(t)}
                                        className="h-4 w-4 accent-blue-600"
                                    />
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100">
                                        <FileText className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-slate-800">{t.name}</p>
                                        <p className="text-[11px] text-slate-500">
                                            {t.category}
                                            {t.required && <span className="ml-1.5 rounded bg-rose-50 px-1 py-0.5 text-[10px] font-semibold text-rose-700">Required</span>}
                                            {alreadyLinked && <span className="ml-1.5 italic text-slate-400">already on this form</span>}
                                        </p>
                                    </div>
                                </label>

                                {/* Per-pick configuration revealed once selected */}
                                {picked && (
                                    <div className="space-y-2.5 border-t border-blue-200/60 px-3 py-3">
                                        <div>
                                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                Label on this form
                                            </label>
                                            <input
                                                value={draft.label}
                                                onChange={e => updateDraft(t.id, { label: e.target.value })}
                                                placeholder="Label shown to the applicant"
                                                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                <MapPin size={10} /> Placement on the form
                                            </label>
                                            <select
                                                value={draft.placement}
                                                onChange={e => updateDraft(t.id, { placement: e.target.value })}
                                                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            >
                                                {placements.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        disabled={selectedCount === 0}
                        onClick={confirm}
                        className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                    >
                        <Check className="h-4 w-4" />
                        Add {selectedCount > 0 ? `${selectedCount} ` : ''}document{selectedCount === 1 ? '' : 's'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function FormDocumentsEditor({ documents, fields, onChange }: {
    documents: FormDocument[];
    /** All fields on the form — used to offer "After: <field>" placement choices. */
    fields: FormField[];
    onChange: (documents: FormDocument[]) => void;
}) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const placements = useMemo(() => placementOptions(fields), [fields]);

    const update = (id: string, patch: Partial<FormDocument>) =>
        onChange(documents.map(d => d.id === id ? { ...d, ...patch } : d));
    const remove = (id: string) => onChange(documents.filter(d => d.id !== id));

    const onPick = (picks: { type: DocumentType; label: string; placement: string }[]) => {
        onChange([...documents, ...picks.map(p => fromType(p.type, p.label, p.placement))]);
    };

    const linkedIds = new Set(documents.map(d => d.documentTypeId).filter((id): id is string => !!id));

    return (
        <div className="space-y-2">
            {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/40 px-3 py-8 text-center">
                    <FileText className="mb-2 h-6 w-6 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">No documents required yet</p>
                    <p className="mt-0.5 max-w-sm text-[11px] text-slate-400">
                        Pick from your Document Types library to add upload requirements applicants must fulfil for this form.
                    </p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {documents.map(d => (
                        <li
                            key={d.id}
                            className="rounded-lg border border-slate-200 bg-white p-3"
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                                    <FileText className="h-4 w-4" />
                                </div>

                                <div className="min-w-0 flex-1 space-y-2.5">
                                    {/* Label + placement (two-column on wide screens) */}
                                    <div className="grid gap-2.5 md:grid-cols-2">
                                        <div>
                                            <div className="mb-1 flex items-center gap-2">
                                                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                    Label
                                                </span>
                                                {d.documentTypeId && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">
                                                        <Link2 size={9} /> from library
                                                    </span>
                                                )}
                                            </div>
                                            <input
                                                type="text"
                                                value={d.label}
                                                onChange={e => update(d.id, { label: e.target.value })}
                                                placeholder="Label shown to the applicant"
                                                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                <MapPin size={9} /> Placement
                                            </div>
                                            <select
                                                value={d.placement ?? 'bottom'}
                                                onChange={e => update(d.id, { placement: e.target.value })}
                                                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            >
                                                {placements.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Inherited metadata badges */}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                            {d.category}
                                        </span>
                                        {d.allowMultiple && (
                                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                                                Multiple uploads
                                            </span>
                                        )}
                                        {d.expiryRequired && (
                                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                                Expiry req.
                                            </span>
                                        )}
                                        {d.issueDateRequired && (
                                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                                Issue date req.
                                            </span>
                                        )}
                                        {d.issueStateRequired && (
                                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                                Issue state req.
                                            </span>
                                        )}
                                        {d.issueCountryRequired && (
                                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                                Issue country req.
                                            </span>
                                        )}
                                        {/* Show resolved placement in human-readable form */}
                                        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                                            <MapPin size={9} /> {placementLabel(d.placement, fields)}
                                        </span>
                                    </div>

                                    {/* Two labeled upload slots (e.g. license Front / Rear). */}
                                    {d.allowMultiple && (
                                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                                            <label className="flex items-center justify-between gap-2">
                                                <span className="text-[11px] font-semibold text-slate-600">Two labeled slots <span className="font-normal text-slate-400">(off = one upload)</span></span>
                                                <Toggle
                                                    checked={d.numberOfSlots === 2}
                                                    onCheckedChange={(v) => update(d.id, v
                                                        ? { numberOfSlots: 2, slotLabels: d.slotLabels?.length ? d.slotLabels : ['Front', 'Rear'] }
                                                        : { numberOfSlots: undefined, slotLabels: undefined })}
                                                />
                                            </label>
                                            {d.numberOfSlots === 2 && (
                                                <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-200 pt-2">
                                                    {[0, 1].map(i => (
                                                        <input
                                                            key={i}
                                                            type="text"
                                                            value={d.slotLabels?.[i] ?? ''}
                                                            placeholder={i === 0 ? 'Front' : 'Rear'}
                                                            onChange={(e) => { const next = [...(d.slotLabels ?? ['', ''])]; next[i] = e.target.value; update(d.id, { slotLabels: next }); }}
                                                            className="h-7 w-full rounded-md border border-slate-300 px-2 text-[12px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Required toggle + delete */}
                                <div className="flex shrink-0 items-center gap-2">
                                    <div className="flex flex-col items-center gap-1">
                                        <Toggle
                                            checked={d.required}
                                            onCheckedChange={(v) => update(d.id, { required: v })}
                                        />
                                        <span className={cn(
                                            "text-[10px] font-semibold uppercase tracking-wide",
                                            d.required ? "text-rose-600" : "text-slate-400",
                                        )}>
                                            {d.required ? 'Required' : 'Optional'}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => remove(d.id)}
                                        className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                        aria-label="Remove document"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <Button
                variant="outline"
                size="sm"
                onClick={() => setPickerOpen(true)}
                className="gap-1.5"
            >
                <Plus className="h-4 w-4" /> Add document from library
            </Button>

            {pickerOpen && (
                <DocumentPicker
                    fields={fields}
                    alreadyLinkedIds={linkedIds}
                    onPick={onPick}
                    onClose={() => setPickerOpen(false)}
                />
            )}
        </div>
    );
}
