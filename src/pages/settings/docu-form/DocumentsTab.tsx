import { useMemo, useState } from 'react';
import {
    FileText, Search, Link2, ExternalLink, Info, Building2, Truck, User, ShieldAlert,
    Files, Upload, Copy, Calendar, MapPin, Globe2, Eye, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    DOCUMENTS, SEED_KEY_NUMBERS,
    type DocumentRow, type DocumentsSubTabId,
} from '@/pages/admin/ComplianceAndDocumentsPage';

/**
 * Docu/Form Generator → Documents tab.
 *
 * Sister tab to Compliance — catalog view of documents available in this
 * form type. Read-only; the `usedInHiring` flag is set in the Super Admin
 * / Settings Compliance Setup pages. This tab shows what's enabled and
 * which input components the form builder will render when each doc is
 * added to a form (upload field + optional expiry / issue date / state /
 * country / allow-multiple inputs based on the catalog config).
 */

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

const SCOPE_TABS: DocumentsSubTabId[] = ['all', 'carrier', 'asset', 'driver', 'accidents', 'violation'];

function InputChip({
    icon: Icon, label, on, tone,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    on: boolean;
    tone: 'blue' | 'amber' | 'purple' | 'indigo' | 'violet';
}) {
    const onStyles: Record<typeof tone, string> = {
        blue:   'bg-blue-50 text-blue-700 border-blue-200',
        amber:  'bg-amber-50 text-amber-700 border-amber-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-200',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        violet: 'bg-violet-50 text-violet-700 border-violet-200',
    };
    if (!on) return null;
    return (
        <span className={cn(
            "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold",
            onStyles[tone],
        )}>
            <Icon size={10} /> {label}
        </span>
    );
}

export function DocumentsTab() {
    const [activeScope, setActiveScope] = useState<DocumentsSubTabId>('all');
    const [query, setQuery] = useState('');
    const [viewingId, setViewingId] = useState<string | null>(null);

    const inHiring = useMemo(() => DOCUMENTS.filter(d => d.usedInHiring), []);
    const viewing = viewingId ? DOCUMENTS.find(d => d.id === viewingId) ?? null : null;

    const counts = useMemo(() => {
        const out: Record<DocumentsSubTabId, { total: number; inHiring: number }> = {
            all:       { total: 0, inHiring: 0 },
            carrier:   { total: 0, inHiring: 0 },
            asset:     { total: 0, inHiring: 0 },
            driver:    { total: 0, inHiring: 0 },
            accidents: { total: 0, inHiring: 0 },
            violation: { total: 0, inHiring: 0 },
        };
        for (const d of DOCUMENTS) {
            out.all.total += 1;
            out[d.scope].total += 1;
            if (d.usedInHiring) {
                out.all.inHiring += 1;
                out[d.scope].inHiring += 1;
            }
        }
        return out;
    }, []);

    const scopeLabels: Record<DocumentsSubTabId, string> = {
        all: 'All', carrier: 'Carrier', asset: 'Asset', driver: 'Driver', accidents: 'Accidents', violation: 'Violation',
    };

    const q = query.trim().toLowerCase();
    const rows = inHiring
        .filter(d => activeScope === 'all' || d.scope === activeScope)
        .filter(d => !q
            || d.name.toLowerCase().includes(q)
            || (d.linkedTo ?? '').toLowerCase().includes(q)
            || d.folder.toLowerCase().includes(q));

    return (
        <div className="space-y-4">
            {/* Header card */}
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                            <Files size={18} className="text-violet-500" />
                        </span>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Documents</h2>
                            <p className="mt-0.5 text-[12px] text-slate-500">
                                Documents available in this form type. The form builder reads each row's configuration
                                to render the right inputs (upload, date, state, country, multiple) when the item is added.
                            </p>
                        </div>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5">
                        <span className="text-[11px] font-semibold text-slate-700">
                            {inHiring.length}<span className="text-slate-400">/{DOCUMENTS.length}</span>
                        </span>{' '}
                        <span className="text-[11px] text-slate-500">available</span>
                    </div>
                </div>

                <div className="mt-3 flex items-start gap-2 rounded-md border border-violet-200 bg-violet-50/50 px-3 py-2">
                    <Info size={13} className="mt-0.5 shrink-0 text-violet-600" />
                    <p className="text-[11px] text-violet-800">
                        Catalog and the <span className="font-semibold">Used in Hiring / Templates / Form</span> flag are managed in{' '}
                        <span className="font-semibold">Super Admin → Compliance and Documents</span>.
                    </p>
                </div>
            </div>

            {/* List */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* Compact filter row — pill group + search + count */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/40 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search documents…"
                                className="h-9 w-64 rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-white p-1">
                            {SCOPE_TABS.map(id => {
                                const on = activeScope === id;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setActiveScope(id)}
                                        className={cn(
                                            "rounded px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap",
                                            on
                                                ? "bg-violet-100 text-violet-700"
                                                : "text-slate-600 hover:bg-slate-100",
                                        )}
                                    >
                                        {scopeLabels[id]}
                                        <span className={cn("ml-1 text-[10px]", on ? "text-violet-500" : "text-slate-400")}>
                                            {counts[id].inHiring}/{counts[id].total}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <span className="text-[12px] text-slate-500">
                        Showing <span className="font-semibold text-slate-800">{rows.length}</span> in {activeScope === 'all' ? 'All scopes' : SCOPE_LABEL[activeScope]}
                    </span>
                </div>

                {rows.length === 0 ? (
                    <div className="px-3 py-12 text-center">
                        <p className="text-sm font-medium text-slate-700">No documents in this scope</p>
                        <p className="mt-1 text-[12px] text-slate-500">
                            Either none are flagged for hiring, or try a different tab / clear the search.
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {rows.map((d: DocumentRow) => {
                            const ScopeIcon = SCOPE_ICON[d.scope];
                            const linkedKnName = d.linkedKeyNumberId
                                ? SEED_KEY_NUMBERS.find(k => k.id === d.linkedKeyNumberId)?.name
                                : (d.linkedType === 'keynumber' ? d.linkedTo : undefined);
                            return (
                                <li key={d.id} className="px-4 py-3 transition-colors hover:bg-blue-50/30">
                                    <div className="flex items-start gap-3">
                                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-50">
                                            <FileText size={15} className="text-violet-500" />
                                        </span>
                                        <div className="min-w-0 flex-1 pr-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-semibold text-slate-900">{d.name}</p>
                                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                                                    <ScopeIcon size={12} className="text-slate-400" /> {SCOPE_LABEL[d.scope]}
                                                </span>
                                                {linkedKnName && linkedKnName.trim().toLowerCase() !== d.name.trim().toLowerCase() && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-blue-600">
                                                        <Link2 size={11} /> {linkedKnName}
                                                    </span>
                                                )}
                                                <span className={cn(
                                                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                                    d.status === 'Active'
                                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                        : "border-slate-200 bg-slate-100 text-slate-500",
                                                )}>
                                                    {d.status}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-[11px] text-slate-500">{d.folder}</p>

                                            {/* Inputs preview — what the form builder will render for this doc */}
                                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                    Form inputs:
                                                </span>
                                                <InputChip icon={Upload}   label="Upload"         on tone="violet" />
                                                <InputChip icon={Copy}     label="Allow Multiple" on={!!d.allowMultiple}      tone="violet" />
                                                <InputChip icon={Calendar} label="Expiry"         on={d.expiryRequired}       tone="amber" />
                                                <InputChip icon={Calendar} label="Issue Date"     on={d.issueDateRequired}    tone="blue" />
                                                <InputChip icon={MapPin}   label="Issue State"    on={d.issueStateRequired}   tone="purple" />
                                                <InputChip icon={Globe2}   label="Issue Country"  on={d.issueCountryRequired} tone="indigo" />
                                            </div>
                                        </div>

                                        {/* Per-row View — opens a modal showing how this doc renders on the form */}
                                        <button
                                            type="button"
                                            onClick={() => setViewingId(d.id)}
                                            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-[12px] font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                                            title="See how this renders on the form"
                                        >
                                            <Eye size={13} /> View
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-2.5">
                    <a
                        href="/admin/compliance-and-documents"
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600 hover:underline"
                    >
                        <ExternalLink size={11} />
                        Open full catalog (Super Admin → Compliance and Documents)
                    </a>
                </div>
            </div>

            {viewing && (
                <DocumentPreviewModal document={viewing} onClose={() => setViewingId(null)} />
            )}
        </div>
    );
}

/**
 * Preview modal — renders the document the way it appears on the actual
 * application form. Same input set the form builder generates at runtime:
 * upload widget + the meta inputs (expiry / issue date / state / country)
 * that the catalog config has enabled.
 */
function DocumentPreviewModal({ document, onClose }: {
    document: DocumentRow;
    onClose: () => void;
}) {
    const linkedKnName = document.linkedKeyNumberId
        ? SEED_KEY_NUMBERS.find(k => k.id === document.linkedKeyNumberId)?.name
        : (document.linkedType === 'keynumber' ? document.linkedTo : undefined);

    return (
        <div
            role="dialog"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6"
            onClick={onClose}
        >
            <div
                className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Form preview</p>
                        <h3 className="mt-0.5 text-base font-bold text-slate-900">{document.name}</h3>
                        <p className="mt-0.5 text-[12px] text-slate-500">
                            {SCOPE_LABEL[document.scope]} · {document.folder}
                            {linkedKnName && linkedKnName.trim().toLowerCase() !== document.name.trim().toLowerCase() && <> · Linked to <span className="font-semibold text-blue-600">{linkedKnName}</span></>}
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
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        {/* Field label — what the applicant sees */}
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            {document.name}{' '}
                            <span className="text-[10px] font-medium text-slate-400">· Document upload</span>
                        </p>

                        {/* Upload widget */}
                        <div className="flex items-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-500">
                            <Upload size={15} className="text-slate-400" />
                            {document.allowMultiple ? 'Upload documents (multiple allowed)' : 'Upload document'}
                        </div>

                        {/* Meta inputs — only render the ones the catalog enabled */}
                        {(document.expiryRequired || document.issueDateRequired || document.issueStateRequired || document.issueCountryRequired) && (
                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {document.expiryRequired && (
                                    <PreviewField label="Expiry date" placeholder="mm / dd / yyyy" icon={Calendar} />
                                )}
                                {document.issueDateRequired && (
                                    <PreviewField label="Issue date" placeholder="mm / dd / yyyy" icon={Calendar} />
                                )}
                                {document.issueStateRequired && (
                                    <PreviewField label="Issue state / province" placeholder="Select state…" icon={MapPin} />
                                )}
                                {document.issueCountryRequired && (
                                    <PreviewField label="Issue country" placeholder="Select country…" icon={Globe2} />
                                )}
                            </div>
                        )}

                        <p className="mt-3 text-[11px] italic text-slate-400">
                            This is exactly what the applicant sees when this document is added to a form.
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-3">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
}

function PreviewField({ label, placeholder, icon: Icon }: {
    label: string;
    placeholder: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
    return (
        <div>
            <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <Icon size={11} /> {label}
            </p>
            <div className="flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-400">
                {placeholder}
            </div>
        </div>
    );
}

export default DocumentsTab;
