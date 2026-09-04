// ─────────────────────────────────────────────────────────────────────────────
// Chat picker — the `@` / `/` command palette above the AI-agent composer.
//
//   `@`  → tag a driver, an asset or a teammate (the live carrier roster, scrolled)
//   `/`  → pick a compliance / document record, or run one of the agent's tasks
//
// The parent owns the flat, ordered item list and the active index (so the composer's
// arrow keys / Enter drive it); this component only renders, groups and scrolls.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import {
    AtSign, Slash, X, User, Truck, Users, FileText, Hash, UploadCloud, CornerDownLeft,
    ArrowUp, ArrowDown, Search, ClipboardList, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type PickerMode = 'mention' | 'task';

/** A person / vehicle / teammate row. */
export interface PickerSubject {
    kind: 'driver' | 'asset' | 'contact';
    id: string;
    name: string;
    sub: string;
    initials: string;
    color: string;
    badge?: string;
    badgeTone?: string;
}

/** A compliance / document catalog row. */
export interface PickerCompliance {
    kind: 'compliance';
    id: string;
    name: string;
    sub: string;
    entity: string;
    category: string;
    needs: string[];
    hasDoc: boolean;
    custom?: boolean;
}

/** An agent task (slash command). */
export interface PickerTask {
    kind: 'task';
    id: string;
    name: string;
    sub: string;
    icon: LucideIcon;
    needsContact?: boolean;
}

export type PickerItem = PickerSubject | PickerCompliance | PickerTask;

const GROUP_LABEL: Record<PickerItem['kind'], string> = {
    driver: 'Drivers', asset: 'Assets', contact: 'Team & contacts',
    compliance: 'Compliances & documents', task: 'Agent tasks',
};
const GROUP_ICON: Record<PickerItem['kind'], LucideIcon> = {
    driver: User, asset: Truck, contact: Users, compliance: FileText, task: Slash,
};

const ENTITY_TONE: Record<string, string> = {
    Driver: 'bg-amber-100 text-amber-700',
    Asset: 'bg-indigo-100 text-indigo-700',
    Carrier: 'bg-emerald-100 text-emerald-700',
};

export interface PickerTab { id: string; label: string; count: number }

export function ChatPicker({
    mode, tabs, activeTab, onTab, items, activeIx, onActive, onPick, onClose, query, pendingLabel,
}: {
    mode: PickerMode;
    tabs: PickerTab[];
    activeTab: string;
    onTab: (id: string) => void;
    items: PickerItem[];
    activeIx: number;
    onActive: (ix: number) => void;
    onPick: (item: PickerItem) => void;
    onClose: () => void;
    query: string;
    /** "Send “Request a document” to…" — a task waiting on a recipient. */
    pendingLabel?: string;
}) {
    const listRef = useRef<HTMLDivElement>(null);

    // Keep the keyboard-selected row in view.
    useEffect(() => {
        const el = listRef.current?.querySelector<HTMLElement>(`[data-ix="${activeIx}"]`);
        el?.scrollIntoView({ block: 'nearest' });
    }, [activeIx]);

    return (
        <div className="absolute bottom-full left-0 z-40 mb-2 w-[min(34rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_48px_-12px_rgba(15,23,42,0.35)]">
            {/* Header — what you're picking + the live query */}
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-2">
                <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-lg',
                    mode === 'mention' ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-600')}>
                    {mode === 'mention' ? <AtSign size={13} /> : <Slash size={13} />}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-bold text-slate-700">
                        {pendingLabel ?? (mode === 'mention' ? 'Tag a driver, asset or teammate' : 'Pick a compliance record — or run a task')}
                    </p>
                </div>
                {query && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10.5px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
                        <Search size={10} /> {query}
                    </span>
                )}
                <button type="button" onClick={onClose} title="Close"
                    className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"><X size={14} /></button>
            </div>

            {/* Tabs */}
            {tabs.length > 1 && (
                <div className="flex items-center gap-1 border-b border-slate-100 px-2 py-1.5">
                    {tabs.map(t => (
                        <button
                            key={t.id} type="button" onClick={() => onTab(t.id)}
                            className={cn('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11.5px] font-bold transition-colors',
                                activeTab === t.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700')}
                        >
                            {t.label}
                            <span className={cn('rounded px-1 text-[9.5px] font-bold tabular-nums',
                                activeTab === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>{t.count}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Items */}
            <div ref={listRef} className="max-h-[19rem] overflow-y-auto overscroll-contain">
                {items.length === 0 ? (
                    <div className="px-3 py-8 text-center">
                        <p className="text-[12.5px] font-semibold text-slate-500">Nothing matches “{query}”.</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                            {mode === 'mention' ? 'Try a first name, a unit number or a role.' : 'Try a record name, a document or a number field.'}
                        </p>
                    </div>
                ) : items.map((item, ix) => {
                    const newGroup = ix === 0 || items[ix - 1].kind !== item.kind;
                    const on = ix === activeIx;
                    const GIcon = GROUP_ICON[item.kind];
                    return (
                        <div key={`${item.kind}-${item.id}`}>
                            {newGroup && (
                                <p className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-slate-100 bg-white/95 px-3 py-1.5 text-[9.5px] font-bold uppercase tracking-wider text-slate-400 backdrop-blur">
                                    <GIcon size={10} /> {GROUP_LABEL[item.kind]}
                                </p>
                            )}
                            <button
                                type="button"
                                data-ix={ix}
                                onMouseEnter={() => onActive(ix)}
                                onClick={() => onPick(item)}
                                className={cn('flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
                                    on ? 'bg-blue-50' : 'hover:bg-slate-50')}
                            >
                                {item.kind === 'compliance' ? (
                                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                        item.hasDoc ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500')}>
                                        {item.hasDoc ? <UploadCloud size={15} /> : <Hash size={15} />}
                                    </span>
                                ) : item.kind === 'task' ? (
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                                        <item.icon size={15} />
                                    </span>
                                ) : (
                                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white', item.color)}>
                                        {item.initials}
                                    </span>
                                )}

                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5">
                                        <span className={cn('min-w-0 truncate text-[12.5px] font-bold', on ? 'text-blue-800' : 'text-slate-800')}>
                                            {item.kind === 'task' ? `/${item.id}` : item.name}
                                        </span>
                                        {item.kind === 'task' && <span className="min-w-0 truncate text-[11.5px] font-medium text-slate-400">{item.name}</span>}
                                        {item.kind === 'compliance' && (
                                            <>
                                                <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide', ENTITY_TONE[item.entity] ?? 'bg-slate-100 text-slate-600')}>{item.entity}</span>
                                                {item.custom && <span className="shrink-0 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-700">Custom</span>}
                                            </>
                                        )}
                                        {'badge' in item && item.badge && (
                                            <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide', item.badgeTone ?? 'bg-slate-100 text-slate-600')}>{item.badge}</span>
                                        )}
                                    </span>
                                    <span className="block truncate text-[11px] text-slate-500">{item.sub}</span>
                                    {item.kind === 'compliance' && item.needs.length > 0 && (
                                        <span className="mt-0.5 flex flex-wrap gap-1">
                                            {item.needs.slice(0, 4).map(n => (
                                                <span key={n} className="rounded bg-slate-50 px-1.5 py-0.5 text-[9.5px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">{n}</span>
                                            ))}
                                            {item.needs.length > 4 && <span className="text-[9.5px] font-semibold text-slate-400">+{item.needs.length - 4}</span>}
                                        </span>
                                    )}
                                </span>

                                {item.kind === 'task' && item.needsContact && <AtSign size={13} className="shrink-0 text-slate-300" />}
                                {on && <CornerDownLeft size={13} className="shrink-0 text-blue-500" />}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Footer hints */}
            <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/80 px-3 py-1.5 text-[10px] font-semibold text-slate-400">
                <span className="inline-flex items-center gap-1"><ArrowUp size={10} /><ArrowDown size={10} /> move</span>
                <span className="inline-flex items-center gap-1"><CornerDownLeft size={10} /> select</span>
                {tabs.length > 1 && <span className="inline-flex items-center gap-1"><span className="rounded border border-slate-300 px-1 text-[9px]">Tab</span> switch</span>}
                <span className="inline-flex items-center gap-1"><span className="rounded border border-slate-300 px-1 text-[9px]">Esc</span> close</span>
                <span className="ml-auto inline-flex items-center gap-1 tabular-nums">{items.length} result{items.length === 1 ? '' : 's'}</span>
            </div>
        </div>
    );
}

/** The tag chips shown in the composer once a subject / record is picked. */
export function ComposerChips({ subject, record, onClearSubject, onClearRecord }: {
    subject?: PickerSubject | null;
    record?: PickerCompliance | null;
    onClearSubject: () => void;
    onClearRecord: () => void;
}) {
    if (!subject && !record) return null;
    return (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Context</span>
            {subject && (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-violet-50 py-0.5 pl-0.5 pr-1.5 ring-1 ring-inset ring-violet-200">
                    <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white', subject.color)}>{subject.initials}</span>
                    <span className="min-w-0 truncate text-[11.5px] font-bold text-violet-800">@{subject.name}</span>
                    <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-wide text-violet-400">{subject.kind}</span>
                    <button type="button" onClick={onClearSubject} title="Remove tag"
                        className="shrink-0 rounded-full p-0.5 text-violet-400 hover:bg-white hover:text-violet-700"><X size={11} /></button>
                </span>
            )}
            {record && (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-emerald-50 py-0.5 pl-1.5 pr-1.5 ring-1 ring-inset ring-emerald-200">
                    {record.hasDoc ? <UploadCloud size={12} className="shrink-0 text-emerald-600" /> : <ClipboardList size={12} className="shrink-0 text-emerald-600" />}
                    <span className="min-w-0 truncate text-[11.5px] font-bold text-emerald-800">{record.name}</span>
                    <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-wide text-emerald-500">{record.entity}</span>
                    <button type="button" onClick={onClearRecord} title="Remove record"
                        className="shrink-0 rounded-full p-0.5 text-emerald-500 hover:bg-white hover:text-emerald-800"><X size={11} /></button>
                </span>
            )}
        </div>
    );
}
