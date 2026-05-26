import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STANDARD_FORM_STEPS } from '@/pages/ats/application-forms.data';
import { FieldPreview } from './FormFieldPreview';

/**
 * Read-only collapsible view of the standard Driver Application's 13 steps —
 * each step expands to show its fields rendered like the real form.
 */
export function StandardStepsView() {
    const [open, setOpen] = useState<Set<number>>(new Set([1]));

    const toggle = (id: number) => setOpen(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    return (
        <div className="space-y-2">
            {STANDARD_FORM_STEPS.map(step => {
                const expanded = open.has(step.id);
                return (
                    <div key={step.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <button
                            type="button"
                            onClick={() => toggle(step.id)}
                            className={cn(
                                'flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50',
                                expanded && 'border-b border-slate-100',
                            )}
                        >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                                {step.id}
                            </span>
                            <span className="flex-1 text-[13px] font-semibold uppercase tracking-wide text-slate-700">
                                {step.title}
                            </span>
                            <span className="text-[11px] text-slate-400">{step.fields.length} fields</span>
                            {expanded
                                ? <ChevronDown size={16} className="text-slate-400" />
                                : <ChevronRight size={16} className="text-slate-400" />}
                        </button>
                        {expanded && (
                            <div className="p-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {step.fields.map((f, i) => <FieldPreview key={i} field={f} />)}
                                </div>
                                {step.note && (
                                    <p className="mt-3 text-[11px] italic text-slate-400">{step.note}</p>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
