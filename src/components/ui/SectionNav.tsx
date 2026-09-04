// ─────────────────────────────────────────────────────────────────────────────
// SectionNav — the "Jump to section" rail from the Ticket / Accident detail
// pages, lifted into a shared component so any long stacked-card page can use it.
//
//   • desktop: a sticky right-hand card listing every section, with scroll-spy
//     highlighting whichever one you are currently looking at
//   • mobile:  a floating "Sections" pill that opens the same list
//
// It discovers the sections from the DOM rather than taking a list, so the page
// stays the single source of truth for what it renders: mark each card with
// `data-section="Title"` and an `id`, and the rail builds itself in document order.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { List } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SectionNav({ containerRef, scrollRootRef, attr = 'data-section', label = 'Jump to section', className }: {
    /** Element wrapping the section cards. */
    containerRef: React.RefObject<HTMLElement | null>;
    /** The scrolling ancestor, when the page scrolls in its own container rather
     *  than the window — used as the scroll-spy root so the highlight is accurate. */
    scrollRootRef?: React.RefObject<HTMLElement | null>;
    /** Attribute carrying each section's title. */
    attr?: string;
    label?: string;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const [sections, setSections] = useState<{ id: string; title: string }[]>([]);
    const [active, setActive] = useState('');

    useEffect(() => {
        let io: IntersectionObserver | undefined;
        // The cards live in the page's own markup, so the list can only be read back
        // out of the DOM once it has committed. Do that on the next frame: layout has
        // settled by then, and the state lands from a scheduler callback instead of
        // cascading a second render pass straight out of the effect body.
        const raf = requestAnimationFrame(() => {
            const els = Array.from(containerRef.current?.querySelectorAll<HTMLElement>(`[${attr}]`) ?? []);
            if (!els.length) return;
            setSections(els.map(e => ({ id: e.id, title: e.getAttribute(attr) || '' })));
            setActive(els[0].id);
            // Track every section that is on screen and highlight the topmost one —
            // reading only the entry that just changed would jump the highlight around
            // when two sections cross the threshold in the same frame.
            const visible = new Set<string>();
            const root = scrollRootRef?.current ?? null;
            io = new IntersectionObserver(entries => {
                for (const e of entries) { if (e.isIntersecting) visible.add(e.target.id); else visible.delete(e.target.id); }
                const first = els.find(el => visible.has(el.id));
                if (first) setActive(first.id);
            }, {
                root,
                // Ignore the bottom 55% so the highlight follows what you are reading at
                // the top of the view, not whatever is scrolling in from below. Without a
                // container root the page header sits over the top of the viewport, so
                // discount its band as well.
                rootMargin: root ? '-8px 0px -55% 0px' : '-130px 0px -55% 0px',
                threshold: 0,
            });
            for (const el of els) io.observe(el);
        });
        return () => { cancelAnimationFrame(raf); io?.disconnect(); };
    }, [containerRef, scrollRootRef, attr]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest('[data-section-nav]')) setOpen(false); };
        document.addEventListener('pointerdown', onDown);
        return () => document.removeEventListener('pointerdown', onDown);
    }, [open]);

    const go = (id: string, close?: boolean) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (close) setOpen(false);
    };

    if (!sections.length) return null;

    return (
        <>
            {/* Desktop — sticky right-hand section navigator */}
            <aside className={cn('hidden w-56 shrink-0 lg:block', className)}>
                <div className="sticky top-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                    <p className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><List size={12} /> {label}</p>
                    <nav className="no-scrollbar max-h-[calc(100vh-220px)] space-y-0.5 overflow-y-auto">
                        {sections.map(s => {
                            const on = s.id === active;
                            return (
                                <button key={s.id} type="button" onClick={() => go(s.id)}
                                    className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors',
                                        on ? 'bg-blue-50 font-semibold text-blue-700' : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800')}>
                                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', on ? 'bg-blue-500' : 'bg-slate-300')} />
                                    <span className="truncate">{s.title}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </aside>

            {/* Mobile — floating "Sections" pill */}
            <div data-section-nav className="lg:hidden">
                <div className="fixed bottom-4 right-4 z-40">
                    {open && (
                        <div className="absolute bottom-full right-0 mb-2 max-h-[min(60vh,360px)] w-60 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                            {sections.map(s => (
                                <button key={s.id} type="button" onClick={() => go(s.id, true)}
                                    className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium hover:bg-slate-50', s.id === active ? 'text-blue-700' : 'text-slate-700')}>
                                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', s.id === active ? 'bg-blue-500' : 'bg-slate-300')} />
                                    <span className="truncate">{s.title}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <button type="button" onClick={() => setOpen(v => !v)} title={label} aria-expanded={open}
                        className={cn('inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2.5 text-[13px] font-semibold shadow-lg transition-colors',
                            open ? 'border-blue-300 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')}>
                        <List size={16} /> Sections
                    </button>
                </div>
            </div>
        </>
    );
}
