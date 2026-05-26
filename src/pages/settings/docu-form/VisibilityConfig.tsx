import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toggle } from '@/components/ui/toggle';
import type { FormField } from '@/pages/ats/application-forms.data';

/**
 * Reusable visibility configuration component used by the field-settings modal.
 *
 * Captures the "Show only when …" rule for any field — picks a controlling
 * toggle field and the value (ON / OFF) that triggers visibility. When no
 * controller is selected, the field is always visible.
 */
export function VisibilityConfig({ field, allFields, onChange }: {
    field: FormField;
    /** All fields on the same form, so we can offer toggle candidates. */
    allFields: FormField[];
    onChange: (showWhen: FormField['showWhen']) => void;
}) {
    // Only toggle fields can be controllers — anything else makes the rule meaningless.
    const candidates = allFields.filter(f => f.type === 'toggle' && f.id !== field.id);
    const has = !!field.showWhen;
    const equalsBool = typeof field.showWhen?.equals === 'boolean' ? field.showWhen.equals : true;

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
                                ? 'This field appears only when the chosen toggle matches the chosen state.'
                                : 'Turn on to make this field appear only when a toggle on this form is in a specific state.'}
                        </p>
                    </div>
                </div>
                <Toggle
                    checked={has}
                    onCheckedChange={(v) => {
                        if (!v) { onChange(undefined); return; }
                        if (candidates.length === 0) return;
                        onChange({ fieldId: candidates[0].id, equals: true });
                    }}
                />
            </div>

            {has && candidates.length === 0 && (
                <p className="mt-2 rounded-md bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700">
                    No toggle fields on this form yet — add a toggle field first, then this field can depend on it.
                </p>
            )}

            {has && candidates.length > 0 && field.showWhen && (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Watch toggle
                        </label>
                        <select
                            value={field.showWhen.fieldId}
                            onChange={(e) => onChange({ ...field.showWhen!, fieldId: e.target.value })}
                            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                        >
                            {candidates.map(t => (
                                <option key={t.id} value={t.id}>{t.label || 'Untitled toggle'}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Show this field when the toggle is
                        </label>
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
                                        equalsBool === o.v
                                            ? "bg-blue-600 text-white"
                                            : "bg-white text-slate-600 hover:bg-slate-50",
                                    )}
                                >
                                    <span className="text-[12px] font-semibold">{o.label}</span>
                                    <span className={cn(
                                        "text-[9px] uppercase tracking-wide",
                                        equalsBool === o.v ? "text-blue-100" : "text-slate-400",
                                    )}>
                                        {o.hint}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
