import { useState } from 'react';
import {
    Shield, FileText, Calendar, PieChart, Award, Tag as TagIcon, Bookmark, Layers, Hash,
    Plus, X, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    loadTagSections, saveTagSections, newTagSection, newTag,
    type DocTagSection, type TagColorTheme, type TagIconName,
} from './document-tags.data';

/**
 * Document Tags — sectioned tag library used to classify Document Types.
 *
 * Each section is a card with:
 *  • icon + title + description (header)
 *  • chips for the section's tags (× to remove)
 *  • inline "Add new tag…" input + Add Tag button (unless custom tags are disabled)
 *
 * The page header's `+ Add Document Tag` button is parent-controlled via the
 * `externalAdding` prop, so the same view fits inside the Beta page and the
 * Super Admin → Compliance and Documents page without each duplicating the button.
 */

const ICON_MAP: Record<TagIconName, React.ComponentType<{ size?: number; className?: string }>> = {
    Shield, FileText, Calendar, PieChart, Award, Tag: TagIcon, Bookmark, Layers, Hash,
};

const ICON_OPTIONS: TagIconName[] = ['Shield', 'FileText', 'Calendar', 'PieChart', 'Award', 'Tag', 'Bookmark', 'Layers', 'Hash'];

const COLOR_THEMES: { id: TagColorTheme; bg: string; ring: string; dot: string }[] = [
    { id: 'blue',    bg: 'bg-blue-50',    ring: 'ring-blue-400',    dot: 'bg-blue-500' },
    { id: 'emerald', bg: 'bg-emerald-50', ring: 'ring-emerald-400', dot: 'bg-emerald-500' },
    { id: 'amber',   bg: 'bg-amber-50',   ring: 'ring-amber-400',   dot: 'bg-amber-500' },
    { id: 'violet',  bg: 'bg-violet-50',  ring: 'ring-violet-400',  dot: 'bg-violet-500' },
    { id: 'rose',    bg: 'bg-rose-50',    ring: 'ring-rose-400',    dot: 'bg-rose-500' },
    { id: 'indigo',  bg: 'bg-indigo-50',  ring: 'ring-indigo-400',  dot: 'bg-indigo-500' },
    { id: 'cyan',    bg: 'bg-cyan-50',    ring: 'ring-cyan-400',    dot: 'bg-cyan-500' },
];

const THEME_HEADER_BG: Record<TagColorTheme, string> = {
    blue:    'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber:   'bg-amber-50 text-amber-600',
    violet:  'bg-violet-50 text-violet-600',
    rose:    'bg-rose-50 text-rose-600',
    indigo:  'bg-indigo-50 text-indigo-600',
    cyan:    'bg-cyan-50 text-cyan-600',
};

const THEME_DOT: Record<TagColorTheme, string> = {
    blue:    'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber:   'bg-amber-500',
    violet:  'bg-violet-500',
    rose:    'bg-rose-500',
    indigo:  'bg-indigo-500',
    cyan:    'bg-cyan-500',
};

// ── Section card ──────────────────────────────────────────────────────

function SectionCard({ section, onChange, onRemoveSection }: {
    section: DocTagSection;
    onChange: (next: DocTagSection) => void;
    onRemoveSection: () => void;
}) {
    const [draft, setDraft] = useState('');
    const Icon = ICON_MAP[section.icon];
    const dotClass = THEME_DOT[section.colorTheme];
    const headerBg = THEME_HEADER_BG[section.colorTheme];

    const addTag = () => {
        const v = draft.trim();
        if (!v) return;
        if (section.tags.some(t => t.label.toLowerCase() === v.toLowerCase())) {
            setDraft('');
            return;
        }
        onChange({ ...section, tags: [...section.tags, newTag(v)] });
        setDraft('');
    };

    const removeTag = (id: string) => {
        if (!section.allowCustomTags) return; // fixed tags can't be removed
        onChange({ ...section, tags: section.tags.filter(t => t.id !== id) });
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            {/* Header */}
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-md", headerBg)}>
                        <Icon size={16} />
                    </span>
                    <div>
                        <p className="text-sm font-bold text-slate-900">{section.title}</p>
                        <p className="mt-0.5 text-[12px] text-slate-500">{section.description}</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onRemoveSection}
                    className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    title="Remove section"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Tag chips */}
            <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                {section.tags.length === 0 ? (
                    <p className="text-[12px] italic text-slate-400">No tags yet.</p>
                ) : (
                    <div className="flex flex-wrap gap-1.5">
                        {section.tags.map(t => (
                            <span
                                key={t.id}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700"
                            >
                                <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
                                {t.label}
                                {section.allowCustomTags && (
                                    <button
                                        type="button"
                                        onClick={() => removeTag(t.id)}
                                        className="text-slate-400 hover:text-rose-600"
                                        title={`Remove ${t.label}`}
                                    >
                                        <X size={11} />
                                    </button>
                                )}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Add new tag — only when section allows custom tags */}
            {section.allowCustomTags ? (
                <div className="mt-3 flex items-center gap-2">
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                        placeholder="Add new tag..."
                        className="h-9 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <Button
                        size="sm"
                        onClick={addTag}
                        disabled={!draft.trim()}
                        variant="outline"
                        className="gap-1.5"
                    >
                        <Plus size={14} /> Add Tag
                    </Button>
                </div>
            ) : (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] italic text-slate-400">
                    <Info size={11} /> Custom tags are disabled for this section.
                </p>
            )}
        </div>
    );
}

// ── Create New Section modal ──────────────────────────────────────────

function CreateSectionModal({ onSave, onClose }: {
    onSave: (s: DocTagSection) => void;
    onClose: () => void;
}) {
    const [draft, setDraft] = useState<DocTagSection>(newTagSection());
    const up = (p: Partial<DocTagSection>) => setDraft(d => ({ ...d, ...p }));
    const canSave = draft.title.trim().length > 0;

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Create New Section</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Section Title */}
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                            Section Title <span className="text-rose-500">*</span>
                        </label>
                        <input
                            autoFocus
                            value={draft.title}
                            onChange={(e) => up({ title: e.target.value })}
                            placeholder="e.g. Department"
                            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Description</label>
                        <input
                            value={draft.description}
                            onChange={(e) => up({ description: e.target.value })}
                            placeholder="Short description..."
                            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    {/* Icon picker */}
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Icon</label>
                        <div className="flex flex-wrap gap-2">
                            {ICON_OPTIONS.map(name => {
                                const Icon = ICON_MAP[name];
                                const active = draft.icon === name;
                                return (
                                    <button
                                        key={name}
                                        type="button"
                                        onClick={() => up({ icon: name })}
                                        className={cn(
                                            "flex h-9 w-9 items-center justify-center rounded-md border bg-white transition-colors",
                                            active
                                                ? "border-blue-500 text-blue-600 ring-2 ring-blue-200"
                                                : "border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-blue-50/30",
                                        )}
                                        title={name}
                                    >
                                        <Icon size={16} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Color theme picker */}
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Bubble Color Theme</label>
                        <div className="flex flex-wrap gap-2">
                            {COLOR_THEMES.map(t => {
                                const active = draft.colorTheme === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => up({ colorTheme: t.id })}
                                        className={cn(
                                            "relative flex h-7 w-7 items-center justify-center rounded-full transition-all",
                                            active ? "ring-2 ring-offset-2 " + t.ring : "",
                                        )}
                                        title={t.id}
                                    >
                                        <span className={cn("h-6 w-6 rounded-full", t.dot)} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="flex items-center gap-6">
                        <label className="inline-flex cursor-pointer items-center gap-2">
                            <Toggle checked={draft.multiSelect} onCheckedChange={(v) => up({ multiSelect: v })} />
                            <span className="text-sm font-medium text-slate-700">Multi-select</span>
                        </label>
                        <label className="inline-flex cursor-pointer items-center gap-2">
                            <Toggle checked={draft.allowCustomTags} onCheckedChange={(v) => up({ allowCustomTags: v })} />
                            <span className="text-sm font-medium text-slate-700">Allow Custom Tags</span>
                        </label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        disabled={!canSave}
                        onClick={() => onSave({ ...draft, title: draft.title.trim() })}
                        className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                    >
                        Create Section
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── DocumentTagsView ──────────────────────────────────────────────────

export function DocumentTagsView({ externalAdding, onExternalAddingChange }: {
    externalAdding?: boolean;
    onExternalAddingChange?: (next: boolean) => void;
} = {}) {
    const [sections, setSections] = useState<DocTagSection[]>(loadTagSections);
    const [internalAdding, setInternalAdding] = useState(false);
    const adding = externalAdding ?? internalAdding;
    const setAdding = (v: boolean) => {
        if (onExternalAddingChange) onExternalAddingChange(v);
        else setInternalAdding(v);
    };

    const commit = (next: DocTagSection[]) => {
        setSections(next);
        saveTagSections(next);
    };

    const updateSection = (next: DocTagSection) =>
        commit(sections.map(s => s.id === next.id ? next : s));

    const removeSection = (id: string) => {
        if (!window.confirm('Remove this section?')) return;
        commit(sections.filter(s => s.id !== id));
    };

    const addSection = (s: DocTagSection) => {
        commit([...sections, s]);
        setAdding(false);
    };

    return (
        <div className="space-y-4">
            {sections.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
                    <p className="text-sm font-medium text-slate-700">No tag sections yet</p>
                    <p className="mt-1 text-[12px] text-slate-500">
                        Click <span className="font-semibold text-slate-700">Add Document Tag</span> in the header to create your first section.
                    </p>
                </div>
            ) : (
                sections.map(s => (
                    <SectionCard
                        key={s.id}
                        section={s}
                        onChange={updateSection}
                        onRemoveSection={() => removeSection(s.id)}
                    />
                ))
            )}

            {adding && (
                <CreateSectionModal
                    onSave={addSection}
                    onClose={() => setAdding(false)}
                />
            )}
        </div>
    );
}
