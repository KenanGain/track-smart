import { useState } from 'react';
import {
  GraduationCap, FileWarning, BellRing, Send, UserX, Ban, StickyNote, RotateCcw,
  CheckCircle2, ClipboardCheck, ShieldCheck, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  HOS_DISPOSITIONS, HOS_DISPOSITION_BY_ID, HOS_STATUS_META,
  type HosDisposition, type HosVStatus,
} from '@/pages/hos/hos-violations.data';
import type { ActivityEntry } from '@/components/ui/ActivityTimeline';
import { activityMeta } from '@/components/ui/activity-kinds';

/**
 * Shared review / resolution surface used by both Hours-of-Service violations
 * and Telematics & Video safety events. Keeps the verification lifecycle — a
 * record arrives "In Review", a reviewer closes it by choosing a resolution
 * (assign training, warning letter, safety alert, driver notice, terminate,
 * dismiss as false), and can reopen — identical across the two surfaces.
 */

/** Resolution (disposition) → icon. */
export const DISP_ICON: Record<HosDisposition, LucideIcon> = {
  training: GraduationCap,
  warning: FileWarning,
  alert: BellRing,
  notice: Send,
  terminated: UserX,
  false: Ban,
};

/** One raw activity-trail row (as stored on a record). */
export interface RawActivity {
  id: string;
  at: string;
  by: string;
  kind: string;
  detail?: string;
  /** Optional title override (defaults to the kind's label). */
  title?: string;
  /** Optional role/source badge. */
  badge?: { label: string; tone: string };
}

/** Map a generic activity trail to ActivityTimeline entries via the shared vocabulary. */
export function toActivityEntries(
  activity: RawActivity[] | undefined,
  fmtWhen: (s: string) => { date: string; time: string },
): ActivityEntry[] {
  return (activity ?? []).map(a => {
    const meta = activityMeta(a.kind);
    const w = fmtWhen(a.at);
    return {
      id: a.id,
      icon: meta.icon,
      iconTone: meta.dot,
      title: a.title ?? meta.label,
      badge: a.badge,
      by: a.by,
      detail: a.detail,
      at: `${w.date} ${w.time}`.trim(),
    };
  });
}

/**
 * The full body of a record's "Review" tab: the resolution panel plus the
 * accumulated review-notes list. Purely presentational — the parent owns the
 * record and supplies the action callbacks.
 */
export function ReviewResolutionTab({
  status, subjectName, disposition, trainingName, reviewedBy, reviewNotes, verified, verifiedBy,
  onDispose, onAssignTraining, onReopen, onAddNote, onVerify,
}: {
  status: HosVStatus;
  /** Driver the resolution is directed at. */
  subjectName: string;
  disposition?: HosDisposition;
  trainingName?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  /** Whether the current file has been verified (drives the Verify step). */
  verified?: boolean;
  verifiedBy?: string;
  onDispose: (disp: HosDisposition) => void;
  onAssignTraining: () => void;
  onReopen: () => void;
  onAddNote: (text: string) => void;
  /** Mark reviewed/verified — logs a live activity entry by the current user. */
  onVerify?: () => void;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const st = HOS_STATUS_META[status];
  const closed = status === 'resolved';
  const notes = (reviewNotes ?? '').split('\n').map(s => s.trim()).filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Resolution panel */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500"><ClipboardCheck size={13} /> Review &amp; resolution</div>
          <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', st.tone)}><span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}</span>
        </div>
        <div className="mt-3 space-y-2.5">
          {closed ? (
            <>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                {disposition && (() => { const d = HOS_DISPOSITION_BY_ID[disposition]; const DI = DISP_ICON[disposition]; return (
                  <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-bold', d.tone)}><DI size={11} /> {d.label}{disposition === 'training' && trainingName ? `: ${trainingName}` : ''}</span>
                ); })()}
                {reviewedBy && <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-blue-700"><CheckCircle2 size={11} /> Closed by {reviewedBy}</span>}
              </div>
              <div className="flex flex-wrap gap-2 pt-0.5">
                <button type="button" onClick={onReopen} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw size={14} /> Reopen for review</button>
                <button type="button" onClick={() => setNoteOpen(o => !o)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"><StickyNote size={14} /> Add note</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[12px] text-slate-500">In review — verify the record, then close it by choosing a resolution for <span className="font-semibold text-slate-700">{subjectName}</span>.</p>

              {/* Step 1 — Verify */}
              {onVerify && (
                <div>
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">1 · Verify</div>
                  {verified ? (
                    <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700"><ShieldCheck size={14} /> Verified{verifiedBy ? ` by ${verifiedBy}` : ''}</div>
                  ) : (
                    <button type="button" onClick={onVerify} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700 transition-shadow hover:shadow-sm"><ShieldCheck size={14} /> Mark as verified</button>
                  )}
                </div>
              )}

              {/* Step 2 — Resolution (action taken) */}
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{onVerify ? '2 · ' : ''}Resolution — action to take</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {HOS_DISPOSITIONS.map(d => { const DI = DISP_ICON[d.id]; return (
                    <button key={d.id} type="button" onClick={() => (d.id === 'training' ? onAssignTraining() : onDispose(d.id))}
                      className={cn('inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[12px] font-semibold transition-shadow hover:shadow-sm', d.tone)}>
                      <DI size={14} /> {d.label}
                    </button>
                  ); })}
                </div>
              </div>

              {/* Step 3 — Note */}
              <button type="button" onClick={() => setNoteOpen(o => !o)} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"><StickyNote size={14} /> Add note</button>
            </>
          )}
          {noteOpen && (
            <div className="rounded-lg border border-slate-200 bg-white p-2.5">
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3} autoFocus placeholder="Write a review note…" className="w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400">Added to the activity trail and review notes.</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setNoteOpen(false); setNoteText(''); }} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button type="button" disabled={!noteText.trim()} onClick={() => { onAddNote(noteText.trim()); setNoteOpen(false); setNoteText(''); }} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-700 disabled:opacity-40"><StickyNote size={13} /> Save note</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review notes list */}
      {notes.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400"><StickyNote size={12} /> Review notes</div>
          <div className="space-y-1.5">
            {notes.map((n, i) => (
              <div key={i} className="flex gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-[13px] leading-snug text-slate-600">
                <StickyNote size={13} className="mt-0.5 shrink-0 text-slate-300" />
                <span className="min-w-0">{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
