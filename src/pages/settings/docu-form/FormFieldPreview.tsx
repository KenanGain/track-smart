import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StandardField } from '@/pages/ats/application-forms.data';

/**
 * Renders a single field the way it appears on the rendered form —
 * label + a non-interactive input by type. Shared by the builder's
 * collapsible step view and the print view.
 */

const BOX = 'rounded-md border border-slate-300 bg-white';

export function FieldPreview({ field }: { field: StandardField }) {
    const opts = field.options && field.options.length ? field.options : ['Option 1', 'Option 2'];

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
        case 'document':
            control = (
                <div className="inline-flex items-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-400">
                    <Upload size={14} /> Upload document
                </div>
            );
            break;
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
