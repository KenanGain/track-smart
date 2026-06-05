import { useMemo, useState } from 'react';
import {
    ShieldCheck, Search, Building2, Truck, User, Link2, ExternalLink, Info,
    KeyRound, Calendar, MapPin, Globe2, Eye, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    SEED_KEY_NUMBERS, DOCUMENTS, KEY_NUMBER_GROUPS,
    type KeyNumberRow, type KeyNumberGroup, type RelatedToScope,
} from '@/pages/admin/ComplianceAndDocumentsPage';

/**
 * Docu/Form Generator → Compliance tab.
 *
 * Catalog view of Key Numbers available in this form type. Read-only —
 * the `usedInHiring` flag is set in Super Admin / Settings, this tab just
 * shows what's enabled and, more importantly, *what each one configures
 * in the form*.
 *
 * Each row shows the input chips (Number, Issue Date, Issue State, Issue
 * Country, Has Expiry) that the form builder will render when an admin
 * drops this key number into a form. That makes the contract between the
 * catalog config and the dynamic form fields visible at a glance.
 */

const RELATED_TO_ICON: Record<RelatedToScope, React.ComponentType<{ size?: number; className?: string }>> = {
    Carrier: Building2,
    Asset:   Truck,
    Driver:  User,
};

/** Coloured "Input: X" chip. Matches the chip vocabulary used in Documents tab. */
function InputChip({
    icon: Icon, label, on, tone,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    on: boolean;
    tone: 'blue' | 'amber' | 'purple' | 'indigo' | 'rose';
}) {
    const onStyles: Record<typeof tone, string> = {
        blue:   'bg-blue-50 text-blue-700 border-blue-200',
        amber:  'bg-amber-50 text-amber-700 border-amber-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-200',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        rose:   'bg-rose-50 text-rose-700 border-rose-200',
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

export function ComplianceTab() {
    const [activeGroup, setActiveGroup] = useState<KeyNumberGroup>('Regulatory and Safety Numbers');
    const [query, setQuery] = useState('');
    const [viewingId, setViewingId] = useState<string | null>(null);

    /** Catalog scoped to this form type — only items flagged for hiring. */
    const inHiring = useMemo(() => SEED_KEY_NUMBERS.filter(k => k.usedInHiring), []);
    const viewing = viewingId ? SEED_KEY_NUMBERS.find(k => k.id === viewingId) ?? null : null;

    const counts = useMemo(() => {
        const out = {} as Record<KeyNumberGroup, { total: number; inHiring: number }>;
        for (const g of KEY_NUMBER_GROUPS) out[g] = { total: 0, inHiring: 0 };
        for (const k of SEED_KEY_NUMBERS) {
            out[k.group].total += 1;
            if (k.usedInHiring) out[k.group].inHiring += 1;
        }
        return out;
    }, []);

    const q = query.trim().toLowerCase();
    const rows = inHiring
        .filter(k => k.group === activeGroup)
        .filter(k => !q
            || k.name.toLowerCase().includes(q)
            || k.description.toLowerCase().includes(q));

    return (
        <div className="space-y-4">
            {/* Header card */}
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                            <ShieldCheck size={18} className="text-blue-500" />
                        </span>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Compliance</h2>
                            <p className="mt-0.5 text-[12px] text-slate-500">
                                Key Numbers available in this form type. The form builder reads each row's configuration
                                to render the right inputs (number, dates, state, country) when the item is added to a form.
                            </p>
                        </div>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5">
                        <span className="text-[11px] font-semibold text-slate-700">
                            {inHiring.length}<span className="text-slate-400">/{SEED_KEY_NUMBERS.length}</span>
                        </span>{' '}
                        <span className="text-[11px] text-slate-500">available</span>
                    </div>
                </div>

                <div className="mt-3 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50/50 px-3 py-2">
                    <Info size={13} className="mt-0.5 shrink-0 text-blue-600" />
                    <p className="text-[11px] text-blue-800">
                        Catalog and the <span className="font-semibold">Used in Hiring / Templates / Form</span> flag are managed in{' '}
                        <span className="font-semibold">Super Admin → Compliance and Documents</span>.
                    </p>
                </div>
            </div>

            {/* List */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* Compact filter row — pill group + search + count, all on one line */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/40 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search key numbers…"
                                className="h-9 w-64 rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-white p-1">
                            {KEY_NUMBER_GROUPS.map(g => {
                                const on = activeGroup === g;
                                return (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setActiveGroup(g)}
                                        className={cn(
                                            "rounded px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap",
                                            on
                                                ? "bg-blue-100 text-blue-700"
                                                : "text-slate-600 hover:bg-slate-100",
                                        )}
                                    >
                                        {g}
                                        <span className={cn("ml-1 text-[10px]", on ? "text-blue-500" : "text-slate-400")}>
                                            {counts[g].inHiring}/{counts[g].total}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <span className="text-[12px] text-slate-500">
                        Showing <span className="font-semibold text-slate-800">{rows.length}</span> in {activeGroup}
                    </span>
                </div>

                {rows.length === 0 ? (
                    <div className="px-3 py-12 text-center">
                        <p className="text-sm font-medium text-slate-700">No key numbers in this category</p>
                        <p className="mt-1 text-[12px] text-slate-500">
                            Either none are flagged for hiring, or try a different tab / clear the search.
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {rows.map((k: KeyNumberRow) => {
                            const RIcon = RELATED_TO_ICON[k.relatedTo];
                            const linkedDocName = k.linkedDocumentTypeId
                                ? DOCUMENTS.find(d => d.id === k.linkedDocumentTypeId)?.name
                                : undefined;
                            return (
                                <li key={k.id} className="px-4 py-3 transition-colors hover:bg-blue-50/30">
                                    <div className="flex items-start gap-3">
                                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50">
                                            <KeyRound size={15} className="text-blue-500" />
                                        </span>
                                        <div className="min-w-0 flex-1 pr-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-semibold text-slate-900">{k.name}</p>
                                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                                                    <RIcon size={12} className="text-slate-400" /> {k.relatedTo}
                                                </span>
                                                {linkedDocName && linkedDocName.trim().toLowerCase() !== k.name.trim().toLowerCase() && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-blue-600">
                                                        <Link2 size={11} /> {linkedDocName}
                                                    </span>
                                                )}
                                                <span className={cn(
                                                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                                    k.status === 'Active'
                                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                        : "border-slate-200 bg-slate-100 text-slate-500",
                                                )}>
                                                    {k.status}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-[12px] text-slate-500">{k.description}</p>

                                            {/* Inputs preview — what the form builder will render for this KN */}
                                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                    Form inputs:
                                                </span>
                                                {k.numberRequired && (
                                                    <InputChip icon={KeyRound} label="Number" on tone="blue" />
                                                )}
                                                <InputChip icon={Calendar} label="Issue Date"     on={k.issueDateRequired}    tone="blue" />
                                                <InputChip icon={MapPin}   label="Issue State"    on={k.issueStateRequired}   tone="purple" />
                                                <InputChip icon={Globe2}   label="Issue Country"  on={k.issueCountryRequired} tone="indigo" />
                                                <InputChip icon={Calendar} label="Expiry"         on={k.hasExpiry}            tone="amber" />
                                                {!k.numberRequired && !k.issueDateRequired && !k.issueStateRequired && !k.issueCountryRequired && !k.hasExpiry && (
                                                    <span className="text-[11px] italic text-slate-400">No configured inputs</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Per-row View — opens a modal showing how this KN renders on the form */}
                                        <button
                                            type="button"
                                            onClick={() => setViewingId(k.id)}
                                            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-[12px] font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
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
                <KeyNumberPreviewModal keyNumber={viewing} onClose={() => setViewingId(null)} />
            )}
        </div>
    );
}

/**
 * Preview modal — renders the key number the way it appears on the actual
 * application form. Same input set the form builder generates at runtime:
 * a Number input + the meta inputs (issue date / state / country / expiry)
 * the catalog has enabled.
 */
function KeyNumberPreviewModal({ keyNumber, onClose }: {
    keyNumber: KeyNumberRow;
    onClose: () => void;
}) {
    const linkedDocName = keyNumber.linkedDocumentTypeId
        ? DOCUMENTS.find(d => d.id === keyNumber.linkedDocumentTypeId)?.name
        : undefined;

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
                        <h3 className="mt-0.5 text-base font-bold text-slate-900">{keyNumber.name}</h3>
                        <p className="mt-0.5 text-[12px] text-slate-500">
                            {keyNumber.relatedTo} · {keyNumber.group}
                            {linkedDocName && linkedDocName.trim().toLowerCase() !== keyNumber.name.trim().toLowerCase() && <> · Linked to <span className="font-semibold text-blue-600">{linkedDocName}</span></>}
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
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            {keyNumber.name}{' '}
                            <span className="text-[10px] font-medium text-slate-400">· Compliance number</span>
                        </p>

                        {/* Number input (always rendered if numberRequired) */}
                        {keyNumber.numberRequired && (
                            <KnPreviewField label="Number" placeholder={`Enter ${keyNumber.name}…`} icon={KeyRound} />
                        )}

                        {/* Meta inputs — only the ones the catalog enabled */}
                        {(keyNumber.hasExpiry || keyNumber.issueDateRequired || keyNumber.issueStateRequired || keyNumber.issueCountryRequired) && (
                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {keyNumber.issueDateRequired && (
                                    <KnPreviewField label="Issue date" placeholder="mm / dd / yyyy" icon={Calendar} />
                                )}
                                {keyNumber.hasExpiry && (
                                    <KnPreviewField label="Expiry date" placeholder="mm / dd / yyyy" icon={Calendar} />
                                )}
                                {keyNumber.issueStateRequired && (
                                    <KnPreviewField label="Issue state / province" placeholder="Select state…" icon={MapPin} />
                                )}
                                {keyNumber.issueCountryRequired && (
                                    <KnPreviewField label="Issue country" placeholder="Select country…" icon={Globe2} />
                                )}
                            </div>
                        )}

                        {!keyNumber.numberRequired && !keyNumber.hasExpiry && !keyNumber.issueDateRequired && !keyNumber.issueStateRequired && !keyNumber.issueCountryRequired && (
                            <p className="text-[12px] italic text-slate-400">No inputs configured for this number.</p>
                        )}

                        <p className="mt-3 text-[11px] italic text-slate-400">
                            This is exactly what the applicant sees when this key number is added to a form.
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

function KnPreviewField({ label, placeholder, icon: Icon }: {
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

export default ComplianceTab;
