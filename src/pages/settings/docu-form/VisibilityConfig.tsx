import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toggle } from '@/components/ui/toggle';
import type { FormField, FormFieldType } from '@/pages/ats/application-forms.data';

/**
 * Reusable visibility configuration component used by the field-settings modal.
 *
 * Captures the "Show only when …" rule for any field — picks a controlling field
 * and the answer that triggers visibility. Controllers can be a toggle (ON/OFF),
 * a select/radio (a specific option), or a checklist (when the selection includes
 * a specific option). When no controller is selected, the field is always visible.
 */

/** Field types that can drive a conditional reveal. */
const CONTROLLER_TYPES: FormFieldType[] = ['toggle', 'select', 'radio', 'checklist'];

export function VisibilityConfig({ field, allFields, onChange }: {
    field: FormField;
    /** All fields on the same form, so we can offer controller candidates. */
    allFields: FormField[];
    onChange: (showWhen: FormField['showWhen']) => void;
}) {
    const candidates = allFields.filter(f => CONTROLLER_TYPES.includes(f.type) && f.id !== field.id);
    const has = !!field.showWhen;
    const controller = field.showWhen ? candidates.find(c => c.id === field.showWhen!.fieldId) : undefined;
    const isToggleCtl = !controller || controller.type === 'toggle';
    const equalsBool = typeof field.showWhen?.equals === 'boolean' ? field.showWhen.equals : true;
    const equalsStr = typeof field.showWhen?.equals === 'string' ? field.showWhen.equals : '';

    /** Default rule for a freshly-picked controller — ON for toggles, first option otherwise. */
    const ruleFor = (c: FormField): FormField['showWhen'] =>
        c.type === 'toggle'
            ? { fieldId: c.id, equals: true }
            : { fieldId: c.id, equals: c.options?.[0] ?? '' };

    return (
        <div className={cn(
            "rounded-lg border p-3 transition-colors",
            has ? "border-amber-200 bg-amber-50/30" : "border-slate-200 bg-slate-50/40",
        )}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                    {has
                        ? <EyeOff size={14} className="mt-0.5 text-amber-600" />
                        : <Eye    size={14} className="mt-0.5 text-emerald-600" />}
                    <div>
                        <p className="text-sm font-medium text-slate-800">
                            {has ? 'Conditional visibility' : 'Always visible'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                            {has
                                ? 'This field appears only when the chosen question is answered a specific way.'
                                : 'Turn on to make this field appear only when another question on this form is answered a specific way.'}
                        </p>
                    </div>
                </div>
                <Toggle
                    checked={has}
                    onCheckedChange={(v) => {
                        if (!v) { onChange(undefined); return; }
                        if (candidates.length === 0) return;
                        onChange(ruleFor(candidates[0]));
                    }}
                />
            </div>

            {has && candidates.length === 0 && (
                <p className="mt-2 rounded-md bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700">
                    No question fields on this form yet — add a Yes/No toggle, dropdown, radio, or checklist first, then this field can depend on it.
                </p>
            )}

            {has && candidates.length > 0 && field.showWhen && (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Watch question
                        </label>
                        <select
                            value={field.showWhen.fieldId}
                            onChange={(e) => { const c = candidates.find(x => x.id === e.target.value); if (c) onChange(ruleFor(c)); }}
                            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                        >
                            {candidates.map(t => (
                                <option key={t.id} value={t.id}>
                                    {(t.label || 'Untitled field')}{t.type !== 'toggle' ? ` (${t.type})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            {isToggleCtl
                                ? 'Show this field when the answer is'
                                : controller?.type === 'checklist'
                                    ? 'Show when the selection includes'
                                    : 'Show when the answer is'}
                        </label>
                        {isToggleCtl ? (
                            <div className="inline-flex w-full overflow-hidden rounded-md border border-slate-300">
                                {[
                                    { v: true,  label: 'ON',  hint: 'Yes' },
                                    { v: false, label: 'OFF', hint: 'No' },
                                ].map(o => (
                                    <button
                                        key={o.label}
                                        type="button"
                                        onClick={() => onChange({ ...field.showWhen!, equals: o.v })}
                                        className={cn(
                                            "flex flex-1 flex-col items-center gap-0.5 px-3 py-1.5 transition-colors",
                                            equalsBool === o.v ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50",
                                        )}
                                    >
                                        <span className="text-[12px] font-semibold">{o.label}</span>
                                        <span className={cn("text-[9px] uppercase tracking-wide", equalsBool === o.v ? "text-blue-100" : "text-slate-400")}>
                                            {o.hint}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <select
                                value={equalsStr}
                                onChange={(e) => onChange({ ...field.showWhen!, equals: e.target.value })}
                                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                            >
                                {(controller?.options ?? []).length === 0 && <option value="">No options on that field</option>}
                                {(controller?.options ?? []).map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
