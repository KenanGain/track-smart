import { useMemo, useState } from 'react';
import { Plus, Trash2, Pencil, Upload, Check, GripVertical } from 'lucide-react';
import {
    DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext, rectSortingStrategy, useSortable, arrayMove,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    newFormField, loadApplicationForms, chunkFieldRows,
    type FormField, type FormFieldType,
} from '@/pages/ats/application-forms.data';
import { loadDocumentTypes } from '@/pages/ats/document-types.data';
import {
    fieldTypesByCategory, getFieldTypeDef,
} from '@/pages/ats/field-types';
import { VisibilityConfig } from './VisibilityConfig';
import { DocumentTypeConfig } from './DocumentTypeConfig';
import { OptionsEditor } from './OptionsEditor';

/**
 * Flat field builder for a form — each field renders as it appears on the
 * real form, with edit / delete actions. No steps; a form is one field list.
 */

const PREVIEW_INPUT = 'pointer-events-none w-full rounded-md border border-slate-300 bg-slate-50 text-sm';

// Document type catalog cached at module level — used by the document field
// preview so the inputs (expiry, issue date, state, country, multiple)
// reflect the configured catalog row, not generic defaults.
const DOC_TYPES_CACHE = (() => loadDocumentTypes())();

function FieldInputPreview({ field }: { field: FormField }) {
    const opts = field.options.length ? field.options : ['Option 1', 'Option 2'];
    switch (field.type) {
        case 'textarea':
            return <div className={cn(PREVIEW_INPUT, 'h-16')} />;
        case 'select':
            return (
                <div className={cn(PREVIEW_INPUT, 'flex h-9 items-center px-3 text-slate-400')}>
                    Choose…
                </div>
            );
        case 'toggle':
            return (
                <div className="relative h-5 w-9 rounded-full bg-slate-300">
                    <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow" />
                </div>
            );
        case 'radio':
            return (
                <div className="space-y-1">
                    {opts.map(o => (
                        <div key={o} className="flex items-center gap-2 text-sm text-slate-500">
                            <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />{o}
                        </div>
                    ))}
                </div>
            );
        case 'checklist':
            return (
                <div className="space-y-1">
                    {opts.map(o => (
                        <div key={o} className="flex items-center gap-2 text-sm text-slate-500">
                            <span className="h-3.5 w-3.5 rounded border border-slate-300" />{o}
                        </div>
                    ))}
                </div>
            );
        case 'date':
            return (
                <div className={cn(PREVIEW_INPUT, 'flex h-9 items-center px-3 text-slate-400')}>
                    mm / dd / yyyy
                </div>
            );
        case 'number':
            return <div className={cn(PREVIEW_INPUT, 'h-9')} />;
        case 'document': {
            // Resolve the linked Document Type so the preview shows the same
            // inputs the form builder generates at runtime — Upload + Expiry,
            // Issue Date, Issue State, Issue Country, Allow Multiple.
            const linkedType = field.documentTypeId
                ? DOC_TYPES_CACHE.find(t => t.id === field.documentTypeId)
                : undefined;
            const allowMultiple        = linkedType?.allowMultiple        ?? false;
            const expiryRequired       = linkedType?.expiryRequired       ?? false;
            const issueDateRequired    = linkedType?.issueDateRequired    ?? false;
            const issueStateRequired   = linkedType?.issueStateRequired   ?? false;
            const issueCountryRequired = linkedType?.issueCountryRequired ?? false;
            return (
                <div className="flex flex-col gap-2">
                    {/* Upload widget */}
                    <div className="flex items-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-400">
                        <Upload size={14} /> {allowMultiple ? 'Upload documents (multiple allowed)' : 'Upload document'}
                    </div>

                    {/* Meta inputs — only render the ones the catalog turned on; above or below per the field setting */}
                    {(expiryRequired || issueDateRequired || issueStateRequired || issueCountryRequired) && (
                        <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2", field.metaPosition === 'above' && "order-first")}>
                            {expiryRequired && (
                                <div>
                                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Expiry date</p>
                                    <div className={cn(PREVIEW_INPUT, 'flex h-9 items-center px-3 text-slate-400')}>
                                        mm / dd / yyyy
                                    </div>
                                </div>
                            )}
                            {issueDateRequired && (
                                <div>
                                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Issue date</p>
                                    <div className={cn(PREVIEW_INPUT, 'flex h-9 items-center px-3 text-slate-400')}>
                                        mm / dd / yyyy
                                    </div>
                                </div>
                            )}
                            {issueStateRequired && (
                                <div>
                                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Issue state / province</p>
                                    <div className={cn(PREVIEW_INPUT, 'flex h-9 items-center px-3 text-slate-400')}>
                                        Select state…
                                    </div>
                                </div>
                            )}
                            {issueCountryRequired && (
                                <div>
                                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Issue country</p>
                                    <div className={cn(PREVIEW_INPUT, 'flex h-9 items-center px-3 text-slate-400')}>
                                        Select country…
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        }
        case 'license-list':
            return (
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            Class A • 1234567 • ON
                            <span className="text-blue-400">×</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            Class B • 7890123 • QC
                            <span className="text-blue-400">×</span>
                        </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50/40 px-3 py-1.5 text-xs font-semibold text-blue-600">
                        <Plus size={12} /> Add License
                    </div>
                </div>
            );
        case 'address-list':
            return (
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            123 Main St, Toronto, ON
                            <span className="text-blue-400">×</span>
                        </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50/40 px-3 py-1.5 text-xs font-semibold text-blue-600">
                        <Plus size={12} /> Add Address
                    </div>
                </div>
            );
        case 'disqualification-list':
            return (
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            2024-03-12 · 90 days · 1 offence
                            <span className="text-blue-400">×</span>
                        </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50/40 px-3 py-1.5 text-xs font-semibold text-blue-600">
                        <Plus size={12} /> Add Disqualification
                    </div>
                </div>
            );
        case 'accident-list':
            return (
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            2024-03-12 · Rear-end · Toronto, ON
                            <span className="text-blue-400">×</span>
                        </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50/40 px-3 py-1.5 text-xs font-semibold text-blue-600">
                        <Plus size={12} /> Add Accident
                    </div>
                </div>
            );
        case 'violation-list':
            return (
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            2024-03-12 · Speeding · Fine · Toronto
                            <span className="text-blue-400">×</span>
                        </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50/40 px-3 py-1.5 text-xs font-semibold text-blue-600">
                        <Plus size={12} /> Add Violation
                    </div>
                </div>
            );
        case 'driving-experience-list':
            return (
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            Tractor-trailer · 2022-2024 · 120,000 mi
                            <span className="text-blue-400">×</span>
                        </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50/40 px-3 py-1.5 text-xs font-semibold text-blue-600">
                        <Plus size={12} /> Add Experience
                    </div>
                </div>
            );
        case 'employment-list':
            return (
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            Acme Trucking · 2020-2024 · Contract Employee
                            <span className="text-blue-400">×</span>
                        </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50/40 px-3 py-1.5 text-xs font-semibold text-blue-600">
                        <Plus size={12} /> Add Employer
                    </div>
                </div>
            );
        case 'education-list':
            return (
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            Bachelor · University of Toronto · 2018
                            <span className="text-blue-400">×</span>
                        </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50/40 px-3 py-1.5 text-xs font-semibold text-blue-600">
                        <Plus size={12} /> Add Education
                    </div>
                </div>
            );
        case 'paragraph':
            return (
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                    {field.instruction || 'Body paragraph text.'}
                </p>
            );
        case 'bullet-list': {
            const items = field.options.length ? field.options : ['Bullet item one;', 'Bullet item two;', 'Bullet item three.'];
            return (
                <div className="space-y-1">
                    {field.label && (
                        <p className="text-sm font-semibold text-slate-700">{field.label}</p>
                    )}
                    <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                        {items.map((o, i) => <li key={i}>{o}</li>)}
                    </ul>
                </div>
            );
        }
        case 'alert':
            return (
                <div className="rounded-md border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {field.label || 'Important note for the applicant.'}
                </div>
            );
        case 'signature':
            return (
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-3 py-2 text-[11px] font-bold text-slate-700">
                        <span>{field.label || 'Signature'}</span>
                        <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                            Clear
                        </span>
                    </div>
                    <div className="flex h-20 items-end justify-center bg-[linear-gradient(180deg,white_0,white_calc(100%-22px),#cbd5e1_calc(100%-22px),#cbd5e1_calc(100%-21px),white_calc(100%-21px))] pb-3 text-[10px] italic text-slate-400">
                        sign here
                    </div>
                </div>
            );
        case 'subform-button':
            return (
                <div className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-violet-300 bg-violet-50/40 px-3 py-1.5 text-xs font-semibold text-violet-700">
                    <Plus size={12} /> {field.label || 'Open subform'}
                </div>
            );
        case 'heading':
            return (
                <div className="border-b border-blue-200 pb-1.5">
                    <div className="text-sm font-semibold text-blue-600">
                        {field.label || 'Section heading'}
                    </div>
                </div>
            );
        default:
            return <div className={cn(PREVIEW_INPUT, 'h-9')} />;
    }
}

/** Header row inside a FieldCard: label + edit/remove buttons. */
function FieldHeader({ field, onEdit, onRemove, condensed, dragHandleProps }: {
    field: FormField;
    onEdit: () => void;
    onRemove: () => void;
    condensed?: boolean;
    /** Spread from useSortable (attributes + listeners) onto the grip button. */
    dragHandleProps?: Record<string, unknown>;
}) {
    const def = getFieldTypeDef(field.type);
    const TypeIcon = def.icon;
    return (
        <div className="mb-2 flex items-center gap-2">
            {dragHandleProps && (
                <button
                    type="button"
                    {...dragHandleProps}
                    className="flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded text-slate-300 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
                    title="Drag to reorder"
                    aria-label="Drag to reorder"
                >
                    <GripVertical size={14} />
                </button>
            )}
            <TypeIcon size={condensed ? 12 : 13} className="shrink-0 text-slate-400" />
            <div className={cn(
                "flex flex-1 flex-wrap items-baseline gap-x-2",
                condensed ? "text-[11px]" : "text-[12px]",
            )}>
                <span className="font-semibold uppercase tracking-wide text-slate-600">
                    {field.label || 'Untitled field'}
                    {field.required && <span className="text-rose-500"> *</span>}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    {def.label}
                </span>
            </div>
            <button
                type="button"
                onClick={onEdit}
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                title="Edit field"
            >
                <Pencil size={14} />
            </button>
            <button
                type="button"
                onClick={onRemove}
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                title="Remove field"
            >
                <Trash2 size={14} />
            </button>
        </div>
    );
}

/** A field card; if `dependents` are passed they nest inside (e.g. a toggle + its conditional checklist). */
function FieldCard({ field, dependents, onEdit, onRemove, onEditDependent, onRemoveDependent, dragHandleProps }: {
    field: FormField;
    dependents: FormField[];
    onEdit: () => void;
    onRemove: () => void;
    onEditDependent: (f: FormField) => void;
    onRemoveDependent: (f: FormField) => void;
    dragHandleProps?: Record<string, unknown>;
}) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4 hover:border-blue-300">
            <FieldHeader field={field} onEdit={onEdit} onRemove={onRemove} dragHandleProps={dragHandleProps} />
            <FieldInputPreview field={field} />
            {field.instruction && (
                <p className="mt-1.5 text-[11px] text-slate-400">{field.instruction}</p>
            )}
            {dependents.map((dep) => (
                <div
                    key={dep.id}
                    className="mt-4 rounded-md border border-dashed border-amber-300 bg-amber-50/40 p-3"
                >
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                        Shown when “{field.label || 'this toggle'}” is {String(dep.showWhen!.equals)}
                    </div>
                    <FieldHeader
                        field={dep}
                        onEdit={() => onEditDependent(dep)}
                        onRemove={() => onRemoveDependent(dep)}
                        condensed
                    />
                    <FieldInputPreview field={dep} />
                    {dep.instruction && (
                        <p className="mt-1.5 text-[11px] text-slate-400">{dep.instruction}</p>
                    )}
                </div>
            ))}
        </div>
    );
}

/**
 * Toggle-only wizard inside the field-settings modal.
 *
 * Two-step flow:
 *   1) Admin picks the **visibility trigger** (toggle ON or OFF) for the new follow-up
 *      and picks the **field type** from the quick-add grid.
 *   2) If the picked type is `document`, a Document Type picker appears so the new upload
 *      starts already linked to a Document Type from the Documents tab library. For every
 *      other type, the field is created immediately.
 *
 * The existing dependents listing shows each follow-up's linked metadata so admins can see
 * at a glance which type, which trigger state, and (for documents) which Document Type.
 */
/** Tiny eyebrow label used to title each right-pane card inside the field-settings modal. */
function SectionEyebrow({ children, accent = 'slate' }: {
    children: React.ReactNode;
    accent?: 'slate' | 'blue' | 'emerald' | 'amber' | 'violet';
}) {
    const tone: Record<string, string> = {
        slate:   'text-slate-500',
        blue:    'text-blue-600',
        emerald: 'text-emerald-700',
        amber:   'text-amber-700',
        violet:  'text-violet-700',
    };
    return (
        <p className={cn("mb-2 text-[10px] font-bold uppercase tracking-[0.08em]", tone[accent])}>
            {children}
        </p>
    );
}

function FollowUpFieldsConfig({ toggleField, allFields, onAddFollowUp }: {
    toggleField: FormField;
    allFields: FormField[];
    onAddFollowUp: (newField: FormField) => void;
}) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const [whenOn, setWhenOn] = useState(true); // visibility trigger: toggle is ON (true) vs OFF (false)
    const [stage, setStage] = useState<'type' | 'doc-type'>('type'); // when 'doc-type', show the Doc Type picker

    // Only Hiring-flagged active types appear in the form builder picker.
    const docTypes = useMemo(
        () => loadDocumentTypes().filter(t => t.status === 'Active' && t.usingInHiring),
        [stage],
    );
    const dependents = allFields.filter(f => f.showWhen?.fieldId === toggleField.id);

    const quickAdd: { type: FormFieldType; label: string }[] = [
        { type: 'text',      label: 'Text' },
        { type: 'textarea',  label: 'Long text' },
        { type: 'date',      label: 'Date' },
        { type: 'number',    label: 'Number' },
        { type: 'document',  label: 'Document upload' },
        { type: 'toggle',    label: 'Another toggle' },
    ];

    const resetPicker = () => {
        setPickerOpen(false);
        setStage('type');
        setWhenOn(true);
    };

    const createField = (type: FormFieldType, opts?: { documentTypeId?: string; label?: string }) => {
        const def = getFieldTypeDef(type);
        // For document follow-ups the opts label (Doc Type name) is used; everything else
        // gets a sensible default — admin renames via the field's own Label input afterwards.
        const label = opts?.label || `New ${def.label.toLowerCase()}`;
        const newField: FormField = {
            ...newFormField(),
            type,
            label,
            documentTypeId: opts?.documentTypeId,
            showWhen: { fieldId: toggleField.id, equals: whenOn },
        };
        onAddFollowUp(newField);
        resetPicker();
    };

    const onPickType = (type: FormFieldType) => {
        // Document needs a Document Type linked — show the doc-type picker.
        if (type === 'document') {
            setStage('doc-type');
            return;
        }
        createField(type);
    };

    return (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4">
            <div className="mb-4 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700">
                    ?
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                        Follow-up fields
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
                        Fields that appear only when the applicant answers <strong>Yes</strong> (or <strong>No</strong>) on this toggle.
                        Visibility is auto-wired — you don't have to configure it manually.
                    </p>
                </div>
            </div>

            {/* Existing dependents — list with type, trigger, and linked metadata */}
            {dependents.length > 0 && (
                <div className="mb-4">
                    <SectionEyebrow accent="emerald">Current follow-ups · {dependents.length}</SectionEyebrow>
                    <div className="space-y-1.5">
                        {dependents.map(d => {
                            const dDef = getFieldTypeDef(d.type);
                            const DIcon = dDef.icon;
                            const triggerOn = d.showWhen?.equals === true;
                            const linkedDocType = d.type === 'document' && d.documentTypeId
                                ? docTypes.find(t => t.id === d.documentTypeId)
                                : undefined;
                            return (
                                <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2">
                                    <DIcon size={14} className="shrink-0 text-emerald-600" />
                                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-800">
                                        {d.label}
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                        {dDef.label}
                                    </span>
                                    {d.type === 'document' && (
                                        linkedDocType
                                            ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                                  {linkedDocType.name}
                                              </span>
                                            : <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                                  No type linked
                                              </span>
                                    )}
                                    <span className={cn(
                                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                                        triggerOn ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
                                    )}>
                                        when {triggerOn ? 'YES' : 'NO'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {pickerOpen ? (
                <div className="rounded-lg border border-emerald-200 bg-white p-4">
                    {/* Stage 1 — pick trigger + type */}
                    {stage === 'type' && (
                        <>
                            <SectionEyebrow accent="emerald">Step 1 · Show this follow-up when the toggle is</SectionEyebrow>
                            <div className="mb-4 grid grid-cols-2 gap-2">
                                {[
                                    { on: true,  label: 'YES',  hint: 'Applicant answered Yes' },
                                    { on: false, label: 'NO',   hint: 'Applicant answered No' },
                                ].map(o => (
                                    <button
                                        key={o.label}
                                        type="button"
                                        onClick={() => setWhenOn(o.on)}
                                        className={cn(
                                            "flex flex-col items-start rounded-lg border px-4 py-3 text-left transition-colors",
                                            whenOn === o.on
                                                ? "border-emerald-500 bg-emerald-600 text-white shadow-sm"
                                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                                        )}
                                    >
                                        <span className="text-base font-bold">{o.label}</span>
                                        <span className={cn(
                                            "text-[11px]",
                                            whenOn === o.on ? "text-emerald-100" : "text-slate-500",
                                        )}>
                                            {o.hint}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <SectionEyebrow accent="emerald">Step 2 · What kind of follow-up?</SectionEyebrow>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {quickAdd.map(q => {
                                    const def = getFieldTypeDef(q.type);
                                    const Icon = def.icon;
                                    return (
                                        <button
                                            key={q.type}
                                            type="button"
                                            onClick={() => onPickType(q.type)}
                                            className="group flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-[13px] font-medium text-slate-800 hover:border-emerald-400 hover:bg-emerald-50/60 hover:shadow-sm"
                                        >
                                            <Icon size={14} className="shrink-0 text-emerald-600" />
                                            <span className="min-w-0 flex-1 truncate">{q.label}</span>
                                            {q.type === 'document' && (
                                                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-blue-700">
                                                    +type
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button
                                    type="button"
                                    onClick={resetPicker}
                                    className="rounded-md px-3 py-1.5 text-[12px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                >
                                    Cancel
                                </button>
                            </div>
                        </>
                    )}

                    {/* Stage 2 — pick Document Type */}
                    {stage === 'doc-type' && (
                        <>
                            <div className="mb-3 flex items-center justify-between">
                                <SectionEyebrow accent="blue">Step 3 · Pick a Document Type to link</SectionEyebrow>
                                <button
                                    type="button"
                                    onClick={() => setStage('type')}
                                    className="rounded-md px-2.5 py-1 text-[12px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                >
                                    ← Back
                                </button>
                            </div>
                            <p className="mb-3 text-[12px] leading-relaxed text-slate-500">
                                The Document Type's flags drive how the upload renders for the applicant
                                (expiry / issue date / state / country). Don't see what you need?
                                <span className="ml-1 font-semibold text-blue-700">Add it in the Documents tab</span>.
                            </p>
                            <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                                {docTypes.length === 0 && (
                                    <div className="col-span-full rounded-lg border border-dashed border-slate-200 bg-white px-3 py-8 text-center text-sm text-slate-400">
                                        No active Document Types in the library yet.
                                    </div>
                                )}
                                {docTypes.map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => createField('document', { documentTypeId: t.id, label: t.name })}
                                        className="flex w-full items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left hover:border-blue-400 hover:bg-blue-50/40 hover:shadow-sm"
                                    >
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50">
                                            <Upload size={13} className="text-blue-600" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-semibold text-slate-800">{t.name}</p>
                                            <p className="mt-0.5 text-[11px] text-slate-500">
                                                {t.category}
                                                {t.expiryRequired && ' · expiry'}
                                                {t.issueDateRequired && ' · issue date'}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => { setPickerOpen(true); setStage('type'); }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-emerald-300 bg-white px-4 py-2 text-[13px] font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                    <Plus size={14} /> Add follow-up field
                </button>
            )}
        </div>
    );
}

function FieldSettingsModal({ field, allFields, onSave, onAddRelated, onClose }: {
    field: FormField;
    allFields: FormField[];
    onSave: (field: FormField) => void;
    /** Save current draft AND add a new follow-up field that depends on this one. */
    onAddRelated?: (currentDraft: FormField, newDependent: FormField) => void;
    onClose: () => void;
}) {
    const [draft, setDraft] = useState(field);
    const up = (patch: Partial<FormField>) => setDraft(d => ({ ...d, ...patch }));
    const def = getFieldTypeDef(draft.type);
    const usesOptions = def.usesOptions;
    const subforms = draft.type === 'subform-button' ? loadApplicationForms().filter(f => f.isSubform) : [];
    const linkedSubform = subforms.find(s => s.id === draft.subformId);
    const categories = fieldTypesByCategory();
    // Auto-open the picker for brand-new fields (still has the default "New field" label).
    // For existing fields, keep it collapsed — admins rarely change the type and seeing the
    // full picker every time is noise.
    const [pickerOpen, setPickerOpen] = useState(field.label === 'New field');
    const TypeIcon = def.icon;

    const canSave =
        draft.label.trim().length > 0
        && !(draft.type === 'document' && !draft.documentTypeId)
        && !(draft.type === 'subform-button' && !draft.subformId);

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col gap-0 p-0">
                {/* Header */}
                <DialogHeader className="border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-sm">
                            <TypeIcon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-base font-semibold text-slate-900">
                                Field settings
                            </DialogTitle>
                            <p className="mt-0.5 text-[12px] text-slate-500">
                                {draft.label.trim() || 'Untitled field'} <span className="text-slate-300">·</span> <span className="font-medium text-slate-600">{def.label}</span>
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                {/* Body — 2-column on lg, stacks on sm. Internal scroll. */}
                <div className="flex-1 overflow-y-auto bg-slate-50/40 px-6 py-5">
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">

                        {/* LEFT RAIL — Basics */}
                        <div className="space-y-4">
                            {/* Label & required */}
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <SectionEyebrow accent="slate">Basics</SectionEyebrow>
                                <label className="mb-1 block text-xs font-semibold text-slate-700">
                                    Label <span className="text-rose-500">*</span>
                                </label>
                                <Input
                                    value={draft.label}
                                    onChange={e => up({ label: e.target.value })}
                                    className="h-10"
                                />
                                <p className="mt-1 text-[11px] text-slate-500">
                                    Exact wording shown to the applicant above the field.
                                </p>

                                <label className="mt-4 flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 hover:bg-slate-100/60">
                                    <input
                                        type="checkbox"
                                        checked={draft.required}
                                        onChange={e => up({ required: e.target.checked })}
                                        className="h-4 w-4 accent-blue-600"
                                    />
                                    <span className="text-sm font-medium text-slate-800">Required field</span>
                                </label>

                                {/* Width — Full / Half (side by side) */}
                                <div className="mt-4">
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">Width on form</label>
                                    <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
                                        {([
                                            { v: 'full', label: 'Full width' },
                                            { v: 'half', label: 'Half (side by side)' },
                                        ] as const).map(o => {
                                            const active = (draft.width ?? 'full') === o.v;
                                            return (
                                                <button
                                                    key={o.v}
                                                    type="button"
                                                    onClick={() => up({ width: o.v })}
                                                    className={cn(
                                                        "px-3 py-1.5 text-[12px] font-medium",
                                                        active ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50",
                                                    )}
                                                >
                                                    {o.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="mt-1 text-[11px] text-slate-500">
                                        Two consecutive half-width fields render side by side.
                                    </p>
                                </div>
                            </div>

                            {/* Field type chip + picker */}
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <SectionEyebrow accent="blue">Field type</SectionEyebrow>
                                    {pickerOpen && (
                                        <button
                                            type="button"
                                            onClick={() => setPickerOpen(false)}
                                            className="rounded px-2 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                        >
                                            Hide picker
                                        </button>
                                    )}
                                </div>
                                {!pickerOpen ? (
                                    <div className="flex items-start gap-3 rounded-lg border border-blue-300 bg-blue-50/40 p-3">
                                        <TypeIcon size={18} className="mt-0.5 shrink-0 text-blue-600" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-900">{def.label}</p>
                                            <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                                                {def.description}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setPickerOpen(true)}
                                            className="shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                        >
                                            Change
                                        </button>
                                    </div>
                                ) : (
                                    <div className="max-h-[60vh] space-y-4 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/40 p-3 pr-1">
                                        {categories.map(cat => (
                                            <div key={cat.category}>
                                                <SectionEyebrow accent="slate">{cat.label}</SectionEyebrow>
                                                <div className="grid grid-cols-1 gap-1.5">
                                                    {cat.types.map(t => {
                                                        const Icon = t.icon;
                                                        const active = draft.type === t.type;
                                                        return (
                                                            <button
                                                                key={t.type}
                                                                type="button"
                                                                onClick={() => { up({ type: t.type as FormFieldType }); setPickerOpen(false); }}
                                                                className={cn(
                                                                    "flex items-start gap-2.5 rounded-lg border bg-white px-3 py-2.5 text-left transition-colors",
                                                                    active
                                                                        ? "border-blue-600 bg-blue-100 ring-2 ring-blue-300"
                                                                        : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30",
                                                                )}
                                                            >
                                                                <div className={cn(
                                                                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                                                                    active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500",
                                                                )}>
                                                                    {active ? <Check size={12} /> : <Icon size={14} />}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className={cn("text-[12px] font-semibold", active ? "text-blue-900" : "text-slate-800")}>
                                                                        {t.label}
                                                                    </p>
                                                                    <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
                                                                        {t.description}
                                                                    </p>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Instruction */}
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <SectionEyebrow accent="slate">Help text</SectionEyebrow>
                                <Textarea
                                    value={draft.instruction}
                                    onChange={e => up({ instruction: e.target.value })}
                                    placeholder="Optional guidance shown under the field on the applicant's form."
                                    className="min-h-[80px]"
                                />
                            </div>
                        </div>

                        {/* RIGHT PANE — Type-specific settings + visibility */}
                        <div className="space-y-4">
                            {/* Choice options */}
                            {usesOptions && (
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <SectionEyebrow accent="blue">
                                        {draft.type === 'bullet-list' ? 'Bullet points' : 'Choice options'}
                                    </SectionEyebrow>
                                    <OptionsEditor
                                        options={draft.options}
                                        onChange={(opts) => up({ options: opts })}
                                        label={draft.type === 'bullet-list' ? 'Bullet points' : 'Choices'}
                                        addLabel={draft.type === 'bullet-list' ? 'Add bullet' : 'Add option'}
                                        help={
                                            draft.type === 'select'    ? "Each option appears as one row in the dropdown."
                                            : draft.type === 'radio'    ? "Each option appears as one radio button."
                                            : draft.type === 'checklist' ? "Each option becomes one checkbox the applicant can tick."
                                            : "Each entry appears as one bullet."
                                        }
                                    />
                                </div>
                            )}

                            {/* Subform picker */}
                            {draft.type === 'subform-button' && (
                                <div className="rounded-xl border border-violet-200 bg-violet-50/30 p-4">
                                    <SectionEyebrow accent="violet">Linked subform <span className="text-rose-600">*</span></SectionEyebrow>
                                    <select
                                        value={draft.subformId ?? ''}
                                        onChange={e => {
                                            const sub = subforms.find(s => s.id === e.target.value);
                                            up({
                                                subformId: e.target.value,
                                                label: sub?.buttonName || sub?.name || draft.label,
                                            });
                                        }}
                                        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="">— Pick a subform —</option>
                                        {subforms.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}{s.buttonName ? ` · "${s.buttonName}"` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {linkedSubform && (
                                        <p className="mt-2 rounded-md bg-white/70 px-3 py-2 text-[11px] text-slate-600">
                                            Button label on the form: <span className="font-semibold text-slate-900">{draft.label || linkedSubform.buttonName || linkedSubform.name}</span>
                                        </p>
                                    )}
                                    {subforms.length === 0 && (
                                        <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
                                            No subforms exist yet. Add one from the Subforms tab first.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Document Type picker — required for `document` fields */}
                            {draft.type === 'document' && (
                                <DocumentTypeConfig
                                    documentTypeId={draft.documentTypeId}
                                    currentLabel={draft.label}
                                    onPick={({ documentTypeId, label }) => up({
                                        documentTypeId: documentTypeId || undefined,
                                        label,
                                    })}
                                />
                            )}

                            {/* Date inputs position — above or below the Upload widget */}
                            {draft.type === 'document' && (
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <SectionEyebrow accent="blue">Date inputs position</SectionEyebrow>
                                    <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
                                        {([
                                            { v: 'below', label: 'Below upload' },
                                            { v: 'above', label: 'Above upload' },
                                        ] as const).map(o => {
                                            const active = (draft.metaPosition ?? 'below') === o.v;
                                            return (
                                                <button
                                                    key={o.v}
                                                    type="button"
                                                    onClick={() => up({ metaPosition: o.v })}
                                                    className={cn(
                                                        "px-3 py-1.5 text-[12px] font-medium",
                                                        active ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50",
                                                    )}
                                                >
                                                    {o.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="mt-1.5 text-[11px] text-slate-500">
                                        Whether expiry / issue-date / state / country render above or below the Upload widget.
                                    </p>
                                </div>
                            )}

                            {/* Follow-up fields — toggle-only quick wizard */}
                            {draft.type === 'toggle' && onAddRelated && (
                                <FollowUpFieldsConfig
                                    toggleField={draft}
                                    allFields={allFields}
                                    onAddFollowUp={(newField) => onAddRelated(draft, newField)}
                                />
                            )}

                            {/* Visibility / conditional reveal */}
                            {def.supportsShowWhen && (
                                <VisibilityConfig
                                    field={draft}
                                    allFields={allFields}
                                    onChange={(showWhen) => up({ showWhen })}
                                />
                            )}

                            {/* Empty-state hint when no right-pane sections apply */}
                            {!usesOptions
                                && draft.type !== 'subform-button'
                                && draft.type !== 'document'
                                && draft.type !== 'toggle'
                                && !def.supportsShowWhen && (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
                                    <p className="text-sm font-medium text-slate-600">No extra settings for this field type.</p>
                                    <p className="mt-1 text-[11px] text-slate-400">
                                        Switch to a different type on the left to unlock more options.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sticky footer */}
                <DialogFooter className="border-t border-slate-200 bg-white px-6 py-3">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        disabled={!canSave}
                        onClick={() => onSave({ ...draft, label: draft.label.trim() })}
                        className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                    >
                        Save Field
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/** A FieldCard made draggable for the builder list. The grip in its header is the handle. */
function SortableFieldCard(props: {
    field: FormField;
    dependents: FormField[];
    onEdit: () => void;
    onRemove: () => void;
    onEditDependent: (f: FormField) => void;
    onRemoveDependent: (f: FormField) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.field.id });
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
        zIndex: isDragging ? 10 : undefined,
    };
    return (
        <div ref={setNodeRef} style={style}>
            <FieldCard {...props} dragHandleProps={{ ...attributes, ...listeners }} />
        </div>
    );
}

export function FormFieldsEditor({ fields, onChange }: {
    fields: FormField[];
    onChange: (fields: FormField[]) => void;
}) {
    const [editing, setEditing] = useState<FormField | null>(null);

    const removeField = (id: string) => onChange(fields.filter(f => f.id !== id));
    const addField = () => {
        const field = newFormField();
        onChange([...fields, field]);
        setEditing(field);
    };
    const saveField = (field: FormField) => {
        onChange(fields.map(f => f.id === field.id ? field : f));
        setEditing(null);
    };

    const dependentsByController = useMemo(() => {
        const m = new Map<string, FormField[]>();
        for (const f of fields) {
            if (!f.showWhen) continue;
            const list = m.get(f.showWhen.fieldId) ?? [];
            list.push(f);
            m.set(f.showWhen.fieldId, list);
        }
        return m;
    }, [fields]);
    const topLevel = useMemo(() => fields.filter(f => !f.showWhen), [fields]);
    const topLevelIds = topLevel.map(f => f.id);
    const rows = useMemo(
        () => chunkFieldRows(topLevel, (f) => (dependentsByController.get(f.id)?.length ?? 0) > 0),
        [topLevel, dependentsByController],
    );

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const onDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        const oldIndex = topLevelIds.indexOf(String(active.id));
        const newIndex = topLevelIds.indexOf(String(over.id));
        if (oldIndex < 0 || newIndex < 0) return;
        const newOrder = arrayMove(topLevel, oldIndex, newIndex);
        // Rebuild the flat list: each controller immediately followed by its dependents.
        const next: FormField[] = [];
        for (const f of newOrder) {
            next.push(f);
            for (const dep of dependentsByController.get(f.id) ?? []) next.push(dep);
        }
        // Safeguard: keep any orphan dependents whose controller isn't top-level.
        for (const f of fields) if (!next.includes(f)) next.push(f);
        onChange(next);
    };

    const renderCard = (f: FormField) => (
        <SortableFieldCard
            key={f.id}
            field={f}
            dependents={dependentsByController.get(f.id) ?? []}
            onEdit={() => setEditing(f)}
            onRemove={() => removeField(f.id)}
            onEditDependent={(dep) => setEditing(dep)}
            onRemoveDependent={(dep) => removeField(dep.id)}
        />
    );

    return (
        <div className="space-y-3">
            {fields.length === 0 && (
                <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-3 text-center text-[12px] text-slate-400">
                    No fields yet — add the first field below.
                </div>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={topLevelIds} strategy={rectSortingStrategy}>
                    <div className="space-y-3">
                        {rows.map((row) =>
                            row.length === 2 ? (
                                <div key={row[0].id} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {row.map(renderCard)}
                                </div>
                            ) : (
                                renderCard(row[0])
                            ),
                        )}
                    </div>
                </SortableContext>
            </DndContext>
            <button
                type="button"
                onClick={addField}
                className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50/50 px-3.5 py-2 text-[12px] font-semibold text-blue-600 hover:bg-blue-50"
            >
                <Plus size={14} /> Add field
            </button>

            {editing && (
                <FieldSettingsModal
                    field={editing}
                    allFields={fields}
                    onSave={saveField}
                    onAddRelated={(currentDraft, newDependent) => {
                        // Save the current toggle's edits AND append the new follow-up field with showWhen wired in.
                        const updated = fields.map(f => f.id === currentDraft.id ? currentDraft : f);
                        const next = [...updated, newDependent];
                        onChange(next);
                        // Switch the modal to edit the freshly-added follow-up field.
                        setEditing(newDependent);
                    }}
                    onClose={() => setEditing(null)}
                />
            )}
        </div>
    );
}
