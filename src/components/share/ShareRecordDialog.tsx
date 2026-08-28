import { useMemo, useState } from 'react';
import {
  Share2, X, Search, Check, MessageSquare, CheckCircle2, FileText, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useConversations, shareRecordToMessages, setMessagesFocus,
  type RecordRef,
} from '@/pages/messages/messages-store';

// ─────────────────────────────────────────────────────────────────────────────
// ShareRecordDialog — share a clickable RECORD LINK through an in-app chat (no
// email). Pick a person, add a note, share. The recipient gets a record card in
// Messages; clicking it opens the record. Deliberately simple vs. ShareToChat
// (which sends files and can go to outsiders by email).
// ─────────────────────────────────────────────────────────────────────────────

export interface ShareRecordDialogProps {
  open: boolean;
  onClose: () => void;
  record: RecordRef;
  currentUserName?: string;
  onNavigate?: (path: string) => void;
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '?';
}

export function ShareRecordDialog({ open, onClose, record, currentUserName, onNavigate }: ShareRecordDialogProps) {
  const contacts = useConversations().filter(c => c.kind === 'internal' && !c.ai);
  const [search, setSearch] = useState('');
  const [pickedId, setPickedId] = useState('');
  const [message, setMessage] = useState('');
  const [sentId, setSentId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(c => c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q) || c.roleTag.toLowerCase().includes(q));
  }, [contacts, search]);

  const picked = contacts.find(c => c.id === pickedId) || null;

  if (!open) return null;

  const doShare = () => {
    if (!picked) return;
    const id = shareRecordToMessages({ recipientId: picked.id, record, message, currentUserName });
    if (id) setSentId(id);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/30"><Share2 size={17} /></span>
          <div className="min-w-0">
            <h4 className="text-[15px] font-bold leading-tight text-slate-900">Share record</h4>
            <p className="mt-0.5 truncate text-[12.5px] text-slate-500">Send a link to this record in an in-app chat.</p>
          </div>
          <button onClick={onClose} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
        </div>

        {/* Record preview card */}
        <div className="border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 ring-1 ring-slate-200"><FileText size={16} /></span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold text-slate-800">{record.label}</p>
              {record.sublabel && <p className="truncate text-[11.5px] text-slate-500">{record.sublabel}</p>}
            </div>
          </div>
        </div>

        {sentId ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-9 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 size={26} /></span>
            <h3 className="text-[15px] font-bold text-slate-900">Shared with {picked?.name}</h3>
            <p className="mt-1 max-w-xs text-[12.5px] text-slate-500">They’ll see the record in Messages — clicking it opens this record.</p>
            <div className="mt-5 flex items-center gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Done</button>
              <button type="button" onClick={() => { setMessagesFocus(sentId); onNavigate?.('/messages'); onClose(); }} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
                <MessageSquare size={15} /> Open in Messages
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Send to</label>
              <div className="relative mb-2">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people…"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15" />
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-1.5">
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

              <label className="mb-1.5 mt-4 block text-[11px] font-semibold text-slate-500">Message <span className="font-normal text-slate-400">(optional)</span></label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={`Take a look at ${record.label}…`}
                className="min-h-[70px] w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15" />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3.5">
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" disabled={!picked} onClick={doShare}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-blue-600/25 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">
                <Send size={15} /> Share
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
