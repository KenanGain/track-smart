import { useState, useRef, useEffect } from "react";
import {
    Eye, UploadCloud, BadgeCheck, AlertCircle, Clock,
    MessageSquarePlus, KeyRound, FileText, CheckCircle2,
    Calendar, MapPin, Globe, Hash,
    Paperclip, X as XIcon, Save, Shield, Layers,
    Send, Copy, MoreHorizontal, ShieldCheck, Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { requirementSummary, type Requirement, type RequirementStatus } from "./hiring-requirements";
import { loadDocumentTypes, type DocumentType } from "./document-types.data";

// ── Status metadata ──────────────────────────────────────────────────────
const STATUS_META: Record<RequirementStatus, { label: string; cls: string; Icon: React.ElementType }> = {
    missing: { label: 'Missing',  cls: 'border-rose-200 bg-rose-50 text-rose-700',     Icon: AlertCircle },
    uploaded: { label: 'Uploaded', cls: 'border-blue-200 bg-blue-50 text-blue-700',     Icon: UploadCloud },
    verified: { label: 'Verified', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', Icon: BadgeCheck },
    ordered:  { label: 'Ordered',  cls: 'border-amber-200 bg-amber-50 text-amber-700',  Icon: Clock },
    skipped:  { label: 'Skipped',  cls: 'border-slate-200 bg-slate-50 text-slate-400',  Icon: CheckCircle2 },
};

// ── State/Province options ───────────────────────────────────────────────
const STATES_PROVINCES = [
    'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia',
    'Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland',
    'Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey',
    'New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina',
    'South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming',
    'Alberta','British Columbia','Manitoba','New Brunswick','Newfoundland and Labrador','Nova Scotia','Ontario',
    'Prince Edward Island','Quebec','Saskatchewan','Northwest Territories','Nunavut','Yukon',
];
const COUNTRY_OPTIONS = ['United States', 'Canada', 'Mexico', 'Other'];

// ── Tiny action button ──────────────────────────────────────────────────
function ReqBtn({ Icon, label, onClick, tone = 'ghost', small, disabled }: {
    Icon: React.ElementType; label: string; onClick?: () => void;
    tone?: 'ghost' | 'primary' | 'good' | 'danger' | 'warn'; small?: boolean; disabled?: boolean;
}) {
    return (
        <button type="button" onClick={onClick} disabled={disabled}
            className={cn('inline-flex items-center gap-1 rounded-md border font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                small ? 'h-6 px-1.5 text-[10px]' : 'h-7 px-2 text-[11px]',
                tone === 'primary' ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                    : tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : tone === 'danger' ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                            : tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700')}>
            <Icon size={small ? 10 : 12} /> {label}
        </button>
    );
}

// ── Document form fields (rendered from Settings document type) ──────────
interface DocFormValues {
    number: string;
    issueDate: string;
    expiryDate: string;
    issueState: string;
    issueCountry: string;
    files: { name: string; slot?: string }[];
    notes: string;
}

function DocumentInputForm({ docType, values, onChange, onSave, onCancel }: {
    docType: DocumentType | undefined;
    values: DocFormValues;
    onChange: (v: DocFormValues) => void;
    onSave: () => void;
    onCancel: () => void;
}) {
    const patch = (p: Partial<DocFormValues>) => onChange({ ...values, ...p });
    const slots = docType?.numberOfSlots ?? (docType?.allowMultiple ? 3 : 1);
    const slotLabels = docType?.slotLabels ?? [];

    const addFile = (slot?: string) => {
        const name = `${docType?.name ?? 'Document'}_${new Date().toISOString().slice(0, 10)}${slot ? '_' + slot : ''}.pdf`;
        patch({ files: [...values.files, { name, slot }] });
    };
    const removeFile = (i: number) => patch({ files: values.files.filter((_, x) => x !== i) });

    return (
        <div className="rounded-lg border border-blue-200 bg-gradient-to-b from-blue-50/50 to-white p-4 space-y-4">
            {/* Document type badge */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                    <Shield size={11} /> {docType?.category ?? 'Other'}
                </span>
                {docType?.relatedTo && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {docType.relatedTo}
                    </span>
                )}
                {docType?.requirementLevel === 'required' && (
                    <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-600 border border-rose-200">Required</span>
                )}
                {docType?.allowMultiple && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                        <Layers size={10} /> Multiple
                    </span>
                )}
            </div>

            {/* Input fields grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {/* Document Number */}
                <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <Hash size={10} className="inline mr-1" />Document Number
                    </label>
                    <input
                        value={values.number}
                        onChange={e => patch({ number: e.target.value })}
                        placeholder="Enter document number"
                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/20"
                    />
                </div>

                {/* Issue Date */}
                {(docType?.issueDateRequired !== false) && (
                    <div>
                        <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <Calendar size={10} />Issue Date
                            {docType?.issueDateRequired && <span className="text-rose-500">*</span>}
                        </label>
                        <input
                            type="date"
                            value={values.issueDate}
                            onChange={e => patch({ issueDate: e.target.value })}
                            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/20"
                        />
                    </div>
                )}

                {/* Expiry Date */}
                {(docType?.expiryRequired !== false) && (
                    <div>
                        <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <Calendar size={10} />Expiry Date
                            {docType?.expiryRequired && <span className="text-rose-500">*</span>}
                        </label>
                        <input
                            type="date"
                            value={values.expiryDate}
                            onChange={e => patch({ expiryDate: e.target.value })}
                            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/20"
                        />
                    </div>
                )}

                {/* Issue State */}
                {(docType?.issueStateRequired !== false) && (
                    <div>
                        <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <MapPin size={10} />Issue State / Province
                            {docType?.issueStateRequired && <span className="text-rose-500">*</span>}
                        </label>
                        <select
                            value={values.issueState}
                            onChange={e => patch({ issueState: e.target.value })}
                            className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/20"
                        >
                            <option value="">Select state/province…</option>
                            {STATES_PROVINCES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                )}

                {/* Issue Country */}
                {(docType?.issueCountryRequired !== false) && (
                    <div>
                        <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <Globe size={10} />Issue Country
                            {docType?.issueCountryRequired && <span className="text-rose-500">*</span>}
                        </label>
                        <select
                            value={values.issueCountry}
                            onChange={e => patch({ issueCountry: e.target.value })}
                            className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/20"
                        >
                            <option value="">Select country…</option>
                            {COUNTRY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* File upload slots */}
            <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Paperclip size={10} /> Upload files
                    {docType?.allowMultiple && <span className="text-slate-400">({slots} slots)</span>}
                </div>
                <div className="space-y-2">
                    {/* Named slots (e.g. Front / Back) */}
                    {slotLabels.length > 0 ? (
                        slotLabels.map((sl, i) => {
                            const existing = values.files.find(f => f.slot === sl);
                            return (
                                <div key={i} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                                    <span className="text-[11px] font-bold text-slate-600 min-w-[60px]">{sl}</span>
                                    {existing ? (
                                        <>
                                            <Paperclip size={11} className="text-blue-500" />
                                            <span className="flex-1 truncate text-[12px] text-slate-700">{existing.name}</span>
                                            <button type="button" onClick={() => removeFile(values.files.indexOf(existing))}
                                                className="text-slate-400 hover:text-rose-500"><XIcon size={12} /></button>
                                        </>
                                    ) : (
                                        <button type="button" onClick={() => addFile(sl)}
                                            className="inline-flex items-center gap-1 rounded-md border border-dashed border-blue-300 bg-blue-50/50 px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-100">
                                            <UploadCloud size={11} /> Upload {sl}
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <>
                            {values.files.map((f, i) => (
                                <div key={i} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5">
                                    <Paperclip size={11} className="text-blue-500 shrink-0" />
                                    <span className="flex-1 truncate text-[12px] text-slate-700">{f.name}</span>
                                    <button type="button" onClick={() => removeFile(i)}
                                        className="text-slate-400 hover:text-rose-500"><XIcon size={12} /></button>
                                </div>
                            ))}
                            {(docType?.allowMultiple || values.files.length === 0) && values.files.length < slots && (
                                <button type="button" onClick={() => addFile()}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50/50 px-3 py-2 text-[11px] font-semibold text-blue-600 hover:bg-blue-100 w-full justify-center">
                                    <UploadCloud size={12} /> {values.files.length > 0 ? 'Add another file' : 'Choose file to upload'}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Notes */}
            <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Notes</label>
                <textarea
                    value={values.notes}
                    onChange={e => patch({ notes: e.target.value })}
                    placeholder="Optional notes about this document…"
                    rows={2}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/20 resize-none"
                />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={onCancel}
                    className="h-8 px-3 rounded-md border border-slate-300 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    Cancel
                </button>
                <button type="button" onClick={onSave}
                    className="h-8 px-4 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 inline-flex items-center gap-1.5">
                    <Save size={13} /> Save Document
                </button>
            </div>
        </div>
    );
}

// ── Compliance item form ─────────────────────────────────────────────────
function ComplianceInputForm({ label, docType, values, onChange, onSave, onCancel }: {
    label: string;
    docType: DocumentType | undefined;
    values: DocFormValues;
    onChange: (v: DocFormValues) => void;
    onSave: () => void;
    onCancel: () => void;
}) {
    const patch = (p: Partial<DocFormValues>) => onChange({ ...values, ...p });
    const addFile = () => {
        const name = `${label}_${new Date().toISOString().slice(0, 10)}.pdf`;
        patch({ files: [...values.files, { name }] });
    };
    const removeFile = (i: number) => patch({ files: values.files.filter((_, x) => x !== i) });

    return (
        <div className="rounded-lg border border-amber-200 bg-gradient-to-b from-amber-50/50 to-white p-4 space-y-4">
            {/* Compliance badge */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                    <KeyRound size={11} /> Key Number
                </span>
                {docType && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        <FileText size={10} /> Linked: {docType.name}
                    </span>
                )}
            </div>

            {/* Key Number input */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                    <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <Hash size={10} /> {label} Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                        value={values.number}
                        onChange={e => patch({ number: e.target.value })}
                        placeholder={`Enter ${label.toLowerCase()} number`}
                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-mono focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
                    />
                </div>

                <div>
                    <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <Calendar size={10} /> Issue Date
                        {docType?.issueDateRequired && <span className="text-rose-500">*</span>}
                    </label>
                    <input type="date" value={values.issueDate} onChange={e => patch({ issueDate: e.target.value })}
                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-amber-400 focus:outline-none" />
                </div>

                <div>
                    <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <Calendar size={10} /> Expiry Date
                        {docType?.expiryRequired && <span className="text-rose-500">*</span>}
                    </label>
                    <input type="date" value={values.expiryDate} onChange={e => patch({ expiryDate: e.target.value })}
                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-amber-400 focus:outline-none" />
                </div>

                {docType?.issueStateRequired && (
                    <div>
                        <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <MapPin size={10} /> Issue State <span className="text-rose-500">*</span>
                        </label>
                        <select value={values.issueState} onChange={e => patch({ issueState: e.target.value })}
                            className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-amber-400 focus:outline-none">
                            <option value="">Select…</option>
                            {STATES_PROVINCES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                )}

                {docType?.issueCountryRequired && (
                    <div>
                        <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <Globe size={10} /> Issue Country <span className="text-rose-500">*</span>
                        </label>
                        <select value={values.issueCountry} onChange={e => patch({ issueCountry: e.target.value })}
                            className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-amber-400 focus:outline-none">
                            <option value="">Select…</option>
                            {COUNTRY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* Document upload */}
            <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Paperclip size={10} /> Supporting document
                </div>
                {values.files.map((f, i) => (
                    <div key={i} className="mb-1.5 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5">
                        <Paperclip size={11} className="text-amber-500 shrink-0" />
                        <span className="flex-1 truncate text-[12px] text-slate-700">{f.name}</span>
                        <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-rose-500">
                            <XIcon size={12} />
                        </button>
                    </div>
                ))}
                {values.files.length === 0 && (
                    <button type="button" onClick={addFile}
                        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-amber-300 bg-amber-50/50 px-3 py-2 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 w-full justify-center">
                        <UploadCloud size={12} /> Upload supporting document
                    </button>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={onCancel}
                    className="h-8 px-3 rounded-md border border-slate-300 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={onSave}
                    className="h-8 px-4 rounded-md bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 inline-flex items-center gap-1.5">
                    <Save size={13} /> Save
                </button>
            </div>
        </div>
    );
}

// ── Read-only field shown in the View panel ──────────────────────────────
function ViewField({ label, value, mono, expiry }: { label: string; value?: string; mono?: boolean; expiry?: boolean }) {
    const expired = expiry && value ? new Date(value) < new Date('2026-06-08') : false;
    return (
        <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
            <div className={cn('truncate text-[13px] font-semibold', mono && 'font-mono',
                expired ? 'text-rose-600' : value ? 'text-slate-800' : 'text-slate-400')}>
                {value || '—'}{expired && <span className="ml-1.5 text-[9px] font-bold uppercase">Expired</span>}
            </div>
        </div>
    );
}

// ── Overflow "⋯" menu for secondary row actions ──────────────────────────
interface ReqMenuItem { Icon: React.ElementType; label: string; onClick?: () => void; danger?: boolean }
function ReqMenu({ items }: { items: ReqMenuItem[] }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);
    if (items.length === 0) return null;
    return (
        <div className="relative" ref={ref}>
            <button type="button" onClick={() => setOpen(o => !o)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-300 hover:text-blue-700"
                title="More actions">
                <MoreHorizontal size={14} />
            </button>
            {open && (
                <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    {items.map((it, i) => (
                        <button key={i} type="button" onClick={() => { setOpen(false); it.onClick?.(); }}
                            className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] font-semibold transition-colors',
                                it.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50')}>
                            <it.Icon size={13} className={it.danger ? 'text-rose-500' : 'text-slate-400'} /> {it.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main requirement row ─────────────────────────────────────────────────
function RequirementRow({ r, onUpload, onOrder, onVerify, onUnverify, onAskVerify, onSend }: {
    r: Requirement;
    onUpload: (r: Requirement) => void;
    onOrder?: (r: Requirement) => void;
    onVerify?: (r: Requirement) => void;
    onUnverify?: (r: Requirement) => void;
    onAskVerify?: (r: Requirement) => void;
    onSend?: (r: Requirement) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [viewing, setViewing] = useState(false);
    const [formValues, setFormValues] = useState<DocFormValues>({
        number: r.meta.number ?? '',
        issueDate: r.meta.issue ?? '',
        expiryDate: r.meta.expiry ?? '',
        issueState: r.meta.state ?? '',
        issueCountry: r.meta.country ?? '',
        files: r.files.map(f => ({ name: f.name })),
        notes: '',
    });

    // Resolve the matching document type from Settings
    const allDocTypes = loadDocumentTypes();
    const docType = allDocTypes.find(dt =>
        r.label.toLowerCase().includes(dt.name.toLowerCase()) ||
        dt.name.toLowerCase().includes(r.label.toLowerCase()) ||
        dt.id === (r as any).documentTypeId
    );

    const sm = STATUS_META[r.status] ?? STATUS_META.missing;
    const metaBits = [
        r.meta.number && `No. ${r.meta.number}`,
        r.meta.issue && `Issued ${r.meta.issue}`,
        r.meta.expiry && `Exp ${r.meta.expiry}`,
        r.meta.state, r.meta.country,
    ].filter(Boolean);
    const has = r.files.length > 0 || r.status === 'uploaded' || r.status === 'verified';
    const isSkipped = r.status === 'skipped';

    // Which captured fields to show is driven by the document type's Settings
    // config (the same flags the upload form respects). With no resolved type,
    // fall back to showing whatever value was actually captured.
    const showIssue   = docType ? docType.issueDateRequired    !== false : !!r.meta.issue;
    const showExpiry  = docType ? docType.expiryRequired       !== false : !!r.meta.expiry;
    const showState   = docType ? docType.issueStateRequired   !== false : !!r.meta.state;
    const showCountry = docType ? docType.issueCountryRequired !== false : !!r.meta.country;

    const handleSave = () => { onUpload(r); setExpanded(false); };

    return (
        <li className={cn('transition-all', expanded && 'bg-slate-50/30', isSkipped && 'opacity-60')}>
            {/* Main row */}
            <div className={cn('flex flex-wrap items-center gap-3 px-5 py-3', isSkipped && 'bg-slate-50/40')}>
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    isSkipped ? 'bg-slate-100 text-slate-400'
                        : r.kind === 'compliance' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600')}>
                    {r.kind === 'compliance' ? <KeyRound size={15} /> : <FileText size={15} />}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('text-[13px] font-bold text-slate-800', isSkipped && 'line-through text-slate-400')}>{r.label}</span>
                        {r.required && !isSkipped && <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-600">Required</span>}
                    </div>
                    <p className="text-[11px] text-slate-500">
                        {isSkipped ? <span className="text-amber-600">Skipped by hiring manager</span>
                            : metaBits.length ? metaBits.join(' · ') : r.source}
                        {!isSkipped && r.files.length > 0 && <span className="text-slate-400"> · {r.files.length} file{r.files.length === 1 ? '' : 's'}</span>}
                    </p>
                </div>
                <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', sm.cls)}>
                    <sm.Icon size={11} /> {sm.label}
                </span>
                {!isSkipped && (
                    <div className="flex shrink-0 items-center gap-1.5">
                        {r.status === 'verified' ? (
                            <>
                                <ReqBtn Icon={Eye} label="View" onClick={() => setViewing(v => !v)} />
                                {onUnverify && <ReqBtn Icon={Undo2} label="Unverify" tone="warn" onClick={() => onUnverify(r)} />}
                                {onSend && <ReqBtn Icon={Send} label="Send" onClick={() => onSend(r)} />}
                                <ReqMenu items={[
                                    { Icon: Copy, label: 'Replace', onClick: () => setExpanded(true) },
                                    ...(onAskVerify ? [{ Icon: ShieldCheck, label: 'Ask for verification', onClick: () => onAskVerify(r) }] : []),
                                    ...(onOrder ? [{ Icon: MessageSquarePlus, label: 'Ask / Order', onClick: () => onOrder(r) }] : []),
                                ]} />
                            </>
                        ) : has ? (
                            <>
                                <ReqBtn Icon={Eye} label="View" onClick={() => setViewing(v => !v)} />
                                {onVerify && <ReqBtn Icon={BadgeCheck} label="Verify" tone="good" onClick={() => onVerify(r)} />}
                                <ReqMenu items={[
                                    { Icon: Copy, label: 'Replace', onClick: () => setExpanded(true) },
                                    ...(onSend ? [{ Icon: Send, label: 'Send', onClick: () => onSend(r) }] : []),
                                    ...(onAskVerify ? [{ Icon: ShieldCheck, label: 'Ask for verification', onClick: () => onAskVerify(r) }] : []),
                                    ...(onOrder ? [{ Icon: MessageSquarePlus, label: 'Ask / Order', onClick: () => onOrder(r) }] : []),
                                ]} />
                            </>
                        ) : (
                            <>
                                <ReqBtn Icon={UploadCloud} label="Upload" tone="primary" onClick={() => setExpanded(!expanded)} />
                                {onOrder && <ReqBtn Icon={MessageSquarePlus} label="Ask / Order" onClick={() => onOrder(r)} />}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Read-only View panel — the captured document/key-number data */}
            {viewing && has && !expanded && (
                <div className="px-5 pb-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                        <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                            <Eye size={13} className="text-blue-500" /> {r.kind === 'compliance' ? 'Key number details' : 'Document details'}
                            <span className={cn('ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold normal-case', sm.cls)}>
                                <sm.Icon size={10} /> {sm.label}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-4">
                            {r.kind === 'compliance' && <ViewField label="Number" value={r.meta.number} mono />}
                            {showIssue && <ViewField label="Issue date" value={r.meta.issue} mono />}
                            {showExpiry && <ViewField label="Expiry date" value={r.meta.expiry} mono expiry />}
                            {showState && <ViewField label="Issuing state" value={r.meta.state} />}
                            {showCountry && <ViewField label="Issuing country" value={r.meta.country} />}
                        </div>
                        {docType && (
                            <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                                <Shield size={9} /> Fields defined by the “{docType.name}” document type in Settings.
                            </p>
                        )}
                        {/* Files */}
                        <div className="mt-3 border-t border-slate-200 pt-3">
                            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Files {r.files.length > 0 && `· ${r.files.length}`}
                            </div>
                            {r.files.length === 0 ? (
                                <p className="text-[12px] text-slate-400">No file uploaded — only data captured.</p>
                            ) : (
                                <ul className="space-y-1.5">
                                    {r.files.map((f, i) => (
                                        <li key={i} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5">
                                            <FileText size={13} className="shrink-0 text-blue-500" />
                                            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-slate-700">{f.name}</span>
                                            {f.uploadedAt && <span className="shrink-0 text-[10px] text-slate-400">{f.uploadedAt}</span>}
                                            <div className="flex shrink-0 items-center gap-1">
                                                <ReqBtn Icon={Eye} label="Open" small />
                                                <ReqBtn Icon={Save} label="Download" small />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="mt-3 flex items-center justify-end gap-2">
                            <button type="button" onClick={() => { setViewing(false); setExpanded(true); }}
                                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                                <Copy size={12} /> Replace
                            </button>
                            <button type="button" onClick={() => setViewing(false)}
                                className="h-8 rounded-md border border-slate-300 bg-white px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Expanded form */}
            {expanded && !isSkipped && (
                <div className="px-5 pb-4">
                    {r.kind === 'compliance' ? (
                        <ComplianceInputForm
                            label={r.label}
                            docType={docType}
                            values={formValues}
                            onChange={setFormValues}
                            onSave={handleSave}
                            onCancel={() => setExpanded(false)}
                        />
                    ) : (
                        <DocumentInputForm
                            docType={docType}
                            values={formValues}
                            onChange={setFormValues}
                            onSave={handleSave}
                            onCancel={() => setExpanded(false)}
                        />
                    )}
                </div>
            )}
        </li>
    );
}

/**
 * The single Document + Compliance requirement list, used across Application
 * Tracking / Hiring ATS / DQ. Each row = one requirement with live status and
 * Upload / View / Download / Order / Verify actions, plus an expandable inline
 * form that renders the document type's Settings-defined fields.
 */
export function RequirementList({ requirements, onUpload, onOrder, onVerify, onUnverify, onAskVerify, onSend, title = 'Documents & Compliance' }: {
    requirements: Requirement[];
    onUpload: (r: Requirement) => void;
    onOrder?: (r: Requirement) => void;
    onVerify?: (r: Requirement) => void;
    /** Revert a verified item back to uploaded. */
    onUnverify?: (r: Requirement) => void;
    /** Request verification of an already-uploaded item (e.g. from the employer). */
    onAskVerify?: (r: Requirement) => void;
    /** Send / share the document. */
    onSend?: (r: Requirement) => void;
    /** Accepted for backwards-compat with existing callers; no longer rendered. */
    onSkip?: (r: Requirement, reason: string) => void;
    onDelete?: (r: Requirement) => void;
    title?: string;
}) {
    const [filterKind, setFilterKind] = useState<'all' | 'document' | 'compliance'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | RequirementStatus>('all');
    const sum = requirementSummary(requirements);

    const filtered = requirements.filter(r => {
        if (filterKind !== 'all' && r.kind !== filterKind) return false;
        if (filterStatus !== 'all' && r.status !== filterStatus) return false;
        return true;
    });

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Header + progress */}
            <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                        <p className="text-[11px] text-slate-500">
                            Documents and compliance items the driver must provide. Expand any row to fill in the Settings-defined fields.
                        </p>
                    </div>
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold',
                        sum.missing === 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700')}>
                        {sum.missing === 0 ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />} {sum.fulfilled}/{sum.total} fulfilled
                    </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={cn('h-full rounded-full transition-all', sum.missing === 0 ? 'bg-emerald-500' : 'bg-blue-500')} style={{ width: `${sum.pct}%` }} />
                </div>
                {/* Filter row */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
                        {(['all', 'document', 'compliance'] as const).map(k => (
                            <button key={k} type="button" onClick={() => setFilterKind(k)}
                                className={cn('rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors',
                                    filterKind === k ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                                {k === 'all' ? 'All' : k === 'document' ? 'Documents' : 'Compliance'}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
                        {(['all', 'missing', 'uploaded', 'verified', 'ordered', 'skipped'] as const).map(s => (
                            <button key={s} type="button" onClick={() => setFilterStatus(s)}
                                className={cn('rounded-md px-2 py-1 text-[11px] font-semibold transition-colors',
                                    filterStatus === s ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                                {s === 'all' ? 'All' : STATUS_META[s].label}
                            </button>
                        ))}
                    </div>
                    <span className="ml-auto text-[10px] text-slate-400 tabular-nums">{filtered.length} of {requirements.length}</span>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-400">
                    {requirements.length === 0
                        ? 'No document or compliance requirements for this application yet.'
                        : 'No items match the current filters.'}
                </div>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {filtered.map(r => (
                        <RequirementRow
                            key={r.id}
                            r={r}
                            onUpload={onUpload}
                            onOrder={onOrder}
                            onVerify={onVerify}
                            onUnverify={onUnverify}
                            onAskVerify={onAskVerify}
                            onSend={onSend}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}
