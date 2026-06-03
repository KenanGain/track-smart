import { useMemo } from 'react';
import { Upload, UploadCloud, Calendar, MapPin, Globe2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StandardField } from '@/pages/ats/application-forms.data';
import { loadDocumentTypes } from '@/pages/ats/document-types.data';
import { DOCUMENTS } from '@/pages/admin/ComplianceAndDocumentsPage';
import { loadAdminDocuments, adminDocsAsFormTypes } from '@/pages/admin/compliance-catalog.data';

/**
 * Renders a single field the way it appears on the rendered form —
 * label + a non-interactive input by type. Shared by the builder's
 * collapsible step view and the print view.
 */

const BOX = 'rounded-md border border-slate-300 bg-white';

/** Mini detail-field stub shown above a document upload (matches the live form). */
function MetaStub({ label, placeholder, icon: Icon }: { label: string; placeholder: string; icon: React.ComponentType<{ size?: number; className?: string }> }) {
    return (
        <div>
            <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500"><Icon size={11} /> {label}</p>
            <div className="flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-400">{placeholder}</div>
        </div>
    );
}

export function FieldPreview({ field }: { field: StandardField }) {
    const opts = field.options && field.options.length ? field.options : ['Option 1', 'Option 2'];

    // For document fields, resolve the linked type so the preview matches the
    // live form (detail inputs above the upload, Front/Rear slots when set).
    const docTypeId = (field as { documentTypeId?: string }).documentTypeId;
    const docType = useMemo(() => {
        if (field.type !== 'document' || !docTypeId) return undefined;
        const merged = [...adminDocsAsFormTypes(loadAdminDocuments(DOCUMENTS)), ...loadDocumentTypes()];
        return merged.find(t => t.id === docTypeId);
    }, [field.type, docTypeId]);

    let control: React.ReactNode;
    switch (field.type) {
        case 'textarea':
            control = <div className={cn(BOX, 'h-16')} />;
            break;
        case 'date':
            control = <div className={cn(BOX, 'flex h-9 items-center px-3 text-sm text-slate-400')}>mm / dd / yyyy</div>;
            break;
        case 'number':
            control = <div className={cn(BOX, 'h-9')} />;
            break;
        case 'select':
            control = <div className={cn(BOX, 'flex h-9 items-center px-3 text-sm text-slate-400')}>Choose…</div>;
            break;
        case 'toggle':
            control = <div className="h-5 w-9 rounded-full bg-slate-300" />;
            break;
        case 'radio':
            control = (
                <div className="space-y-1">
                    {opts.map(o => (
                        <div key={o} className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="h-3.5 w-3.5 rounded-full border border-slate-400" />{o}
                        </div>
                    ))}
                </div>
            );
            break;
        case 'checklist':
            control = (
                <div className="space-y-1">
                    {opts.map(o => (
                        <div key={o} className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="h-3.5 w-3.5 rounded border border-slate-400" />{o}
                        </div>
                    ))}
                </div>
            );
            break;
        case 'document': {
            const twoSlots = docType?.numberOfSlots === 2;
            const slots = twoSlots
                ? [docType!.slotLabels?.[0]?.trim() || 'Front', docType!.slotLabels?.[1]?.trim() || 'Rear']
                : [];
            const hasMeta = !!docType && (docType.expiryRequired || docType.issueDateRequired || docType.issueStateRequired || docType.issueCountryRequired);
            control = (
                <div className="space-y-2">
                    {/* Detail inputs first — same concept as the upload form */}
                    {hasMeta && (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {docType!.expiryRequired && <MetaStub label="Expiry date" placeholder="mm / dd / yyyy" icon={Calendar} />}
                            {docType!.issueDateRequired && <MetaStub label="Issue date" placeholder="mm / dd / yyyy" icon={Calendar} />}
                            {docType!.issueStateRequired && <MetaStub label="Issue state / province" placeholder="Select state…" icon={MapPin} />}
                            {docType!.issueCountryRequired && <MetaStub label="Issue country" placeholder="Select country…" icon={Globe2} />}
                        </div>
                    )}
                    {/* Upload widget — Front/Rear slots when set, else single */}
                    {twoSlots ? (
                        <div className="grid grid-cols-2 gap-2">
                            {slots.map(slot => (
                                <div key={slot} className="rounded-md border border-slate-200 p-2.5">
                                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">{slot}</div>
                                    <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-blue-300 bg-blue-50/30 px-2 py-3 text-center">
                                        <UploadCloud size={18} className="mb-1 text-slate-300" />
                                        <span className="text-[10px] font-medium text-blue-600">Click to upload</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-400">
                            <Upload size={14} /> {docType?.allowMultiple ? 'Upload documents (multiple allowed)' : 'Upload document'}
                        </div>
                    )}
                </div>
            );
            break;
        }
        default:
            control = <div className={cn(BOX, 'h-9')} />;
    }

    return (
        <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                {field.label}{field.required && <span className="text-rose-500"> *</span>}
            </label>
            {control}
            {field.instruction && (
                <p className="mt-1 text-[11px] text-slate-400">{field.instruction}</p>
            )}
        </div>
    );
}
