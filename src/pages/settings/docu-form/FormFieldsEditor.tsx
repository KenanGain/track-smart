import { useState } from 'react';
import { Plus, Trash2, Pencil, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    FORM_FIELD_TYPES, OPTION_FIELD_TYPES, newFormField,
    type FormField, type FormFieldType,
} from '@/pages/ats/application-forms.data';

/**
 * Flat field builder for a form — each field renders as it appears on the
 * real form, with edit / delete actions. No steps; a form is one field list.
 */

const PREVIEW_INPUT = 'pointer-events-none w-full rounded-md border border-slate-300 bg-slate-50 text-sm';

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
        case 'document':
            return (
                <div className="flex items-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-400">
                    <Upload size={14} /> Upload document
                </div>
            );
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
function FieldHeader({ field, onEdit, onRemove, condensed }: {
    field: FormField;
    onEdit: () => void;
    onRemove: () => void;
    condensed?: boolean;
}) {
    return (
        <div className="mb-2 flex items-center gap-2">
            <label className={cn(
                "flex-1 font-semibold uppercase tracking-wide text-slate-600",
                condensed ? "text-[11px]" : "text-[12px]",
            )}>
                {field.label || 'Untitled field'}
                {field.required && <span className="text-rose-500"> *</span>}
            </label>
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
function FieldCard({ field, dependents, onEdit, onRemove, onEditDependent, onRemoveDependent }: {
    field: FormField;
    dependents: FormField[];
    onEdit: () => void;
    onRemove: () => void;
    onEditDependent: (f: FormField) => void;
    onRemoveDependent: (f: FormField) => void;
}) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4 hover:border-blue-300">
            <FieldHeader field={field} onEdit={onEdit} onRemove={onRemove} />
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

function FieldSettingsModal({ field, allFields, onSave, onClose }: {
    field: FormField;
    allFields: FormField[];
    onSave: (field: FormField) => void;
    onClose: () => void;
}) {
    const [draft, setDraft] = useState(field);
    const up = (patch: Partial<FormField>) => setDraft(d => ({ ...d, ...patch }));
    const usesOptions = OPTION_FIELD_TYPES.includes(draft.type);
    const toggleCandidates = allFields.filter(f => f.type === 'toggle' && f.id !== draft.id);

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Field settings</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Label <span className="text-rose-500">*</span>
                        </label>
                        <Input value={draft.label} onChange={e => up({ label: e.target.value })} />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Type</label>
                        <select
                            value={draft.type}
                            onChange={e => up({ type: e.target.value as FormFieldType })}
                            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            {FORM_FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    {usesOptions && (
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Options</label>
                            <Input
                                value={draft.options.join(', ')}
                                onChange={e => up({ options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                placeholder="Comma-separated choices"
                            />
                        </div>
                    )}
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Instruction / help text
                        </label>
                        <Textarea
                            value={draft.instruction}
                            onChange={e => up({ instruction: e.target.value })}
                            placeholder="Optional help text shown under the field."
                            className="min-h-[56px]"
                        />
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
                        <input
                            type="checkbox"
                            checked={draft.required}
                            onChange={e => up({ required: e.target.checked })}
                            className="h-4 w-4 accent-blue-600"
                        />
                        <span className="text-sm font-medium text-slate-700">Required field</span>
                    </label>

                    {toggleCandidates.length > 0 && (
                        <div className="rounded-md border border-slate-200 px-3 py-2">
                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={!!draft.showWhen}
                                    onChange={(e) => up({
                                        showWhen: e.target.checked
                                            ? { fieldId: toggleCandidates[0].id, equals: true }
                                            : undefined,
                                    })}
                                    className="h-4 w-4 accent-blue-600"
                                />
                                <span className="text-sm font-medium text-slate-700">
                                    Show only when a toggle is on
                                </span>
                            </label>
                            {draft.showWhen && (
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <select
                                        value={draft.showWhen.fieldId}
                                        onChange={(e) => up({ showWhen: { ...draft.showWhen!, fieldId: e.target.value } })}
                                        className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
                                    >
                                        {toggleCandidates.map(t => (
                                            <option key={t.id} value={t.id}>{t.label || 'Untitled toggle'}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={String(draft.showWhen.equals)}
                                        onChange={(e) => up({ showWhen: { ...draft.showWhen!, equals: e.target.value === 'true' } })}
                                        className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
                                    >
                                        <option value="true">is ON</option>
                                        <option value="false">is OFF</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        disabled={draft.label.trim().length === 0}
                        onClick={() => onSave({ ...draft, label: draft.label.trim() })}
                    >
                        Save Field
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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

    return (
        <div className="space-y-3">
            {fields.length === 0 && (
                <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-3 text-center text-[12px] text-slate-400">
                    No fields yet — add the first field below.
                </div>
            )}
            {(() => {
                const dependentsByController = new Map<string, FormField[]>();
                for (const f of fields) {
                    if (!f.showWhen) continue;
                    const list = dependentsByController.get(f.showWhen.fieldId) ?? [];
                    list.push(f);
                    dependentsByController.set(f.showWhen.fieldId, list);
                }
                return fields
                    .filter(f => !f.showWhen)
                    .map(f => (
                        <FieldCard
                            key={f.id}
                            field={f}
                            dependents={dependentsByController.get(f.id) ?? []}
                            onEdit={() => setEditing(f)}
                            onRemove={() => removeField(f.id)}
                            onEditDependent={(dep) => setEditing(dep)}
                            onRemoveDependent={(dep) => removeField(dep.id)}
                        />
                    ));
            })()}
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
                    onClose={() => setEditing(null)}
                />
            )}
        </div>
    );
}
