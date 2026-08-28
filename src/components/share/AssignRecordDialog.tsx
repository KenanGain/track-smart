import { useMemo, useState } from 'react';
import {
  X, Search, Check, MessageSquare, CheckCircle2, FileText, Send,
  ClipboardCheck, ShieldCheck, Upload, Share2, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useConversations, sendWidget, setMessagesFocus,
  type RecordRef, type ChatWidget, type WidgetKind,
} from '@/pages/messages/messages-store';

// ─────────────────────────────────────────────────────────────────────────────
// AssignRecordDialog — assign a TASK about a record (review / verify / upload) to
// an in-app contact, delivered as an interactive chat widget carrying the record's
// data + a clickable link. Or "Share only" — just send the record link. The
// recipient sees the widget in Messages, acts on it, and can open the record.
// ─────────────────────────────────────────────────────────────────────────────

export interface AssignRecordDialogProps {
  open: boolean;
  onClose: () => void;
  record: RecordRef;
  meta?: Record<string, string>;   // Subject / Due / Priority / … shown inside the widget
  subtitle?: string;
  currentUserName?: string;
  onNavigate?: (path: string) => void;
}

type TaskId = 'share' | 'review' | 'verify' | 'upload';
const TASKS: { id: TaskId; label: string; desc: string; icon: LucideIcon; tone: string }[] = [
  { id: 'share', label: 'Share row', desc: 'Send the full record — they can view & open it', icon: Share2, tone: 'bg-blue-50 text-blue-600' },
  { id: 'review', label: 'Review', desc: 'Review & manage this record', icon: ClipboardCheck, tone: 'bg-indigo-50 text-indigo-600' },
  { id: 'verify', label: 'Verify', desc: 'Confirm this record is valid', icon: ShieldCheck, tone: 'bg-emerald-50 text-emerald-600' },
  { id: 'upload', label: 'Upload', desc: 'Ask for a document upload', icon: Upload, tone: 'bg-sky-50 text-sky-600' },
];

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '?';
}

export function AssignRecordDialog({ open, onClose, record, meta, subtitle, onNavigate }: AssignRecordDialogProps) {
  const contacts = useConversations().filter(c => c.kind === 'internal' && !c.ai);
  const [task, setTask] = useState<TaskId>('share');
  const [search, setSearch] = useState('');
  const [pickedId, setPickedId] = useState('');
  const [message, setMessage] = useState('');
  const [sentConv, setSentConv] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(c => c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q) || c.roleTag.toLowerCase().includes(q));
  }, [contacts, search]);
  const picked = contacts.find(c => c.id === pickedId) || null;

  if (!open) return null;

  const doSend = () => {
    if (!picked) return;
    const kind: WidgetKind = task === 'share' ? 'record' : task;
    const widget: ChatWidget = { kind, title: record.label, subtitle: subtitle ?? record.sublabel, status: 'pending', record, meta };
    sendWidget(picked.id, { widget, text: message || undefined });
    setSentConv(picked.id);
  };

  const taskMeta = TASKS.find(t => t.id === task)!;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/30"><Send size={17} /></span>
          <div className="min-w-0">
            <h4 className="text-[15px] font-bold leading-tight text-slate-900">Send to chat</h4>
            <p className="mt-0.5 truncate text-[12.5px] text-slate-500">Assign a task or share this record in a chat.</p>
          </div>
          <button onClick={onClose} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
        </div>

        {/* Record preview */}
        <div className="border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 ring-1 ring-slate-200"><FileText size={16} /></span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold text-slate-800">{record.label}</p>
              {(subtitle ?? record.sublabel) && <p className="truncate text-[11.5px] text-slate-500">{subtitle ?? record.sublabel}</p>}
            </div>
          </div>
          {meta && Object.keys(meta).length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {Object.entries(meta).map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{k}</p>
                  <p className="truncate text-[11.5px] font-semibold text-slate-700">{v}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {sentConv ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-9 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 size={26} /></span>
            <h3 className="text-[15px] font-bold text-slate-900">{task === 'share' ? 'Shared' : 'Assigned'} to {picked?.name}</h3>
            <p className="mt-1 max-w-xs text-[12.5px] text-slate-500">
              {task === 'share'
                ? 'They’ll see the full record in Messages — its priority, due date and details — and can open it.'
                : `They’ll get a “${taskMeta.label}” task in Messages with the record’s details, and can open it to act.`}
            </p>
            <div className="mt-5 flex items-center gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Done</button>
              <button type="button" onClick={() => { setMessagesFocus(sentConv); onNavigate?.('/messages'); onClose(); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
                <MessageSquare size={15} /> Open in Messages
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {/* Task */}
              <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Task</label>
              <div className="grid grid-cols-2 gap-2">
                {TASKS.map(t => {
                  const on = task === t.id;
                  return (
                    <button key={t.id} type="button" onClick={() => setTask(t.id)}
                      className={cn('flex items-start gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors',
                        on ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}>
                      <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', t.tone)}><t.icon size={14} /></span>
                      <span className="min-w-0">
                        <span className="block text-[12.5px] font-bold text-slate-800">{t.label}</span>
                        <span className="block text-[10.5px] leading-tight text-slate-400">{t.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Recipient */}
              <label className="mb-1.5 mt-4 block text-[11px] font-semibold text-slate-500">Assign to</label>
              <div className="relative mb-2">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people…"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15" />
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-1.5">
                {filtered.length === 0 ? (
                  <p className="px-2 py-5 text-center text-[12px] text-slate-400">No people match.</p>
                ) : filtered.map(c => {
                  const on = pickedId === c.id;
                  return (
                    <button key={c.id} type="button" onClick={() => setPickedId(c.id)}
                      className={cn('flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors', on ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-white')}>
                      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white', c.color)}>{initials(c.name)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-slate-800">{c.name}</span>
                        <span className="block truncate text-[11px] text-slate-500">{c.role}</span>
                      </span>
                      {on && <Check size={16} className="shrink-0 text-blue-600" />}
                    </button>
                  );
                })}
              </div>

              {/* Note */}
              <label className="mb-1.5 mt-4 block text-[11px] font-semibold text-slate-500">Note <span className="font-normal text-slate-400">(optional)</span></label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={`Add a note for ${picked?.name?.split(' ')[0] ?? 'them'}…`}
                className="min-h-[64px] w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15" />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3.5">
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" disabled={!picked} onClick={doSend}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-blue-600/25 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">
                <Send size={15} /> {task === 'share' ? 'Share' : 'Assign'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
