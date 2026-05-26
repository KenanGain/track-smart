import { useMemo, useState } from 'react';
import { FileText, Search, Plus, Pencil, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    loadDocumentTypes, saveDocumentTypes, newDocumentType,
    DOC_TYPE_CATEGORIES, type DocumentType, type DocTypeCategory, type DocTypeStatus,
} from '@/pages/ats/document-types.data';
import { PageHeader } from './PageHeader';
import { StatStrip } from './StatStrip';
import { EmptyState } from './EmptyState';

/**
 * Documents tab — CRUD library of Document Types.
 *
 * Admins define document types here once (name, category, requirement flags,
 * multiple-upload, status). Forms reference these types via their `document`
 * fields or `documents[]` list; the type's flags drive how the upload component
 * renders on the form (expiry input, issue-date/state/country inputs, etc.).
 */

const INPUT_CLS =
    "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 " +
    "focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function YesNo({ value }: { value: boolean }) {
    return (
        <span className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
            value ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
        )}>
            {value ? 'Yes' : 'No'}
        </span>
    );
}

function StatusPill({ status }: { status: DocTypeStatus }) {
    return (
        <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            status === 'Active'
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500",
        )}>
            <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                status === 'Active' ? "bg-emerald-500" : "bg-slate-400",
            )} />
            {status}
        </span>
    );
}

function CategoryBadge({ category }: { category: DocTypeCategory }) {
    const tone: Record<DocTypeCategory, string> = {
        License: 'bg-blue-50 text-blue-700',
        Medical: 'bg-rose-50 text-rose-700',
        Identity: 'bg-violet-50 text-violet-700',
        Background: 'bg-amber-50 text-amber-700',
        Photo: 'bg-cyan-50 text-cyan-700',
        Insurance: 'bg-indigo-50 text-indigo-700',
        Other: 'bg-slate-100 text-slate-600',
    };
    return (
        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", tone[category])}>
            {category}
        </span>
    );
}

/** Toggle row used inside the document-type modal — label + help on the left, switch on the right. */
function ToggleRow({ label, help, value, onToggle }: {
    label: string; help: string; value: boolean; onToggle: () => void;
}) {
    return (
        <div
            onClick={onToggle}
            className={cn(
                "flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                value ? "border-blue-300 bg-blue-50/40" : "border-slate-200 hover:bg-slate-50",
            )}
        >
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{help}</p>
            </div>
            <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                <Toggle checked={value} onCheckedChange={onToggle} />
            </div>
        </div>
    );
}

/** Add / edit modal for one document type. */
function DocumentTypeModal({ initial, isNew, onSave, onClose }: {
    initial: DocumentType;
    isNew: boolean;
    onSave: (t: DocumentType) => void;
    onClose: () => void;
}) {
    const [draft, setDraft] = useState(initial);
    const up = (p: Partial<DocumentType>) => setDraft(d => ({ ...d, ...p }));
    const canSave = draft.name.trim().length > 0;

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
                {/* Header */}
                <DialogHeader className="border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
                            <FileText size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-base font-semibold text-slate-900">
                                {isNew ? 'Add Document Type' : 'Edit Document Type'}
                            </DialogTitle>
                            <p className="mt-0.5 text-[12px] text-slate-500">
                                Define one type once — every form references it from the library.
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                {/* Body */}
                <div className="flex-1 overflow-y-auto bg-slate-50/40 px-6 py-5">
                    <div className="space-y-5">
                        {/* Basics */}
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                Basics
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                        Document name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        value={draft.name}
                                        onChange={(e) => up({ name: e.target.value })}
                                        placeholder="e.g. CDL — Front & Back"
                                        className={cn(INPUT_CLS, 'h-10')}
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Category</label>
                                        <select
                                            value={draft.category}
                                            onChange={(e) => up({ category: e.target.value as DocTypeCategory })}
                                            className={cn(INPUT_CLS, 'h-10')}
                                        >
                                            {DOC_TYPE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Status</label>
                                        <select
                                            value={draft.status}
                                            onChange={(e) => up({ status: e.target.value as DocTypeStatus })}
                                            className={cn(INPUT_CLS, 'h-10')}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Upload settings */}
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                    Upload settings
                                </p>
                                <p className="text-[11px] text-slate-400">
                                    These flags drive what the form's upload component captures.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                <ToggleRow
                                    label="Required"
                                    help="Applicant must upload at least one file."
                                    value={draft.required}
                                    onToggle={() => up({ required: !draft.required })}
                                />
                                <ToggleRow
                                    label="Allow multiple"
                                    help="More than one file per applicant."
                                    value={draft.allowMultiple}
                                    onToggle={() => up({ allowMultiple: !draft.allowMultiple })}
                                />
                                <ToggleRow
                                    label="Expiry date"
                                    help="Capture an expiry date on upload."
                                    value={draft.expiryRequired}
                                    onToggle={() => up({ expiryRequired: !draft.expiryRequired })}
                                />
                                <ToggleRow
                                    label="Issue date"
                                    help="Capture an issue date on upload."
                                    value={draft.issueDateRequired}
                                    onToggle={() => up({ issueDateRequired: !draft.issueDateRequired })}
                                />
                                <ToggleRow
                                    label="Issue state"
                                    help="Capture an issuing state / province."
                                    value={draft.issueStateRequired}
                                    onToggle={() => up({ issueStateRequired: !draft.issueStateRequired })}
                                />
                                <ToggleRow
                                    label="Issue country"
                                    help="Capture an issuing country."
                                    value={draft.issueCountryRequired}
                                    onToggle={() => up({ issueCountryRequired: !draft.issueCountryRequired })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sticky footer */}
                <DialogFooter className="border-t border-slate-200 bg-white px-6 py-3">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        disabled={!canSave}
                        onClick={() => onSave({ ...draft, name: draft.name.trim() })}
                        className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                    >
                        <Check className="h-4 w-4" />
                        {isNew ? 'Add Document' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function DocumentsTab() {
    const [types, setTypes] = useState<DocumentType[]>(loadDocumentTypes);
    const [editing, setEditing] = useState<DocumentType | null>(null);
    const [adding, setAdding] = useState(false);
    const [query, setQuery] = useState('');

    const commit = (next: DocumentType[]) => {
        setTypes(next);
        saveDocumentTypes(next);
    };

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return types;
        return types.filter(t =>
            t.name.toLowerCase().includes(q)
            || t.category.toLowerCase().includes(q)
            || t.status.toLowerCase().includes(q));
    }, [types, query]);

    const addType = (t: DocumentType) => { commit([t, ...types]); setAdding(false); };
    const saveType = (t: DocumentType) => { commit(types.map(x => x.id === t.id ? t : x)); setEditing(null); };
    const removeType = (id: string) => commit(types.filter(t => t.id !== id));

    const activeCount = types.filter(t => t.status === 'Active').length;

    const inactiveCount = types.length - activeCount;

    return (
        <div>
            <PageHeader
                icon={FileText}
                title="Document Types"
                description="Define every document the applicant can be asked to upload. Forms reference these types and render the upload component according to each type's flags (expiry, issue date / state / country, multiple uploads)."
                stats={(
                    <StatStrip stats={[
                        { label: 'total', value: types.length, tone: 'default' },
                        { label: 'active', value: activeCount, tone: 'success' },
                        { label: 'inactive', value: inactiveCount, tone: 'muted' },
                    ]} />
                )}
                actions={(
                    <>
                        <div className="relative">
                            <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
                            <input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search by name, category, or status…"
                                className="h-9 w-72 rounded-md border border-slate-300 bg-white pl-8 pr-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <Button
                            size="sm"
                            onClick={() => setAdding(true)}
                            className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" /> Add Document Type
                        </Button>
                    </>
                )}
            />

            {/* Table */}
            {types.length === 0 ? (
                <EmptyState
                    icon={FileText}
                    title="No document types yet"
                    description="Define the documents your applicants will be asked to upload. Each type's flags drive what the form's upload component looks like."
                    action={(
                        <Button
                            size="sm"
                            onClick={() => setAdding(true)}
                            className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" /> Add Document Type
                        </Button>
                    )}
                />
            ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr className="text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                    <th className="px-4 py-3">Document Type</th>
                                    <th className="px-3 py-3">Category</th>
                                    <th className="px-3 py-3 text-center">Required</th>
                                    <th className="px-3 py-3 text-center">Multiple Upload</th>
                                    <th className="px-3 py-3 text-center">Expiry Req.</th>
                                    <th className="px-3 py-3 text-center">Issue Date Req.</th>
                                    <th className="px-3 py-3 text-center">Issue State Req.</th>
                                    <th className="px-3 py-3 text-center">Issue Country Req.</th>
                                    <th className="px-3 py-3">Status</th>
                                    <th className="px-3 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="px-3 py-10 text-center text-xs text-slate-400">
                                            No documents match “{query}”.
                                        </td>
                                    </tr>
                                )}
                                {filtered.map((t) => (
                                    <tr key={t.id} className="transition-colors hover:bg-blue-50/30">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100">
                                                    <FileText className="h-4 w-4 text-slate-400" />
                                                </div>
                                                <span className="font-medium text-slate-800">{t.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3"><CategoryBadge category={t.category} /></td>
                                        <td className="px-3 py-3 text-center"><YesNo value={t.required} /></td>
                                        <td className="px-3 py-3 text-center"><YesNo value={t.allowMultiple} /></td>
                                        <td className="px-3 py-3 text-center"><YesNo value={t.expiryRequired} /></td>
                                        <td className="px-3 py-3 text-center"><YesNo value={t.issueDateRequired} /></td>
                                        <td className="px-3 py-3 text-center"><YesNo value={t.issueStateRequired} /></td>
                                        <td className="px-3 py-3 text-center"><YesNo value={t.issueCountryRequired} /></td>
                                        <td className="px-3 py-3"><StatusPill status={t.status} /></td>
                                        <td className="px-3 py-3">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditing(t)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                                                    title="Edit"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeType(t.id)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {adding && (
                <DocumentTypeModal
                    initial={newDocumentType()}
                    isNew
                    onSave={addType}
                    onClose={() => setAdding(false)}
                />
            )}
            {editing && (
                <DocumentTypeModal
                    initial={editing}
                    isNew={false}
                    onSave={saveType}
                    onClose={() => setEditing(null)}
                />
            )}
        </div>
    );
}
