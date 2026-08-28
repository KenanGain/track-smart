import type { LucideIcon } from 'lucide-react';
import { Activity as ActivityIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared activity-timeline UI used across Accidents, Tickets and Hours of
 * Service / Telematics (logs, violations & safety events). One consistent
 * look: a vertical connector rail, a colored icon circle per entry, a bold
 * title + optional role badge + timestamp, a description line, and a "who"
 * line — rendered as clearly separated rows so a long trail stays readable.
 */
export interface ActivityEntry {
  id: string;
  icon: LucideIcon;
  /** Tailwind background class for the icon circle, e.g. 'bg-blue-500'. */
  iconTone: string;
  title: string;
  /** Optional role/kind pill (e.g. Office / Driver / Source). */
  badge?: { label: string; tone: string };
  /** Who performed it. */
  by?: string;
  /** Extra description. */
  detail?: string;
  /** Preformatted timestamp string. */
  at: string;
}

function TimelineList({ entries }: { entries: ActivityEntry[] }) {
  return (
    <ol className="relative">
      {entries.map((a, i) => {
        const Icon = a.icon;
        const last = i === entries.length - 1;
        return (
          <li key={a.id} className="relative flex gap-3.5 pb-4 last:pb-0">
            {/* vertical connector rail between entries */}
            {!last && <span aria-hidden className="absolute left-[17px] top-9 bottom-0 w-px bg-slate-200" />}
            <span className={cn('relative z-[1] mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm ring-4 ring-white', a.iconTone)}>
              <Icon size={15} />
            </span>
            <div className="min-w-0 flex-1 rounded-lg border border-slate-100 bg-white px-3.5 py-2.5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[13px] font-bold text-slate-800">{a.title}</span>
                  {a.badge && <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold', a.badge.tone)}>{a.badge.label}</span>}
                </div>
                <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] font-medium text-slate-400"><Clock size={11} /> {a.at}</span>
              </div>
              {a.detail && <p className="mt-1 text-[13px] leading-snug text-slate-600">{a.detail}</p>}
              {a.by && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[8px] font-bold text-slate-500">{a.by.trim().charAt(0).toUpperCase()}</span>
                  <span className="font-semibold text-slate-500">{a.by}</span>
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ActivityTimeline({ entries, heading, className, emptyText = 'No activity recorded yet.' }: {
  entries: ActivityEntry[];
  /** When set, wraps the timeline in a titled card (detail-page tabs). Omit for modals. */
  heading?: string;
  className?: string;
  emptyText?: string;
}) {
  // Bare list — for modal bodies that supply their own container.
  if (!heading) {
    if (entries.length === 0) return <div className={cn('py-8 text-center text-sm text-slate-400', className)}>{emptyText}</div>;
    return <div className={className}><TimelineList entries={entries} /></div>;
  }

  // Card — for detail-page Activity tabs. Grows to fill available height.
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-5 py-3">
        <ActivityIcon size={15} className="text-blue-600" />
        <h3 className="text-sm font-bold text-slate-800">{heading}</h3>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-500">{entries.length}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {entries.length === 0
          ? <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">{emptyText}</div>
          : <TimelineList entries={entries} />}
      </div>
    </div>
  );
}
