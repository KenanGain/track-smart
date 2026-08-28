import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// KebabMenu — a compact three-dot overflow menu. The dropdown renders in a portal
// with fixed positioning so it is never clipped by a table's overflow container.
// ─────────────────────────────────────────────────────────────────────────────

export interface KebabItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  danger?: boolean;
}

const MENU_W = 184;

export function KebabMenu({ items, className, title = 'More actions' }: { items: KebabItem[]; className?: string; title?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [open]);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.max(8, Math.min(r.right - MENU_W, window.innerWidth - MENU_W - 8));
    setPos({ top: r.bottom + 4, left });
    setOpen(true);
  };

  return (
    <div className={cn('inline-flex', className)}>
      <button ref={btnRef} type="button" onClick={openMenu} title={title}
        className={cn('rounded-md p-1.5 transition-colors', open ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700')}>
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[90]" onClick={(e) => { e.stopPropagation(); setOpen(false); }} onContextMenu={(e) => { e.preventDefault(); setOpen(false); }} />
          <div className="fixed z-[91] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl" style={{ top: pos.top, left: pos.left, width: MENU_W }} onClick={(e) => e.stopPropagation()}>
            {items.map((it, i) => (
              <button key={i} type="button" onClick={() => { setOpen(false); it.onClick(); }}
                className={cn('flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium transition-colors hover:bg-slate-50',
                  it.danger ? 'text-rose-600' : 'text-slate-700')}>
                {it.icon && <it.icon className={cn('h-4 w-4 shrink-0', it.danger ? 'text-rose-500' : 'text-slate-400')} />}
                {it.label}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
