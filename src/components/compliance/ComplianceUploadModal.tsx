import { useEffect, useState } from 'react';
import { X, Save, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UploadedDocument } from '@/types/key-numbers.types';
import { US_STATES, CA_PROVINCES } from '@/pages/settings/MaintenancePage';
import { FileDropZone } from './FileDropZone';

interface ComplianceUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Name of the document/key number this upload supports (header context). */
    title: string;
    /** Which detail fields to capture — all driven by the Settings compliance flags. */
    expiryRequired?: boolean;
    issueDateRequired?: boolean;
    issueStateRequired?: boolean;
    issueCountryRequired?: boolean;
    /** When true (document's "Allow multiple" flag), several files can be attached. */
    allowMultiple?: boolean;
    /** Fixed number of labeled upload slots (e.g. 2 → Front / Rear). Undefined = unlimited. */
    numberOfSlots?: number;
    slotLabels?: string[];
    existing?: UploadedDocument[] | null;
    onSave: (docs: UploadedDocument[]) => void;
}

interface PendingFile { id: string; fileName: string; fileSize?: number; slotLabel?: string }

const makeId = () => `up_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function ComplianceUploadModal({
    isOpen, onClose, title, expiryRequired, issueDateRequired, issueStateRequired, issueCountryRequired, allowMultiple, numberOfSlots, slotLabels, existing, onSave,
}: ComplianceUploadModalProps) {
    // Labeled slots are only for exactly TWO (e.g. Front / Rear); any other
    // count falls back to a single/multiple upload.
    const slotMode = numberOfSlots === 2;
    const slots = slotMode
        ? [slotLabels?.[0]?.trim() || 'Front', slotLabels?.[1]?.trim() || 'Rear']
        : [];
    const [files, setFiles] = useState<PendingFile[]>([]);
    const [expiryDate, setExpiryDate] = useState('');
    const [issueDate, setIssueDate] = useState('');
    const [issuingState, setIssuingState] = useState('');
    const [issuingCountry, setIssuingCountry] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setFiles((existing ?? []).map(d => ({ id: d.id, fileName: d.fileName, fileSize: d.fileSize, slotLabel: d.slotLabel })));
        setExpiryDate(existing?.[0]?.expiryDate ?? '');
        setIssueDate(existing?.[0]?.issueDate ?? '');
        setIssuingState(existing?.[0]?.issuingState ?? '');
        setIssuingCountry(existing?.[0]?.issuingCountry ?? '');
        setError('');
    }, [isOpen, existing]);

    if (!isOpen) return null;

    const addFiles = (list: FileList | null | undefined) => {
        if (!list || list.length === 0) return;
        const picked: PendingFile[] = Array.from(list).map(f => ({ id: makeId(), fileName: f.name, fileSize: f.size }));
        setFiles(prev => allowMultiple ? [...prev, ...picked] : [picked[0]]);
        setError('');
    };
    const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));

    /** Set/replace the single file held in a labeled slot. */
    const setSlotFile = (slot: string, list: FileList | null | undefined) => {
        const f = list?.[0];
        if (!f) return;
        setFiles(prev => [...prev.filter(p => p.slotLabel !== slot), { id: makeId(), fileName: f.name, fileSize: f.size, slotLabel: slot }]);
        setError('');
    };
    const fileForSlot = (slot: string) => files.find(f => f.slotLabel === slot);

    const handleSave = () => {
        if (files.length === 0) { setError('Please choose a file to upload.'); return; }
        if (expiryRequired && !expiryDate) { setError('An expiry date is required for this document.'); return; }
        if (issueDateRequired && !issueDate) { setError('An issue date is required for this document.'); return; }
        if (issueCountryRequired && !issuingCountry.trim()) { setError('An issuing country is required for this document.'); return; }
        if (issueStateRequired && !issuingState.trim()) { setError('An issuing state / province is required for this document.'); return; }
        const stamp = new Date().toISOString().slice(0, 10);
        onSave(files.map(f => ({
            id: f.id,
            fileName: f.fileName,
            fileSize: f.fileSize,
            uploadedAt: stamp,
            slotLabel: f.slotLabel,
            expiryDate: expiryDate || undefined,
            issueDate: issueDate || undefined,
            issuingState: issuingState || undefined,
            issuingCountry: issuingCountry || undefined,
        })));
        onClose();
    };

    const showDates = expiryRequired || issueDateRequired;
    const showRegion = issueStateRequired || issueCountryRequired;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/30 px-6 py-5">
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-slate-900">Upload Document</h3>
                        <p className="mt-0.5 truncate text-sm text-slate-500">{title}</p>
                    </div>
                    <button type="button" onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-6">
                    {/* Dates — only the ones Settings requires */}
                    {showDates && (
                        <div className={cn("grid gap-4", expiryRequired && issueDateRequired ? "grid-cols-2" : "grid-cols-1")}>
                            {expiryRequired && (
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Expiry Date <span className="text-red-500">*</span></label>
                                    <input type="date" value={expiryDate} onChange={(e) => { setExpiryDate(e.target.value); setError(''); }}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            )}
                            {issueDateRequired && (
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Issue Date <span className="text-red-500">*</span></label>
                                    <input type="date" value={issueDate} onChange={(e) => { setIssueDate(e.target.value); setError(''); }}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Issuing Country / State — only the ones Settings requires */}
                    {showRegion && (
                        <div className={cn("grid gap-4", issueCountryRequired && issueStateRequired ? "grid-cols-2" : "grid-cols-1")}>
                            {issueCountryRequired && (
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Issuing Country <span className="text-red-500">*</span></label>
                                    <select
                                        value={issuingCountry}
                                        onChange={(e) => { setIssuingCountry(e.target.value); setIssuingState(''); setError(''); }}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select country...</option>
                                        <option value="United States">United States</option>
                                        <option value="Canada">Canada</option>
                                    </select>
                                </div>
                            )}
                            {issueStateRequired && (
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Issuing State / Province <span className="text-red-500">*</span></label>
                                    <select
                                        value={issuingState}
                                        onChange={(e) => { setIssuingState(e.target.value); setError(''); }}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select state / province...</option>
                                        {(issuingCountry === 'Canada' ? CA_PROVINCES : US_STATES).map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Upload widget — after the detail fields */}
                    {slotMode ? (
                        <div className={cn("grid gap-3", slots.length >= 2 ? "grid-cols-2" : "grid-cols-1")}>
                            {slots.map(slot => {
                                const f = fileForSlot(slot);
                                return (
                                    <div key={slot} className="rounded-lg border border-slate-200 p-3">
                                        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">{slot}</div>
                                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-blue-300 bg-blue-50/30 px-3 py-4 text-center hover:bg-blue-50/60">
                                            <UploadCloud size={20} className="mb-1 text-slate-300" />
                                            <span className="text-[11px] font-medium text-blue-600">{f ? 'Replace file' : 'Click to upload'}</span>
                                            <input type="file" className="hidden" onChange={(e) => { setSlotFile(slot, e.target.files); e.target.value = ''; }} />
                                        </label>
                                        {f && (
                                            <div className="mt-2 flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1.5 text-xs">
                                                <span className="truncate text-slate-700">{f.fileName}</span>
                                                <button type="button" onClick={() => removeFile(f.id)} className="shrink-0 text-rose-500 hover:text-rose-700" title="Remove">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <FileDropZone files={files} onAdd={addFiles} onRemove={removeFile} multiple={allowMultiple} />
                    )}

                    {error && <p className="text-xs text-red-500">{error}</p>}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={handleSave} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700">
                        <Save className="h-4 w-4" /> Save
                    </button>
                </div>
            </div>
        </div>
    );
}
