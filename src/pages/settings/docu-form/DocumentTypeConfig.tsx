import { Upload, Search, Link2, FileText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
    loadDocumentTypes,
} from '@/pages/ats/document-types.data';

/**
 * Reusable Document Type picker for `document` field types.
 *
 * Required pick — every `document` field must link to a Document Type from the
 * Documents tab library. The linked type drives the upload component's
 * behaviour (expiry / issue-date / issue-state / issue-country / multiple).
 *
 * Auto-fills the field label from the type's name on first pick.
 */
export function DocumentTypeConfig({ documentTypeId, currentLabel, onPick }: {
    documentTypeId: string | undefined;
    currentLabel: string;
    onPick: (next: { documentTypeId: string; label: string }) => void;
}) {
    const [query, setQuery] = useState('');
    const types = useMemo(() => loadDocumentTypes().filter(t => t.status === 'Active'), []);
    const linked = types.find(t => t.id === documentTypeId);
    const q = query.trim().toLowerCase();
    const filtered = q
        ? types.filter(t => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
        : types;

    return (
        <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4">
            <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100">
                    <Upload size={14} className="text-blue-700" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-slate-900">
                        Linked Document Type {!linked && <span className="text-rose-600">*</span>}
                    </p>
                    <p className="text-[11px] text-slate-500">
                        Drives the upload component (expiry, issue date / state / country, multiple).
                    </p>
                </div>
            </div>

            {linked ? (
                <div className="rounded-lg border border-blue-300 bg-white p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                            <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-sm font-semibold text-slate-900">{linked.name}</span>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                    {linked.category}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                    <Link2 size={9} /> linked
                                </span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {linked.allowMultiple        && <Badge label="Multiple uploads" />}
                                {linked.expiryRequired       && <Badge label="Expiry req." />}
                                {linked.issueDateRequired    && <Badge label="Issue date req." />}
                                {linked.issueStateRequired   && <Badge label="Issue state req." />}
                                {linked.issueCountryRequired && <Badge label="Issue country req." />}
                                {!linked.allowMultiple && !linked.expiryRequired && !linked.issueDateRequired
                                    && !linked.issueStateRequired && !linked.issueCountryRequired && (
                                    <span className="text-[11px] italic text-slate-400">No extra capture requirements</span>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => onPick({ documentTypeId: '', label: currentLabel })}
                            className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                        >
                            Change
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="relative mb-3">
                        <Search size={14} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search document types by name or category…"
                            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div className="max-h-72 grid grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 pr-1">
                        {filtered.length === 0 && (
                            <div className="col-span-full rounded-lg border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-400">
                                No document types match "{query}".
                            </div>
                        )}
                        {filtered.map(t => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => onPick({
                                    documentTypeId: t.id,
                                    label: currentLabel.trim().length === 0 || currentLabel === 'New field'
                                        ? t.name
                                        : currentLabel,
                                })}
                                className={cn(
                                    "flex w-full items-start gap-2.5 rounded-lg border bg-white px-3 py-2.5 text-left transition-colors",
                                    "border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 hover:shadow-sm",
                                )}
                            >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13px] font-semibold text-slate-800">{t.name}</p>
                                    <p className="mt-0.5 text-[11px] text-slate-500">
                                        {t.category}
                                        {t.required && ' · required'}
                                        {t.expiryRequired && ' · expiry'}
                                        {t.issueDateRequired && ' · issue date'}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                    <p className="mt-3 rounded-md bg-white/60 px-3 py-2 text-[11px] text-slate-500">
                        Don't see the type you need?
                        <span className="ml-1 font-semibold text-blue-700">
                            Add it in the Documents tab
                        </span>{' '}
                        — every form (main or subform) will see it instantly.
                    </p>
                </>
            )}
        </div>
    );
}

function Badge({ label }: { label: string }) {
    return (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            {label}
        </span>
    );
}
