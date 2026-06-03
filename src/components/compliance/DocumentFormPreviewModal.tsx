import { useState } from 'react';
import { X, Upload, UploadCloud, Calendar, MapPin, Globe2, Pencil, Save } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';

/**
 * "How this looks on a form" — renders the input form (number entry / document
 * upload + the detail fields) exactly as an applicant sees it. When `onSave` is
 * provided it's also EDITABLE: a pencil reveals per-field switches so you can
 * change which fields appear, then Save writes back through onSave.
 */
export interface DocumentFormPreviewProps {
    name: string;
    subtitle?: string;
    expiryRequired?: boolean;
    issueDateRequired?: boolean;
    issueStateRequired?: boolean;
    issueCountryRequired?: boolean;
    allowMultiple?: boolean;
    numberOfSlots?: number;
    slotLabels?: string[];
    /** Key-number form: render a value input at the top (e.g. "USDOT Number"). */
    numberInput?: { label: string };
    /** Whether the upload widget is shown (documents: true; key numbers: only if a doc is required). Defaults to true. */
    showUpload?: boolean;
    /** When provided, the form becomes editable; Save calls this with the new field config. */
    onSave?: (cfg: PreviewFieldConfig) => void;
    onClose: () => void;
}

export interface PreviewFieldConfig {
    expiryRequired: boolean;
    issueDateRequired: boolean;
    issueStateRequired: boolean;
    issueCountryRequired: boolean;
    showUpload: boolean;
    allowMultiple: boolean;
    numberOfSlots?: number;
    slotLabels?: string[];
}

export function DocumentFormPreviewModal({
    name, subtitle, expiryRequired, issueDateRequired, issueStateRequired, issueCountryRequired,
    allowMultiple, numberOfSlots, slotLabels, numberInput, showUpload = true, onSave, onClose,
}: DocumentFormPreviewProps) {
    const isKeyNumber = !!numberInput;
    const initial: PreviewFieldConfig = {
        expiryRequired: !!expiryRequired,
        issueDateRequired: !!issueDateRequired,
        issueStateRequired: !!issueStateRequired,
        issueCountryRequired: !!issueCountryRequired,
        showUpload,
        allowMultiple: !!allowMultiple,
        numberOfSlots,
        slotLabels: slotLabels ?? ['Front', 'Rear'],
    };
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<PreviewFieldConfig>(initial);
    const set = (p: Partial<PreviewFieldConfig>) => setDraft(d => ({ ...d, ...p }));

    // The preview always renders from the (possibly edited) draft.
    const slotMode = draft.numberOfSlots === 2;
    const slots = slotMode
        ? [draft.slotLabels?.[0]?.trim() || 'Front', draft.slotLabels?.[1]?.trim() || 'Rear']
        : [];
    const hasMeta = draft.expiryRequired || draft.issueDateRequired || draft.issueStateRequired || draft.issueCountryRequired;

    const save = () => { onSave?.(draft); setEditing(false); };

    return (
        <div role="dialog" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={onClose}>
            <div className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{editing ? 'Edit form fields' : 'Form preview'}</p>
                        <h3 className="mt-0.5 text-base font-bold text-slate-900">{name}</h3>
                        {subtitle && <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                        {onSave && !editing && (
                            <button type="button" onClick={() => setEditing(true)} title="Edit form fields"
                                className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700">
                                <Pencil size={13} /> Edit
                            </button>
                        )}
                        <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50/40 px-6 py-5 space-y-4">
                    {/* Edit panel — which fields appear on the form */}
                    {editing && (
                        <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-700">Fields on this form</p>
                            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                <EditRow label="Expiry date" checked={draft.expiryRequired} onChange={(v) => set({ expiryRequired: v })} />
                                <EditRow label="Issue date" checked={draft.issueDateRequired} onChange={(v) => set({ issueDateRequired: v })} />
                                <EditRow label="Issue state / province" checked={draft.issueStateRequired} onChange={(v) => set({ issueStateRequired: v })} />
                                <EditRow label="Issue country" checked={draft.issueCountryRequired} onChange={(v) => set({ issueCountryRequired: v })} />
                                {isKeyNumber && (
                                    <EditRow label="Requires a document upload" checked={draft.showUpload} onChange={(v) => set({ showUpload: v })} />
                                )}
                                {!isKeyNumber && (
                                    <EditRow label="Allow multiple uploads" checked={draft.allowMultiple} onChange={(v) => set({ allowMultiple: v, ...(v ? {} : { numberOfSlots: undefined }) })} />
                                )}
                            </div>
                            {!isKeyNumber && draft.allowMultiple && (
                                <div className="mt-2 border-t border-blue-100 pt-2">
                                    <EditRow label="Two labeled slots (e.g. Front / Rear)" checked={draft.numberOfSlots === 2}
                                        onChange={(v) => set({ numberOfSlots: v ? 2 : undefined })} />
                                    {draft.numberOfSlots === 2 && (
                                        <div className="mt-2 grid grid-cols-2 gap-2">
                                            {[0, 1].map(i => (
                                                <input key={i} type="text" value={draft.slotLabels?.[i] ?? ''} placeholder={i === 0 ? 'Front' : 'Rear'}
                                                    onChange={(e) => set({ slotLabels: (() => { const n = [...(draft.slotLabels ?? ['', ''])]; n[i] = e.target.value; return n; })() })}
                                                    className="h-8 w-full rounded-md border border-slate-300 px-2 text-[12px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Live preview (reflects edits) */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            {name} <span className="text-[10px] font-medium text-slate-400">· {numberInput ? 'Number entry' : 'Document upload'}</span>
                        </p>

                        {numberInput && (
                            <div className="mb-3">
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{numberInput.label}</p>
                                <div className="flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-400">Enter number…</div>
                            </div>
                        )}

                        {hasMeta && (
                            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {draft.expiryRequired && <PreviewField label="Expiry date" placeholder="mm / dd / yyyy" icon={Calendar} />}
                                {draft.issueDateRequired && <PreviewField label="Issue date" placeholder="mm / dd / yyyy" icon={Calendar} />}
                                {draft.issueStateRequired && <PreviewField label="Issue state / province" placeholder="Select state…" icon={MapPin} />}
                                {draft.issueCountryRequired && <PreviewField label="Issue country" placeholder="Select country…" icon={Globe2} />}
                            </div>
                        )}

                        {draft.showUpload && (slotMode ? (
                            <div className="grid grid-cols-2 gap-3">
                                {slots.map(slot => (
                                    <div key={slot} className="rounded-md border border-slate-200 p-3">
                                        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">{slot}</div>
                                        <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-blue-300 bg-blue-50/30 px-3 py-4 text-center">
                                            <UploadCloud size={20} className="mb-1 text-slate-300" />
                                            <span className="text-[11px] font-medium text-blue-600">Click to upload</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-500">
                                <Upload size={15} className="text-slate-400" />
                                {draft.allowMultiple ? 'Upload documents (multiple allowed)' : 'Upload document'}
                            </div>
                        ))}

                        <p className="mt-3 text-[11px] italic text-slate-400">
                            This is exactly what the applicant sees when this is added to a form.
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-3">
                    {editing ? (
                        <>
                            <button type="button" onClick={() => { setDraft(initial); setEditing(false); }} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button type="button" onClick={save} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700"><Save className="h-4 w-4" /> Save</button>
                        </>
                    ) : (
                        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Close</button>
                    )}
                </div>
            </div>
        </div>
    );
}

function EditRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5">
            <span className="text-[12px] font-medium text-slate-700">{label}</span>
            <Toggle checked={checked} onCheckedChange={onChange} />
        </label>
    );
}

function PreviewField({ label, placeholder, icon: Icon }: {
    label: string; placeholder: string; icon: React.ComponentType<{ size?: number; className?: string }>;
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
