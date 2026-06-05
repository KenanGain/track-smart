import { useState } from 'react';
import { X, Upload, UploadCloud, Calendar, MapPin, Globe2, Pencil, Save, ArrowUp, ArrowDown, GripVertical, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toggle } from '@/components/ui/toggle';

/**
 * "How this looks on a form" — renders the input form (number entry / document
 * upload + the detail fields) exactly as an applicant sees it. When `onSave` is
 * provided it's also EDITABLE: a pencil reveals per-field switches AND a
 * field-layout list where each field can be:
 *   • reordered (drag-and-drop or the up/down arrows — e.g. upload before number)
 *   • set Full-width or Half-width (two consecutive halves sit side by side)
 * then Save writes the layout back through onSave.
 */

export type PreviewFieldKey = 'number' | 'upload' | 'expiry' | 'issueDate' | 'issueState' | 'issueCountry';
const DEFAULT_ORDER: PreviewFieldKey[] = ['number', 'expiry', 'issueDate', 'issueState', 'issueCountry', 'upload'];
const DEFAULT_WIDTH: Record<PreviewFieldKey, 'full' | 'half'> = {
    number: 'full', upload: 'full', expiry: 'half', issueDate: 'half', issueState: 'half', issueCountry: 'half',
};

export interface DocumentFormPreviewProps {
    name: string;
    subtitle?: string;
    expiryRequired?: boolean;
    issueDateRequired?: boolean;
    issueStateRequired?: boolean;
    issueCountryRequired?: boolean;
    allowMultiple?: boolean;
    /** When repeating a linked compliance item: 'all' = number+date+doc each time, 'document' = one number+date, repeat upload only. */
    repeatScope?: 'all' | 'document';
    /** Allow capturing previous/historical copies of this document. */
    allowHistorical?: boolean;
    numberOfSlots?: number;
    slotLabels?: string[];
    /** Linked to a Key Number (compliance) — enables the repeat-scope choice on the document side too. */
    linked?: boolean;
    /** Key-number form: render a value input (e.g. "USDOT Number"). */
    numberInput?: { label: string };
    /** Whether the upload widget is shown (documents: true; key numbers: only if a doc is required). Defaults to true. */
    showUpload?: boolean;
    /** Persisted order of the fields on the form. Missing keys fall back to the default order. */
    fieldOrder?: string[];
    /** Persisted per-field width (full / half). Missing keys fall back to defaults. */
    fieldWidths?: Record<string, string>;
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
    repeatScope?: 'all' | 'document';
    allowHistorical: boolean;
    numberOfSlots?: number;
    slotLabels?: string[];
    /** Full canonical order of every field key (active or not). */
    fieldOrder: PreviewFieldKey[];
    /** Per-field width. */
    fieldWidths: Record<PreviewFieldKey, 'full' | 'half'>;
}

/** Normalize an incoming order into a full list containing every key exactly once. */
function normalizeOrder(order?: string[]): PreviewFieldKey[] {
    const valid = (order ?? []).filter((k): k is PreviewFieldKey => DEFAULT_ORDER.includes(k as PreviewFieldKey));
    const seen = new Set(valid);
    return [...valid, ...DEFAULT_ORDER.filter(k => !seen.has(k))];
}
function normalizeWidths(widths?: Record<string, string>): Record<PreviewFieldKey, 'full' | 'half'> {
    const out = { ...DEFAULT_WIDTH };
    for (const k of DEFAULT_ORDER) {
        const v = widths?.[k];
        if (v === 'full' || v === 'half') out[k] = v;
    }
    return out;
}

/** Group consecutive half-width fields into side-by-side rows; full fields stand alone. */
function chunkRows(keys: PreviewFieldKey[], widthOf: (k: PreviewFieldKey) => 'full' | 'half'): PreviewFieldKey[][] {
    const rows: PreviewFieldKey[][] = [];
    let i = 0;
    while (i < keys.length) {
        const k = keys[i];
        if (widthOf(k) === 'half' && i + 1 < keys.length && widthOf(keys[i + 1]) === 'half') {
            rows.push([k, keys[i + 1]]);
            i += 2;
        } else {
            rows.push([k]);
            i += 1;
        }
    }
    return rows;
}

export function DocumentFormPreviewModal({
    name, subtitle, expiryRequired, issueDateRequired, issueStateRequired, issueCountryRequired,
    allowMultiple, repeatScope, allowHistorical, numberOfSlots, slotLabels, linked, numberInput, showUpload = true, fieldOrder, fieldWidths, onSave, onClose,
}: DocumentFormPreviewProps) {
    const isKeyNumber = !!numberInput;
    // The repeat-scope choice (all vs document-only) is meaningful when there's a number — i.e. a key-number form or a linked document.
    const compliance = isKeyNumber || !!linked;
    const initial: PreviewFieldConfig = {
        expiryRequired: !!expiryRequired,
        issueDateRequired: !!issueDateRequired,
        issueStateRequired: !!issueStateRequired,
        issueCountryRequired: !!issueCountryRequired,
        showUpload,
        allowMultiple: !!allowMultiple,
        repeatScope: repeatScope ?? 'all',
        allowHistorical: !!allowHistorical,
        numberOfSlots,
        slotLabels: slotLabels ?? ['Front', 'Rear'],
        fieldOrder: normalizeOrder(fieldOrder),
        fieldWidths: normalizeWidths(fieldWidths),
    };
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<PreviewFieldConfig>(initial);
    const [dragKey, setDragKey] = useState<PreviewFieldKey | null>(null);
    const set = (p: Partial<PreviewFieldConfig>) => setDraft(d => ({ ...d, ...p }));
    // Live preview interactions — clicking the add buttons actually adds/removes blocks
    // so the preview behaves like the real form.
    const [uploadSets, setUploadSets] = useState(1);
    const [historyCount, setHistoryCount] = useState(0);

    // Upload mode is derived from allowMultiple + numberOfSlots:
    //   single    → one file
    //   slots (N) → N fixed labeled blocks (N >= 2, e.g. Front / Rear / …)
    //   unlimited → many files, no fixed count
    const slotCount = draft.numberOfSlots && draft.numberOfSlots >= 2 ? draft.numberOfSlots : 0;
    const slotMode = slotCount > 0;
    const defaultSlotLabel = (i: number) => i === 0 ? 'Front' : i === 1 ? 'Back' : `Slot ${i + 1}`;
    const slots = slotMode
        ? Array.from({ length: slotCount }, (_, i) => draft.slotLabels?.[i]?.trim() || defaultSlotLabel(i))
        : [];
    // Mode is independent of "allow multiple": in slots mode, allowMultiple means
    // the labeled set (e.g. Front/Back) can REPEAT.
    const uploadMode: 'single' | 'slots' | 'unlimited' =
        slotMode ? 'slots' : draft.allowMultiple ? 'unlimited' : 'single';
    const setUploadMode = (mode: 'single' | 'slots' | 'unlimited') => {
        if (mode === 'single') set({ allowMultiple: false, numberOfSlots: undefined });
        else if (mode === 'unlimited') set({ allowMultiple: true, numberOfSlots: undefined });
        else set({ numberOfSlots: Math.max(2, draft.numberOfSlots ?? 2) }); // keep allowMultiple as-is
    };
    const setSlotCount = (n: number) => {
        const count = Math.max(2, Math.min(8, n || 2));
        const labels = Array.from({ length: count }, (_, i) => draft.slotLabels?.[i] ?? '');
        set({ numberOfSlots: count, slotLabels: labels });
    };

    // Compliance item repeating the WHOLE record (number + dates + upload) each time:
    // the number + date fields belong INSIDE each upload record, not as standalone rows.
    const repeatWhole = compliance && draft.allowMultiple && (draft.repeatScope ?? 'all') === 'all';

    const isActive = (k: PreviewFieldKey): boolean => {
        switch (k) {
            // When the whole record repeats, number + dates render inside each upload entry.
            case 'number': return isKeyNumber && !repeatWhole;
            case 'upload': return draft.showUpload;
            case 'expiry': return draft.expiryRequired && !repeatWhole;
            case 'issueDate': return draft.issueDateRequired && !repeatWhole;
            case 'issueState': return draft.issueStateRequired && !repeatWhole;
            case 'issueCountry': return draft.issueCountryRequired && !repeatWhole;
        }
    };
    const activeKeys = draft.fieldOrder.filter(isActive);
    const widthOf = (k: PreviewFieldKey): 'full' | 'half' => draft.fieldWidths[k] ?? DEFAULT_WIDTH[k];

    // Mock inputs reused inside each repeated / historical record so every copy
    // carries its own number + the required dates (not just the upload).
    const mockInput = (label: string, ph: string) => (
        <>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <div className="flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-400">{ph}</div>
        </>
    );
    const dateMockFields = (): { label: string; ph: string }[] => {
        const out: { label: string; ph: string }[] = [];
        if (draft.issueDateRequired) out.push({ label: 'Issue date', ph: 'mm / dd / yyyy' });
        if (draft.expiryRequired) out.push({ label: 'Expiry date', ph: 'mm / dd / yyyy' });
        if (draft.issueStateRequired) out.push({ label: 'Issue state / province', ph: 'Select state…' });
        if (draft.issueCountryRequired) out.push({ label: 'Issue country', ph: 'Select country…' });
        return out;
    };
    const numberMock = () => isKeyNumber ? <div>{mockInput(numberInput!.label, 'Enter number…')}</div> : null;
    const datesMock = () => {
        const dates = dateMockFields();
        if (!dates.length) return null;
        return <div className="grid grid-cols-2 gap-2">{dates.map((d, i) => <div key={i}>{mockInput(d.label, d.ph)}</div>)}</div>;
    };

    const FIELD_LABEL: Record<PreviewFieldKey, string> = {
        number: numberInput?.label ?? 'Number',
        upload: 'Document upload',
        expiry: 'Expiry date',
        issueDate: 'Issue date',
        issueState: 'Issue state / province',
        issueCountry: 'Issue country',
    };
    const FIELD_ICON: Record<PreviewFieldKey, React.ComponentType<{ size?: number; className?: string }>> = {
        number: KeyRound, upload: Upload, expiry: Calendar, issueDate: Calendar, issueState: MapPin, issueCountry: Globe2,
    };

    const moveField = (key: PreviewFieldKey, dir: -1 | 1) => {
        const i = activeKeys.indexOf(key);
        const j = i + dir;
        if (j < 0 || j >= activeKeys.length) return;
        reorder(key, activeKeys[j]);
    };
    /** Move `fromKey` to sit immediately before `toKey` in the canonical order. */
    const reorder = (fromKey: PreviewFieldKey, toKey: PreviewFieldKey) => {
        if (fromKey === toKey) return;
        const order = draft.fieldOrder.filter(k => k !== fromKey);
        const idx = order.indexOf(toKey);
        order.splice(idx, 0, fromKey);
        set({ fieldOrder: order });
    };
    const setWidth = (key: PreviewFieldKey, w: 'full' | 'half') =>
        set({ fieldWidths: { ...draft.fieldWidths, [key]: w } });

    const save = () => { onSave?.(draft); setEditing(false); };

    const renderFieldInner = (k: PreviewFieldKey) => {
        if (k === 'number') {
            return (
                <>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{numberInput?.label}</p>
                    <div className="flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-400">Enter number…</div>
                </>
            );
        }
        if (k === 'upload') {
            // When repeating the WHOLE item (number + date + doc), label the repeat accordingly.
            const repeatWhole = compliance && draft.allowMultiple && (draft.repeatScope ?? 'all') === 'all';
            const sets = draft.allowMultiple ? uploadSets : 1;
            const hist = draft.allowHistorical ? historyCount : 0;
            // Historical / previous-documents — clickable add/remove.
            const histPreview = draft.allowHistorical ? (
                <div className="mt-2 rounded-md border border-amber-200 bg-amber-50/40 p-2.5">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">Previous / historical documents</p>
                    <div className="space-y-2">
                        {Array.from({ length: hist }).map((_, i) => (
                            <div key={i} className="flex flex-col gap-2 rounded-md border border-amber-200 bg-white p-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Previous #{i + 1}</span>
                                    <button type="button" onClick={() => setHistoryCount(c => Math.max(0, c - 1))} className="text-rose-500 hover:text-rose-700" title="Remove"><X size={12} /></button>
                                </div>
                                {numberMock()}
                                <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-amber-300 bg-amber-50/30 px-3 py-3 text-center">
                                    <UploadCloud size={16} className="mb-1 text-amber-300" />
                                    <span className="text-[11px] font-medium text-amber-700">Click to upload</span>
                                </div>
                                {datesMock()}
                            </div>
                        ))}
                        <button type="button" onClick={() => setHistoryCount(c => c + 1)}
                            className="inline-flex items-center gap-1 rounded-md border border-dashed border-amber-300 bg-amber-50/60 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100/60">
                            + Add historical document
                        </button>
                    </div>
                </div>
            ) : null;
            const addBtn = draft.allowMultiple ? (
                <button type="button" onClick={() => setUploadSets(s => s + 1)}
                    className="inline-flex items-center gap-1 self-start rounded-md border border-dashed border-blue-300 bg-blue-50/40 px-3 py-1.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-100/50">
                    + Add another {repeatWhole ? (numberInput?.label ?? 'record') : slotMode ? `${slots[0]}/${slots[1] ?? 'set'}` : 'document'}
                </button>
            ) : null;
            return (
                <div className="flex flex-col gap-2">
                    {Array.from({ length: sets }).map((_, s) => (
                        <div key={s} className={cn('flex flex-col gap-2 rounded-md', slotMode || sets > 1 || repeatWhole ? 'border border-slate-200 p-3' : '')}>
                            {(sets > 1 || repeatWhole) && (
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{numberInput?.label ?? (slotMode ? 'Set' : 'Document')} {s + 1}</span>
                                    {sets > 1 && <button type="button" onClick={() => setUploadSets(n => Math.max(1, n - 1))} className="text-rose-500 hover:text-rose-700" title="Remove"><X size={13} /></button>}
                                </div>
                            )}
                            {repeatWhole && numberMock()}
                            {slotMode ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {slots.map(slot => (
                                        <div key={slot} className="rounded-md border border-slate-200 bg-slate-50/40 p-3">
                                            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">{slot}</div>
                                            <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-blue-300 bg-blue-50/30 px-3 py-4 text-center">
                                                <UploadCloud size={20} className="mb-1 text-slate-300" />
                                                <span className="text-[11px] font-medium text-blue-600">Click to upload</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-blue-300 bg-blue-50/30 px-4 py-4 text-center">
                                    <UploadCloud size={22} className="mb-1.5 text-slate-300" />
                                    <div className="flex items-center gap-2">
                                        <span className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[12px] text-slate-700">Choose File{draft.allowMultiple ? 's' : ''}</span>
                                        <span className="text-[12px] text-slate-400">{draft.allowMultiple ? 'No files chosen' : 'No file chosen'}</span>
                                    </div>
                                    <span className="mt-1.5 text-[11px] font-medium text-blue-600">Or drag it here.</span>
                                </div>
                            )}
                            {repeatWhole && datesMock()}
                        </div>
                    ))}
                    {addBtn}
                    {histPreview}
                </div>
            );
        }
        const metaPlaceholder: Record<'expiry' | 'issueDate' | 'issueState' | 'issueCountry', string> = {
            expiry: 'mm / dd / yyyy', issueDate: 'mm / dd / yyyy', issueState: 'Select state…', issueCountry: 'Select country…',
        };
        const Icon = FIELD_ICON[k];
        return (
            <>
                <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    <Icon size={11} /> {FIELD_LABEL[k]}
                </p>
                <div className="flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-400">
                    {metaPlaceholder[k as 'expiry' | 'issueDate' | 'issueState' | 'issueCountry']}
                </div>
            </>
        );
    };

    const rows = chunkRows(activeKeys, widthOf);

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
                    {/* Edit panel — which fields appear */}
                    {editing && (
                        <div className="space-y-3">
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
                                </div>

                                {/* Uploads — how many files: one, two (labeled), N labeled, or unlimited. */}
                                {(!isKeyNumber || draft.showUpload) && (
                                    <div className="mt-2 border-t border-blue-100 pt-2">
                                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">Uploads</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {([
                                                { id: 'single', label: 'Single file' },
                                                { id: 'slots', label: 'Labeled slots' },
                                                { id: 'unlimited', label: 'Unlimited' },
                                            ] as const).map(opt => (
                                                <button key={opt.id} type="button" onClick={() => setUploadMode(opt.id)}
                                                    className={cn('rounded-md border px-3 py-1.5 text-[12px] font-semibold',
                                                        uploadMode === opt.id ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                        {uploadMode === 'slots' && (
                                            <div className="mt-2 space-y-2">
                                                <label className="flex items-center gap-2 text-[12px] font-medium text-slate-600">
                                                    Number of slots
                                                    <input type="number" min={2} max={8} value={draft.numberOfSlots ?? 2}
                                                        onChange={(e) => setSlotCount(parseInt(e.target.value, 10))}
                                                        className="h-8 w-16 rounded-md border border-slate-300 px-2 text-[12px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                                </label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {Array.from({ length: slotCount }).map((_, i) => (
                                                        <input key={i} type="text" value={draft.slotLabels?.[i] ?? ''} placeholder={defaultSlotLabel(i)}
                                                            onChange={(e) => set({ slotLabels: (() => { const n = [...(draft.slotLabels ?? [])]; while (n.length < slotCount) n.push(''); n[i] = e.target.value; return n; })() })}
                                                            className="h-8 w-full rounded-md border border-slate-300 px-2 text-[12px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                                    ))}
                                                </div>
                                                <label className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5">
                                                    <span className="text-[12px] font-medium text-slate-700">Allow multiple sets <span className="text-slate-400">(e.g. more than one {slots[0] || 'Front'}/{slots[1] || 'Back'})</span></span>
                                                    <Toggle checked={!!draft.allowMultiple} onCheckedChange={(v) => set({ allowMultiple: v })} />
                                                </label>
                                            </div>
                                        )}

                                        {/* Repeat scope — only meaningful for a compliance item (has a number) when multiple is on. */}
                                        {compliance && draft.allowMultiple && (
                                            <div className="mt-2 flex flex-col gap-1.5">
                                                <p className="text-[11px] font-semibold text-slate-600">When the applicant adds another, repeat…</p>
                                                <div className="flex gap-1.5">
                                                    {([
                                                        { id: 'all', label: 'All data', sub: 'number + date + document' },
                                                        { id: 'document', label: 'Document only', sub: 'one number + date' },
                                                    ] as const).map(opt => (
                                                        <button key={opt.id} type="button" onClick={() => set({ repeatScope: opt.id })}
                                                            className={cn('flex-1 rounded-md border px-3 py-1.5 text-left',
                                                                (draft.repeatScope ?? 'all') === opt.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:bg-slate-50')}>
                                                            <span className="block text-[12px] font-semibold text-slate-700">{opt.label}</span>
                                                            <span className="block text-[11px] text-slate-500">{opt.sub}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Historical / previous documents. */}
                                        <label className="mt-2 flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50/40 px-3 py-1.5">
                                            <span className="text-[12px] font-medium text-slate-700">Allow historical / previous documents <span className="text-slate-400">(past copies, each with its own number + date)</span></span>
                                            <Toggle checked={!!draft.allowHistorical} onCheckedChange={(v) => set({ allowHistorical: v })} />
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* Field layout — drag to reorder, set Full / Half width (two halves sit side by side). */}
                            <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4">
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">Field layout</p>
                                <p className="mb-2 text-[11px] text-slate-500">Drag to reorder · set <span className="font-semibold">Half</span> on two neighbours to place them side by side.</p>
                                <ul className="space-y-1.5">
                                    {activeKeys.map((k, idx) => {
                                        const Icon = FIELD_ICON[k];
                                        const w = widthOf(k);
                                        const dragging = dragKey === k;
                                        return (
                                            <li
                                                key={k}
                                                draggable
                                                onDragStart={() => setDragKey(k)}
                                                onDragEnd={() => setDragKey(null)}
                                                onDragOver={(e) => { e.preventDefault(); if (dragKey && dragKey !== k) reorder(dragKey, k); }}
                                                onDrop={(e) => { e.preventDefault(); setDragKey(null); }}
                                                className={cn(
                                                    'flex items-center gap-2 rounded-md border bg-white px-2.5 py-1.5 transition-colors',
                                                    dragging ? 'border-blue-400 opacity-60' : 'border-slate-200',
                                                )}
                                            >
                                                <GripVertical size={14} className="shrink-0 cursor-grab text-slate-300 active:cursor-grabbing" />
                                                <Icon size={13} className="shrink-0 text-slate-400" />
                                                <span className="flex-1 truncate text-[12px] font-medium text-slate-700">{FIELD_LABEL[k]}</span>

                                                {/* Full / Half width segmented control */}
                                                <div className="flex overflow-hidden rounded-md border border-slate-200">
                                                    {(['full', 'half'] as const).map(opt => (
                                                        <button key={opt} type="button" onClick={() => setWidth(k, opt)}
                                                            className={cn('px-2 py-0.5 text-[10px] font-bold capitalize',
                                                                w === opt ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50')}>
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>

                                                <button type="button" onClick={() => moveField(k, -1)} disabled={idx === 0}
                                                    className={cn('flex h-7 w-7 items-center justify-center rounded-md', idx === 0 ? 'cursor-not-allowed text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-blue-600')}>
                                                    <ArrowUp size={14} />
                                                </button>
                                                <button type="button" onClick={() => moveField(k, 1)} disabled={idx === activeKeys.length - 1}
                                                    className={cn('flex h-7 w-7 items-center justify-center rounded-md', idx === activeKeys.length - 1 ? 'cursor-not-allowed text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-blue-600')}>
                                                    <ArrowDown size={14} />
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Live preview (reflects edits, order + side-by-side widths) */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            {name} <span className="text-[10px] font-medium text-slate-400">· {numberInput ? 'Number entry' : 'Document upload'}</span>
                        </p>

                        {activeKeys.length === 0 ? (
                            <p className="py-6 text-center text-[12px] italic text-slate-400">No fields on this form yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {rows.map((row) => (
                                    <div key={row.join('+')} className={cn(row.length === 2 && 'grid grid-cols-2 gap-3')}>
                                        {row.map(k => <div key={k}>{renderFieldInner(k)}</div>)}
                                    </div>
                                ))}
                            </div>
                        )}

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
