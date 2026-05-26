import { Plus, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Reusable options editor for choice-style field types (select / radio / checklist / bullet-list).
 *
 * Each option is a one-line input with a remove button and reorder arrows.
 * "Add option" appends a new blank entry. Replaces the old comma-separated
 * text input — friendlier and avoids the "what if my option has a comma"
 * footgun.
 */
export function OptionsEditor({ options, onChange, label = 'Options', addLabel = 'Add option', help }: {
    options: string[];
    onChange: (next: string[]) => void;
    label?: string;
    addLabel?: string;
    help?: string;
}) {
    const update = (i: number, v: string) => onChange(options.map((o, idx) => idx === i ? v : o));
    const remove = (i: number) => onChange(options.filter((_, idx) => idx !== i));
    const add = () => onChange([...options, '']);
    const move = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= options.length) return;
        const next = [...options];
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
    };

    return (
        <div>
            <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-800">{label}</label>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    {options.length} option{options.length === 1 ? '' : 's'}
                </span>
            </div>
            <div className="space-y-2">
                {options.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
                        <p className="text-sm text-slate-500">No options yet</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                            Click "{addLabel}" below to add your first one.
                        </p>
                    </div>
                )}
                {options.map((opt, i) => (
                    <div key={i} className="group flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-slate-300">
                        <GripVertical size={14} className="shrink-0 text-slate-300" />
                        <span className="w-5 text-center text-[11px] font-semibold text-slate-400">{i + 1}</span>
                        <input
                            value={opt}
                            onChange={(e) => update(i, e.target.value)}
                            placeholder={`Option ${i + 1}`}
                            className="h-9 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm text-slate-800 focus:border-blue-400 focus:bg-blue-50/30 focus:outline-none focus:ring-1 focus:ring-blue-200"
                        />
                        <div className="flex shrink-0 items-center gap-0.5">
                            <button
                                type="button"
                                onClick={() => move(i, -1)}
                                disabled={i === 0}
                                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
                                title="Move up"
                            >▴</button>
                            <button
                                type="button"
                                onClick={() => move(i, 1)}
                                disabled={i === options.length - 1}
                                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
                                title="Move down"
                            >▾</button>
                            <button
                                type="button"
                                onClick={() => remove(i)}
                                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                title="Remove option"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <button
                type="button"
                onClick={add}
                className={cn(
                    "mt-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50/50 px-4 py-2",
                    "text-[12px] font-semibold text-blue-700 hover:bg-blue-50",
                )}
            >
                <Plus size={14} /> {addLabel}
            </button>
            {help && <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{help}</p>}
        </div>
    );
}
