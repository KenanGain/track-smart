import { useState, useEffect, useMemo } from 'react';
import { X, Save, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DOCUMENTS, type KeyNumberRow,
} from '@/pages/admin/ComplianceAndDocumentsPage';
import { DOC_IDS_BY_KN_ID } from '@/pages/admin/carrier-compliance.data';
import type { KeyNumberValue, UploadedDocument } from '@/types/key-numbers.types';
import { US_STATES, CA_PROVINCES } from '@/pages/settings/MaintenancePage';
import { FileDropZone } from './FileDropZone';

/** Payload handed back to the page on save. */
export interface ComplianceKeyNumberSave {
    value: string;
    expiryDate?: string;
    issueDate?: string;
    issuingState?: string;
    issuingCountry?: string;
    /** Supporting document(s) uploaded inline in the form. */
    documents?: UploadedDocument[];
}

const makeUploadId = () => `up_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** True when this key number expects a supporting document (Settings flag or linkage). */
function keyNumberNeedsDoc(row: KeyNumberRow): boolean {
    return !!row.docRequired || (DOC_IDS_BY_KN_ID.get(row.id)?.length ?? 0) > 0;
}

interface ComplianceKeyNumberModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'add' | 'edit';
    scope: 'Carrier' | 'Asset' | 'Driver';
    /** Enabled, active key numbers for this scope — used for the add-mode type picker. */
    availableKeyNumbers: KeyNumberRow[];
    /** The row being edited (edit mode only). */
    editRow?: KeyNumberRow | null;
    /** The currently-stored value for the edited row (edit mode only). */
    existingValue?: KeyNumberValue | null;
    /** Supporting documents already uploaded for the edited row. */
    existingDocuments?: UploadedDocument[];
    onSave: (rowId: string, payload: ComplianceKeyNumberSave) => void;
}

/** Resolve the linked document name for a key number, if any. */
function linkedDocNameFor(rowId: string): string | undefined {
    const docId = (DOC_IDS_BY_KN_ID.get(rowId) ?? [])[0];
    if (!docId) return undefined;
    return DOCUMENTS.find(d => d.id === docId)?.name;
}

export function ComplianceKeyNumberModal({
    isOpen, onClose, mode, scope, availableKeyNumbers, editRow, existingValue, existingDocuments, onSave,
}: ComplianceKeyNumberModalProps) {
    const [selectedRowId, setSelectedRowId] = useState('');
    const [value, setValue] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [issueDate, setIssueDate] = useState('');
    const [issuingState, setIssuingState] = useState('');
    const [issuingCountry, setIssuingCountry] = useState('');
    const [docs, setDocs] = useState<UploadedDocument[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // The active row drives which fields show + validation rules.
    const activeRow = useMemo<KeyNumberRow | null>(() => {
        if (mode === 'edit') return editRow ?? null;
        return availableKeyNumbers.find(k => k.id === selectedRowId) ?? null;
    }, [mode, editRow, selectedRowId, availableKeyNumbers]);

    // (Re)hydrate the form whenever the modal opens.
    useEffect(() => {
        if (!isOpen) return;
        if (mode === 'edit' && editRow) {
            setSelectedRowId(editRow.id);
            setValue(existingValue?.value ?? '');
            setExpiryDate(existingValue?.expiryDate ?? '');
            setIssueDate(existingValue?.issueDate ?? '');
            setIssuingState(existingValue?.issuingState ?? '');
            setIssuingCountry(existingValue?.issuingCountry ?? '');
            setDocs(existingDocuments ?? []);
        } else {
            setSelectedRowId('');
            setValue('');
            setExpiryDate('');
            setIssueDate('');
            setIssuingState('');
            setIssuingCountry('');
            setDocs([]);
        }
        setErrors({});
    }, [isOpen, mode, editRow, existingValue, existingDocuments]);

    if (!isOpen) return null;

    const linkedDoc = activeRow ? linkedDocNameFor(activeRow.id) : undefined;
    const needsDoc = !!activeRow && keyNumberNeedsDoc(activeRow);

    const addFiles = (list: FileList | null) => {
        if (!list || list.length === 0) return;
        const stamp = new Date().toISOString().slice(0, 10);
        const picked = Array.from(list).map(f => ({ id: makeUploadId(), fileName: f.name, fileSize: f.size, uploadedAt: stamp }));
        setDocs(picked.slice(0, 1)); // a key number carries a single supporting document
    };

    const validate = (): boolean => {
        const next: Record<string, string> = {};
        if (mode === 'add' && !selectedRowId) next.type = 'Please select a key number type.';
        if (activeRow) {
            if (activeRow.numberRequired && !value.trim()) next.value = 'A value is required.';
            if (activeRow.hasExpiry && !expiryDate) next.expiry = 'Expiry date is required.';
            if (activeRow.issueDateRequired && !issueDate) next.issueDate = 'Issue date is required.';
            if (activeRow.issueCountryRequired && !issuingCountry.trim()) next.issuingCountry = 'Issuing country is required.';
            if (activeRow.issueStateRequired && !issuingState.trim()) next.issuingState = 'Issuing state / province is required.';
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSave = () => {
        if (!validate() || !activeRow) return;
        onSave(activeRow.id, {
            value: value.trim(),
            expiryDate: activeRow.hasExpiry ? (expiryDate || undefined) : undefined,
            issueDate: issueDate || undefined,
            issuingState: activeRow.issueStateRequired ? (issuingState || undefined) : undefined,
            issuingCountry: activeRow.issueCountryRequired ? (issuingCountry || undefined) : undefined,
            documents: needsDoc ? docs : undefined,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-[640px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/30">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">
                            {mode === 'add' ? 'Add Key Number' : 'Edit Key Number'}
                        </h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {activeRow ? activeRow.name : `${scope} compliance`}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Type selector (add mode) */}
                    {mode === 'add' && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Key Number Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={selectedRowId}
                                onChange={(e) => { setSelectedRowId(e.target.value); setErrors(p => ({ ...p, type: '' })); }}
                                className={cn(
                                    'w-full border rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500',
                                    errors.type ? 'border-red-300' : 'border-slate-300',
                                )}
                            >
                                <option value="">Select a number type...</option>
                                {availableKeyNumbers.map(k => (
                                    <option key={k.id} value={k.id}>{k.name}</option>
                                ))}
                            </select>
                            {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type}</p>}
                        </div>
                    )}

                    {activeRow && (
                        <>
                            {/* Linked document badge */}
                            {linkedDoc && (
                                <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-100 text-blue-700 rounded-lg px-3 py-2">
                                    <FileText size={13} />
                                    <span>Linked to document: <span className="font-semibold">{linkedDoc}</span></span>
                                </div>
                            )}

                            {/* Value */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Number Value {activeRow.numberRequired
                                        ? <span className="text-red-500">*</span>
                                        : <span className="text-slate-400 font-normal">(Optional)</span>}
                                </label>
                                <input
                                    type="text"
                                    placeholder={`Enter ${activeRow.name}...`}
                                    value={value}
                                    onChange={(e) => { setValue(e.target.value); setErrors(p => ({ ...p, value: '' })); }}
                                    className={cn(
                                        'w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500',
                                        errors.value ? 'border-red-300' : 'border-slate-300',
                                    )}
                                />
                                {errors.value && <p className="text-xs text-red-500 mt-1">{errors.value}</p>}
                            </div>

                            {/* Dates */}
                            {(activeRow.hasExpiry || activeRow.issueDateRequired) && (
                                <div className="grid grid-cols-2 gap-4">
                                    {activeRow.hasExpiry && (
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                Expiry Date <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={expiryDate}
                                                onChange={(e) => { setExpiryDate(e.target.value); setErrors(p => ({ ...p, expiry: '' })); }}
                                                className={cn(
                                                    'w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500',
                                                    errors.expiry ? 'border-red-300' : 'border-slate-300',
                                                )}
                                            />
                                            {errors.expiry && <p className="text-xs text-red-500 mt-1">{errors.expiry}</p>}
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                            Issue Date {activeRow.issueDateRequired
                                                ? <span className="text-red-500">*</span>
                                                : <span className="text-slate-400 font-normal">(Optional)</span>}
                                        </label>
                                        <input
                                            type="date"
                                            value={issueDate}
                                            onChange={(e) => { setIssueDate(e.target.value); setErrors(p => ({ ...p, issueDate: '' })); }}
                                            className={cn(
                                                'w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500',
                                                errors.issueDate ? 'border-red-300' : 'border-slate-300',
                                            )}
                                        />
                                        {errors.issueDate && <p className="text-xs text-red-500 mt-1">{errors.issueDate}</p>}
                                    </div>
                                </div>
                            )}

                            {/* Issuing Country / State */}
                            {(activeRow.issueCountryRequired || activeRow.issueStateRequired) && (
                                <div className="grid grid-cols-2 gap-4">
                                    {activeRow.issueCountryRequired && (
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                Issuing Country <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={issuingCountry}
                                                onChange={(e) => { setIssuingCountry(e.target.value); setIssuingState(''); setErrors(p => ({ ...p, issuingCountry: '', issuingState: '' })); }}
                                                className={cn(
                                                    'w-full border rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500',
                                                    errors.issuingCountry ? 'border-red-300' : 'border-slate-300',
                                                )}
                                            >
                                                <option value="">Select country...</option>
                                                <option value="United States">United States</option>
                                                <option value="Canada">Canada</option>
                                            </select>
                                            {errors.issuingCountry && <p className="text-xs text-red-500 mt-1">{errors.issuingCountry}</p>}
                                        </div>
                                    )}
                                    {activeRow.issueStateRequired && (
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                Issuing State / Province <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={issuingState}
                                                onChange={(e) => { setIssuingState(e.target.value); setErrors(p => ({ ...p, issuingState: '' })); }}
                                                className={cn(
                                                    'w-full border rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500',
                                                    errors.issuingState ? 'border-red-300' : 'border-slate-300',
                                                )}
                                            >
                                                <option value="">Select state / province...</option>
                                                {(issuingCountry === 'Canada' ? CA_PROVINCES : US_STATES).map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                            {errors.issuingState && <p className="text-xs text-red-500 mt-1">{errors.issuingState}</p>}
                                        </div>
                                    )}
                                </div>
                            )}


                            {/* Supporting document — shown only when Settings says this
                                key number needs a document (Doc Required / linkage). */}
                            {needsDoc && (
                                <div className="space-y-2 pt-1">
                                    <label className="block text-sm font-semibold text-slate-700">
                                        Supporting Document
                                        {linkedDoc && <span className="font-normal text-slate-400"> — {linkedDoc}</span>}
                                    </label>
                                    <FileDropZone
                                        files={docs}
                                        onAdd={addFiles}
                                        onRemove={(id) => setDocs(prev => prev.filter(f => f.id !== id))}
                                        compact
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-300 rounded-lg bg-white hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" /> Save
                    </button>
                </div>
            </div>
        </div>
    );
}
