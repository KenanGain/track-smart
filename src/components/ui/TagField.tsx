import { useState } from 'react';
import { Tag, X, Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSafetyTags, tagColor, smartTagMatch, MAX_DOC_TAGS } from '@/pages/compliance/safety-tags.data';

/**
 * Reusable tag-chip input — matches the "New Compliance & Documents" document-tag UI:
 * removable coloured chips, an "N/5" counter, a "Search or add a tag…" field with a
 * suggestion dropdown over the shared safety-tag catalog, and free-text create + "+ Add".
 *
 * Self-manages the shared catalog (useSafetyTags) so callers only pass value + onChange.
 * Used for tagging individual document/photo uploads in the accident form and its detail
 * list, and anywhere else per-item document tagging is needed.
 */
export function TagField({ value, onChange, label = 'Tags', max = MAX_DOC_TAGS }: {
    value: string[];
    onChange: (tags: string[]) => void;
    label?: string;
    max?: number;
}) {
    const { tags: catalog, add: addToCatalog } = useSafetyTags();
    const [q, setQ] = useState('');
    const atMax = value.length >= max;
    const suggestions = (q.trim()
        ? catalog.filter(t => !value.includes(t) && smartTagMatch(q, t))
        : catalog.filter(t => !value.includes(t))
    ).slice(0, 8);
    const exists = catalog.some(t => t.toLowerCase() === q.trim().toLowerCase());
    const add = (t: string) => {
        const v = t.trim();
        if (!v || atMax || value.some(x => x.toLowerCase() === v.toLowerCase())) { setQ(''); return; }
        addToCatalog(v);
        onChange([...value, v]);
        setQ('');
    };
    const remove = (t: string) => onChange(value.filter(x => x !== t));
    return (
        <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    <Tag size={12} className="text-slate-400" />
                    <span className="text-[11px] font-semibold text-slate-500">{label}</span>
                </div>
                <span className={cn('text-[10px] font-bold tabular-nums', atMax ? 'text-amber-600' : 'text-slate-400')}>{value.length}/{max}</span>
            </div>
            {value.length > 0 && (
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {value.map(t => (
                        <span key={t} className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold', tagColor(t))}>
                            {t}
                            <button type="button" onClick={() => remove(t)} className="opacity-60 hover:opacity-100" title="Remove tag"><X size={10} /></button>
                        </span>
                    ))}
                </div>
            )}
            {atMax ? (
                <p className="text-[11px] font-medium text-amber-600">Maximum of {max} tags reached — remove one to add another.</p>
            ) : (
                <div className="relative">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={q} onChange={e => setQ(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(q); } }}
                                placeholder="Search or add a tag…"
                                className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                        </div>
                        <button type="button" onClick={() => add(q)} disabled={!q.trim()}
                            className={cn('inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-3.5 text-[13px] font-semibold transition-colors',
                                q.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'cursor-not-allowed border border-slate-200 bg-white text-slate-400')}>
                            <Plus size={14} /> Add
                        </button>
                    </div>
                    {q.trim() && (
                        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                            {suggestions.map(t => (
                                <button key={t} type="button" onMouseDown={e => { e.preventDefault(); add(t); }}
                                    className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left hover:bg-slate-50">
                                    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', tagColor(t))}>{t}</span>
                                </button>
                            ))}
                            {!exists && (
                                <button type="button" onMouseDown={e => { e.preventDefault(); add(q); }}
                                    className={cn('flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-[13px] font-semibold text-blue-700 hover:bg-blue-50', suggestions.length > 0 && 'mt-1 border-t border-slate-100 pt-2')}>
                                    <Plus size={12} /> Create “{q.trim()}”
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
