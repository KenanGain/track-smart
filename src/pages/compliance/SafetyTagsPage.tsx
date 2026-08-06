import { useState } from 'react';
import {
    Tags, Tag, Plus, Info, Search, Lock, X, Sparkles,
    Shield, FileText, Calendar, PieChart, Award, Bookmark, Layers, Hash, BadgeCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSafetyTags, isDefaultTag, smartTagMatch, DEFAULT_TAG_GROUPS } from '@/pages/compliance/safety-tags.data';

/**
 * Settings ▸ Tags — the reusable document-tag catalog for New Compliance & Documents,
 * shown as grouped cards. The default groups (Insurance, Policies, Driver Qualification, …)
 * are SYSTEM DEFAULTS: read-only, no add / remove. A single "Custom Tags" card is where the
 * carrier adds its own reusable tags. Everything feeds the "Add a saved tag…" dropdown.
 */

type Theme = 'slate' | 'blue' | 'emerald' | 'amber' | 'violet' | 'rose' | 'indigo' | 'cyan';
const THEME: Record<Theme, { head: string; dot: string }> = {
    slate: { head: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
    blue: { head: 'bg-blue-50 text-blue-600', dot: 'bg-blue-500' },
    emerald: { head: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500' },
    amber: { head: 'bg-amber-50 text-amber-600', dot: 'bg-amber-500' },
    violet: { head: 'bg-violet-50 text-violet-600', dot: 'bg-violet-500' },
    rose: { head: 'bg-rose-50 text-rose-600', dot: 'bg-rose-500' },
    indigo: { head: 'bg-indigo-50 text-indigo-600', dot: 'bg-indigo-500' },
    cyan: { head: 'bg-cyan-50 text-cyan-600', dot: 'bg-cyan-500' },
};

// Icon + theme + description per default group (keyed by the group title in DEFAULT_TAG_GROUPS).
type GroupMeta = { Icon: typeof Shield; theme: Theme; description: string };
const GROUP_META: Record<string, GroupMeta> = {
    'Status & Handling': { Icon: BadgeCheck, theme: 'slate', description: 'General document status & handling tags.' },
    'Insurance': { Icon: Shield, theme: 'blue', description: 'Insurance document classification tags.' },
    'Policies and Procedures': { Icon: FileText, theme: 'emerald', description: 'Policy document types used in your organization.' },
    'Document Year': { Icon: Calendar, theme: 'amber', description: 'Document year attribute.' },
    'Quarter': { Icon: PieChart, theme: 'violet', description: 'Applicable quarters.' },
    'CVOR Level': { Icon: Award, theme: 'rose', description: 'Compliance level.' },
    'Compliance & Safety': { Icon: Bookmark, theme: 'indigo', description: 'Tag documents by their compliance or safety program.' },
    'Driver Qualification': { Icon: Tag, theme: 'cyan', description: 'Driver qualification file document tags.' },
    'Permits & Authority': { Icon: Layers, theme: 'blue', description: 'Operating authority, permits and registrations.' },
    'Tax & Financial': { Icon: Hash, theme: 'emerald', description: 'Tag tax, billing and financial documents.' },
};
const FALLBACK_META: GroupMeta = { Icon: Tag, theme: 'slate', description: '' };

export function SafetyTagsPage() {
    const { tags, add, remove } = useSafetyTags();
    const [search, setSearch] = useState('');

    const q = search.trim();
    const custom = tags.filter(t => !isDefaultTag(t));
    const filterTags = (list: string[]) => (q ? list.filter(t => smartTagMatch(q, t)) : list);
    const shownCustom = filterTags(custom);
    const shownGroups = DEFAULT_TAG_GROUPS
        .map(g => ({ ...g, shown: filterTags(g.tags) }))
        .filter(g => g.shown.length > 0);

    return (
        <div className="flex-1 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-5">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Tags size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Tags</h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Reusable document tags for New Compliance &amp; Documents, grouped by type — {tags.length} tag{tags.length === 1 ? '' : 's'}.
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-8 py-6 space-y-5">
                <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-[13px] text-blue-800">
                    <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
                    <p>
                        The grouped sections below are <strong>system defaults</strong> — always available and not editable. Add your carrier’s
                        own tags in the <strong>Custom Tags</strong> card; all of them appear in the <strong>“Add a saved tag…”</strong> dropdown on every document and dated version.
                    </p>
                </div>

                {/* Search */}
                <div className="relative w-full sm:max-w-sm">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search tags across groups…"
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                </div>

                {/* Custom tags — the one editable card (carrier profile) */}
                {(!q || shownCustom.length > 0) && (
                    <CustomTagsCard tags={shownCustom} totalCustom={custom.length} searching={!!q} onAdd={add} onRemove={remove} />
                )}

                {/* System default groups */}
                {shownGroups.length > 0 && (
                    <>
                        <div className="flex items-center gap-2 pt-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">System default groups</span>
                            <span className="text-[11px] font-semibold text-slate-400">({shownGroups.length})</span>
                            <div className="flex-1 h-px bg-slate-200" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 items-start">
                            {shownGroups.map(g => {
                                const meta = GROUP_META[g.title] ?? FALLBACK_META;
                                return <DefaultGroupCard key={g.title} title={g.title} description={meta.description} Icon={meta.Icon} theme={meta.theme} tags={g.shown} />;
                            })}
                        </div>
                    </>
                )}

                {q && shownGroups.length === 0 && shownCustom.length === 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500">
                        No tags match “{search}”.
                    </div>
                )}
            </div>
        </div>
    );
}

// ── System-default group card (read-only) ─────────────────────────────
function DefaultGroupCard({ title, description, Icon, theme, tags }: {
    title: string; description: string; Icon: typeof Shield; theme: Theme; tags: string[];
}) {
    const t = THEME[theme];
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md', t.head)}><Icon size={16} /></span>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">{title}</p>
                        {description && <p className="mt-0.5 text-[12px] text-slate-500">{description}</p>}
                    </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400" title="System default — not editable">
                    <Lock size={10} /> Default
                </span>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                <div className="flex flex-wrap gap-1.5">
                    {tags.map(label => (
                        <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700">
                            <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} /> {label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Custom tags card (editable — carrier's own tags) ──────────────────
function CustomTagsCard({ tags, totalCustom, searching, onAdd, onRemove }: {
    tags: string[]; totalCustom: number; searching: boolean;
    onAdd: (t: string) => void; onRemove: (t: string) => void;
}) {
    const [draft, setDraft] = useState('');
    const trimmed = draft.trim();
    const isDup = !!trimmed && (isDefaultTag(trimmed) || tags.some(t => t.toLowerCase() === trimmed.toLowerCase()));
    const canAdd = !!trimmed && !isDup;
    const submit = () => { if (!canAdd) return; onAdd(trimmed); setDraft(''); };

    return (
        <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm ring-1 ring-blue-500/10">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white"><Sparkles size={16} /></span>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">Custom Tags</p>
                        <p className="mt-0.5 text-[12px] text-slate-500">Your carrier’s own reusable tags — added here for this profile.</p>
                    </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-600">
                    Custom · {totalCustom}
                </span>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                {tags.length === 0 ? (
                    <p className="text-[12px] italic text-slate-400">{searching ? 'No custom tags match your search.' : 'No custom tags yet — add one below.'}</p>
                ) : (
                    <div className="flex flex-wrap gap-1.5">
                        {tags.map(label => (
                            <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/60 px-2.5 py-1 text-[12px] font-medium text-blue-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> {label}
                                <button type="button" onClick={() => { if (window.confirm(`Remove the tag “${label}”?`)) onRemove(label); }} title={`Remove ${label}`} className="text-blue-400 hover:text-rose-600">
                                    <X size={12} />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {!searching && (
                <>
                    <div className="mt-3 flex items-center gap-2">
                        <div className="relative flex-1">
                            <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={draft}
                                onChange={e => setDraft(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
                                placeholder="Add a custom tag… e.g. Amended, Board Approved"
                                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                            />
                        </div>
                        <button type="button" onClick={submit} disabled={!canAdd}
                            className={cn('inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold transition-colors',
                                canAdd ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed')}>
                            <Plus size={15} /> Add Tag
                        </button>
                    </div>
                    {isDup && <p className="mt-1.5 text-[12px] text-amber-600">“{trimmed}” already exists{isDefaultTag(trimmed) ? ' as a system default' : ''}.</p>}
                </>
            )}
        </div>
    );
}
