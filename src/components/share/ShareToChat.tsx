import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Send, X, Eye, Mail, Smartphone, FileText, Image as ImageIcon, Video, Paperclip,
  Search, Check, Link2, Copy, MessageSquare, CheckCircle2, ArrowLeft, Tag as TagIcon, UserPlus,
  Upload, FolderOpen, Building2, Truck, User, ChevronRight, ChevronLeft,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useConversations, getConversations, shareToMessages, externalChatUrl, attachmentKindFor,
  type ConvChannel, type ConvSource, type RoleTag, type AttachmentKind, type RecordRef,
} from '@/pages/messages/messages-store';
import { useChatContacts, useChatTags, tagById, upsertChatContact } from '@/pages/settings/chat-tags.data';
import { listAppDocuments, type AppDocument } from '@/pages/compliance/compliance-data-store';

// ─────────────────────────────────────────────────────────────────────────────
// ShareToChat — the one dialog behind every "Share / Send" action in the product.
// Send to an in-app user (opens/continues their chat) or to an outsider by email
// (mints a secure chat link they reply on — that thread lands in our Messages box
// and can be disabled later). On success it hands back the conversation so the
// caller can jump straight into Messages.
//
// Layout: a fixed-height dialog with a compose pane on the left (who + note) and a
// dedicated attachments pane on the right; a full-width email preview; a success
// screen with the secure link.
// ─────────────────────────────────────────────────────────────────────────────

export interface ShareItem { name: string; group?: string }

export interface ShareToChatProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  source: ConvSource;
  items: ShareItem[];
  /** Optional clickable record link attached to the shared message (click → opens the record). */
  record?: RecordRef;
  recipientName?: string;
  recipientEmail?: string;
  recipientRoleTag?: RoleTag;
  defaultChannel?: ConvChannel;
  defaultSubject?: string;
  defaultMessage?: string;
  currentUserName?: string;
  onSent?: (convId: string) => void;
  onOpenInMessages?: (convId: string) => void;
  /** Fires with the resolved send details — callers can mirror into their own record thread. */
  onShared?: (r: { channel: ConvChannel; recipientName: string; recipientEmail?: string; subject: string; message: string; items: ShareItem[]; tag?: string }) => void;
}

const KIND_ICON: Record<AttachmentKind, LucideIcon> = { pdf: FileText, image: ImageIcon, video: Video, doc: FileText };
const KIND_SQ: Record<AttachmentKind, string> = {
  pdf: 'bg-rose-50 text-rose-500', image: 'bg-amber-50 text-amber-500',
  video: 'bg-violet-50 text-violet-500', doc: 'bg-slate-100 text-slate-500',
};

// "Add from app" picker — documents grouped by which side of the fleet they belong to.
const APP_ENTITY_ORDER = ['Carrier', 'Asset', 'Driver'] as const;
const APP_ENTITY_META: Record<string, { icon: LucideIcon; tone: string }> = {
  Carrier: { icon: Building2, tone: 'bg-blue-50 text-blue-600' },
  Asset: { icon: Truck, tone: 'bg-emerald-50 text-emerald-600' },
  Driver: { icon: User, tone: 'bg-violet-50 text-violet-600' },
};

const inputCls = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15';

export function ShareToChat(props: ShareToChatProps) {
  const {
    open, onClose, title = 'Share', subtitle, source, items: baseItems, record,
    recipientName = '', recipientEmail = '', recipientRoleTag,
    defaultChannel = 'email', defaultSubject = '', defaultMessage = '',
    currentUserName, onSent, onOpenInMessages, onShared,
  } = props;

  const contacts = useConversations().filter(c => c.kind === 'internal' && !c.ai);
  const chatContacts = useChatContacts();
  const chatTags = useChatTags();

  const [view, setView] = useState<'compose' | 'preview'>('compose');
  const [channel, setChannel] = useState<ConvChannel>(defaultChannel);
  // External delivery: 'chat' = email a secure chat link (they reply, thread lives here) ·
  // 'email' = just email the documents (one-way, no chat link).
  const [extDelivery, setExtDelivery] = useState<'chat' | 'email'>('chat');
  const [extMode, setExtMode] = useState<'saved' | 'new'>(() => (recipientEmail ? 'new' : (chatContacts.length ? 'saved' : 'new')));
  const [extContactId, setExtContactId] = useState<string>('');
  const [extSearch, setExtSearch] = useState('');
  const [email, setEmail] = useState(recipientEmail);
  const [extName, setExtName] = useState(recipientName);
  const [extTagId, setExtTagId] = useState<string>(() => chatTags[0]?.id ?? '');
  const [saveContact, setSaveContact] = useState(true);
  const [contactId, setContactId] = useState<string>('');
  const [contactSearch, setContactSearch] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [checked, setChecked] = useState<Set<number>>(() => new Set(baseItems.map((_, i) => i)));
  const [sentId, setSentId] = useState<string | null>(null);
  const [sentLink, setSentLink] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState('');
  const [copied, setCopied] = useState(false);
  // Attachments added on top of the record's own files — from the device OR from the app.
  const [extra, setExtra] = useState<ShareItem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  // "Add from app" picker — choose an existing document already stored in TrackSmart.
  const [appPickerOpen, setAppPickerOpen] = useState(false);
  const [appSearch, setAppSearch] = useState('');
  const [appPicked, setAppPicked] = useState<Set<string>>(new Set());
  const [appTab, setAppTab] = useState<string>('Carrier');
  const [appSubject, setAppSubject] = useState<string | null>(null); // selected asset/driver (drill: subject)
  const [appRecord, setAppRecord] = useState<string | null>(null);   // selected record/document (drill: record)
  const [appPreview, setAppPreview] = useState<AppDocument | null>(null);
  const appDocs = useMemo(() => listAppDocuments(), []);
  const toggleAppPick = (name: string) => setAppPicked(s => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n; });
  const selectAppTab = (e: string) => { setAppTab(e); setAppSubject(null); setAppRecord(null); };
  const openSubject = (id: string) => { setAppSubject(id); setAppRecord(null); };
  const closeAppPicker = () => { setAppPickerOpen(false); setAppPicked(new Set()); setAppSearch(''); setAppSubject(null); setAppRecord(null); };

  // Combined attachment list: the source record's files + any added files. Everything
  // below (selection, groups, counts) works off this, so the UI is identical everywhere.
  const items = useMemo(() => [...baseItems, ...extra], [baseItems, extra]);
  // Append attachments (device files OR app documents) to the combined list, de-duped by name.
  const addItems = (newItems: ShareItem[]) => {
    const existing = new Set(items.map(it => it.name));
    const fresh = newItems.filter(n => !existing.has(n.name));
    if (!fresh.length) return;
    const base = items.length; // index of the first new item in the combined list
    setExtra(prev => [...prev, ...fresh]);
    setChecked(s => { const n = new Set(s); fresh.forEach((_, i) => n.add(base + i)); return n; });
  };
  const onAddFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    addItems(Array.from(files).map(f => ({ name: f.name, group: 'Added files' })));
  };
  const filteredAppDocs = useMemo(() => {
    const q = appSearch.trim().toLowerCase();
    if (!q) return appDocs;
    return appDocs.filter(d => d.name.toLowerCase().includes(q) || d.record.toLowerCase().includes(q)
      || d.subject.toLowerCase().includes(q) || d.entity.toLowerCase().includes(q));
  }, [appDocs, appSearch]);
  // Grouped by entity (Carrier / Asset / Driver) — filtered list for the active tab.
  const appGroups = useMemo(() => {
    const m: Record<string, AppDocument[]> = {};
    filteredAppDocs.forEach(d => { (m[d.entity] ||= []).push(d); });
    return m;
  }, [filteredAppDocs]);
  // Which entity tabs exist (based on ALL docs, so tabs stay stable while searching).
  const appTabs = useMemo(() => {
    const present = new Set(appDocs.map(d => d.entity));
    return APP_ENTITY_ORDER.filter(e => present.has(e));
  }, [appDocs]);
  const activeAppTab = (appTabs as readonly string[]).includes(appTab) ? appTab : (appTabs[0] ?? 'Carrier');
  const confirmAppPick = () => {
    addItems(appDocs.filter(d => appPicked.has(d.name)).map(d => ({ name: d.name, group: `${d.entity} · ${d.subject}` })));
    setAppPicked(new Set());
    setAppSearch('');
    setAppPickerOpen(false);
  };

  const selected = items.filter((_, i) => checked.has(i));
  const toggle = (i: number) => setChecked(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const kindCounts = useMemo(() => {
    let docs = 0, imgs = 0, vids = 0;
    items.forEach(it => { const k = attachmentKindFor(it.name); if (k === 'image') imgs++; else if (k === 'video') vids++; else docs++; });
    return { docs, imgs, vids };
  }, [items]);

  const { groupOrder, groups } = useMemo(() => {
    const order: string[] = []; const map: Record<string, number[]> = {};
    items.forEach((a, i) => { const g = a.group || 'Items'; if (!map[g]) { map[g] = []; order.push(g); } map[g].push(i); });
    return { groupOrder: order, groups: map };
  }, [items]);

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(c => c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q) || c.roleTag.toLowerCase().includes(q));
  }, [contacts, contactSearch]);

  const filteredChatContacts = useMemo(() => {
    const q = extSearch.trim().toLowerCase();
    if (!q) return chatContacts;
    return chatContacts.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (tagById(c.tagId)?.label ?? '').toLowerCase().includes(q));
  }, [chatContacts, extSearch]);

  const chosen = contacts.find(c => c.id === contactId) || null;
  const external = channel === 'email';
  const emailOnly = external && extDelivery === 'email';
  const extSaved = chatContacts.find(c => c.id === extContactId) || null;
  const canSend = external
    ? (extMode === 'saved' ? !!extSaved : /\S+@\S+\.\S+/.test(email))
    : !!chosen;

  if (!open) return null;

  const doSend = () => {
    if (!canSend) return;
    let name = '', mail = '', tagLabel: string | undefined, tagColor: string | undefined;
    if (external) {
      if (extMode === 'saved' && extSaved) {
        name = extSaved.name; mail = extSaved.email;
        const t = tagById(extSaved.tagId); tagLabel = t?.label; tagColor = t?.color;
      } else {
        name = extName || email; mail = email;
        const t = tagById(extTagId); tagLabel = t?.label; tagColor = t?.color;
        if (saveContact && /\S+@\S+\.\S+/.test(email)) upsertChatContact({ name: extName || email, tagId: extTagId, email });
      }
    }
    const id = shareToMessages({
      recipientName: external ? name : (chosen?.name ?? ''),
      recipientEmail: external ? mail : undefined,
      recipientId: external ? undefined : chosen?.id,
      channel,
      roleTag: external ? (recipientRoleTag ?? 'External') : chosen?.roleTag,
      color: external ? undefined : chosen?.color,
      tag: external ? tagLabel : undefined,
      tagColor: external ? tagColor : undefined,
      subject,
      message: message || `Shared from ${source.label}.`,
      items: selected.map(s => ({ name: s.name, group: s.group })),
      source,
      currentUserName,
      record,
      externalDelivery: external ? extDelivery : undefined,
    });
    setSentTo(external ? mail : (chosen?.name ?? ''));
    setSentId(id);
    setSentLink(external && !emailOnly ? externalChatUrl(conversationToken(id)) : null);
    onShared?.({
      channel,
      recipientName: external ? name : (chosen?.name ?? ''),
      recipientEmail: external ? mail : undefined,
      subject,
      message: message || `Shared from ${source.label}.`,
      items: selected.map(s => ({ name: s.name, group: s.group })),
      tag: external ? tagLabel : undefined,
    });
    onSent?.(id);
  };

  const copyLink = () => {
    if (!sentLink) return;
    try { navigator.clipboard?.writeText(sentLink); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const previewTag = external ? (extMode === 'saved' ? tagById(extSaved?.tagId) : tagById(extTagId)) : undefined;
  const previewTo = external
    ? (extMode === 'saved' ? (extSaved ? `${extSaved.name} · ${extSaved.email}` : 'Select a contact') : (email || 'name@company.com'))
    : (chosen?.name ?? 'Select a person');

  const footer = (
    <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-6 py-3.5">
      <span className="hidden text-[12px] text-slate-400 sm:block">{selected.length} item{selected.length !== 1 ? 's' : ''} · {emailOnly ? 'One-way document email' : external ? 'External email + secure link' : 'In-app message'}</span>
      <div className="flex flex-1 items-center justify-end gap-2">
        {view === 'compose'
          ? <button type="button" onClick={() => setView('preview')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"><Eye size={15} /> Preview</button>
          : <button type="button" onClick={() => setView('compose')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"><ArrowLeft size={15} /> Edit</button>}
        <button type="button" disabled={!canSend} onClick={doSend}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-blue-600/25 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">
          <Send size={15} /> {emailOnly ? 'Email documents' : external ? 'Send & create chat' : 'Share in chat'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="flex h-[640px] max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/30"><Send size={18} /></span>
          <div className="min-w-0">
            <h4 className="text-[15px] font-bold leading-tight text-slate-900">{title}</h4>
            <p className="mt-0.5 truncate text-[12.5px] text-slate-500">{subtitle ?? `Share ${source.label} in a chat`}</p>
          </div>
          <button onClick={onClose} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
        </div>

        {sentId ? (
          /* ── Success ── */
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 size={30} /></span>
            <h3 className="text-lg font-bold text-slate-900">{emailOnly ? 'Documents emailed' : external ? 'Sent — secure chat link emailed' : 'Shared in Messages'}</h3>
            <p className="mt-1 max-w-md text-[13px] text-slate-500">
              {emailOnly
                ? `${selected.length} document${selected.length !== 1 ? 's' : ''} emailed to ${sentTo}. This is a one-way send — there’s no reply chat. A log lives in your Messages box.`
                : external
                  ? `${selected.length} item${selected.length !== 1 ? 's' : ''} sent to ${sentTo}. They can reply on the secure link, and the conversation now lives in your Messages box.`
                  : `${selected.length} item${selected.length !== 1 ? 's' : ''} shared with ${chosen?.name}. The conversation is in your Messages box.`}
            </p>
            {sentLink && (
              <div className="mt-5 w-full max-w-md text-left">
                <p className="mb-1.5 text-[11px] font-semibold text-slate-500">Secure chat link</p>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <Link2 size={15} className="shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-slate-600">{sentLink}</span>
                  <button type="button" onClick={copyLink} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2 py-1 text-[12px] font-semibold text-blue-600 ring-1 ring-slate-200 hover:bg-blue-50">
                    {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
            <div className="mt-6 flex items-center gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Done</button>
              {onOpenInMessages && (
                <button type="button" onClick={() => { onOpenInMessages(sentId); onClose(); }} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
                  <MessageSquare size={15} /> Open in Messages
                </button>
              )}
            </div>
          </div>
        ) : view === 'preview' ? (
          /* ── Preview (full width) ── */
          <>
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-6 py-6">
              <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="space-y-1 border-b border-slate-100 px-5 py-3.5 text-[12.5px]">
                  <p className="flex flex-wrap items-center gap-x-1.5">
                    <span className="font-semibold text-slate-600">To</span>
                    <span className="text-slate-500">{previewTo}</span>
                    {previewTag && <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset', previewTag.color)}><TagIcon size={9} /> {previewTag.label}</span>}
                  </p>
                  <p><span className="font-semibold text-slate-600">Subject</span> <span className="text-slate-500">{subject || source.label}</span></p>
                  <p><span className="font-semibold text-slate-600">Via</span> <span className="text-slate-500">{emailOnly ? 'External email · documents attached (one-way)' : external ? 'External email + secure chat link' : 'In-app message'}</span></p>
                </div>
                <div className="space-y-3 px-5 py-4">
                  <p className="whitespace-pre-line text-[13px] leading-relaxed text-slate-700">{message || `Shared from ${source.label}.`}</p>
                  {external && !emailOnly && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5">
                      <MessageSquare size={16} className="shrink-0 text-violet-600" />
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-violet-700">Open the secure chat to view items & reply</p>
                        <p className="truncate font-mono text-[11px] text-violet-600/70">{externalChatUrl('••••••••')}</p>
                      </div>
                    </div>
                  )}
                  {emailOnly && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <Paperclip size={16} className="shrink-0 text-slate-500" />
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-slate-700">Documents attached to the email</p>
                        <p className="text-[11px] text-slate-500">One-way — no chat link, the recipient can’t reply.</p>
                      </div>
                    </div>
                  )}
                  {selected.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold text-slate-500">{selected.length} attachment{selected.length !== 1 ? 's' : ''}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.map((a, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
                            <Paperclip size={11} className="text-slate-400" /><span className="max-w-[200px] truncate" title={a.name}>{a.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {footer}
          </>
        ) : (
          /* ── Compose (two panes) ── */
          <>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
              {/* Left — recipient + note */}
              <div className="flex flex-col gap-5 px-6 py-5 lg:w-[54%] lg:overflow-y-auto lg:border-r lg:border-slate-100">
                {/* Send via */}
                <div>
                  <FieldLabel>Send via</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <ChannelTile active={!external} onClick={() => setChannel('in-app')} icon={Smartphone} label="In-app user" sub="Someone in TrackSmart" />
                    <ChannelTile active={external} onClick={() => setChannel('email')} icon={Mail} label="External" sub="Outsider · email" />
                  </div>
                </div>

                {/* Outsider delivery — chat link vs one-way document email */}
                {external && (
                  <div>
                    <FieldLabel>Delivery</FieldLabel>
                    <div className="grid grid-cols-2 gap-2">
                      <ChannelTile active={extDelivery === 'chat'} onClick={() => setExtDelivery('chat')} icon={MessageSquare} label="Create chat" sub="Secure link · they reply" />
                      <ChannelTile active={extDelivery === 'email'} onClick={() => setExtDelivery('email')} icon={Paperclip} label="Email documents" sub="Send files · one-way" />
                    </div>
                  </div>
                )}

                {/* Recipient */}
                {external ? (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <FieldLabel className="mb-0">To</FieldLabel>
                      <div className="flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold">
                        {(['saved', 'new'] as const).map(m => (
                          <button key={m} type="button" onClick={() => setExtMode(m)} className={cn('rounded-md px-2.5 py-1 capitalize transition-colors', extMode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>{m}</button>
                        ))}
                      </div>
                    </div>
                    {extMode === 'saved' ? (
                      <>
                        <div className="relative">
                          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input value={extSearch} onChange={e => setExtSearch(e.target.value)} placeholder="Search contacts…"
                            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15" />
                        </div>
                        <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-1.5">
                          {filteredChatContacts.length === 0 ? (
                            <p className="px-2 py-5 text-center text-[12px] text-slate-400">No contacts — add one under “New”, or in Settings ▸ Chat Tags.</p>
                          ) : filteredChatContacts.map(c => {
                            const t = tagById(c.tagId);
                            const on = extContactId === c.id;
                            return (
                              <button key={c.id} type="button" onClick={() => setExtContactId(c.id)}
                                className={cn('flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors', on ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-white')}>
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600">{initials(c.name)}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center gap-1.5">
                                    <span className="truncate text-[13px] font-semibold text-slate-800">{c.name}</span>
                                    {t && <span className={cn('shrink-0 rounded px-1 py-0.5 text-[9px] font-bold ring-1 ring-inset', t.color)}>{t.label}</span>}
                                  </span>
                                  <span className="block truncate text-[11px] text-slate-500">{c.email}</span>
                                </span>
                                {on && <Check size={16} className="shrink-0 text-blue-600" />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <FieldLabel small>Name</FieldLabel>
                            <input value={extName} onChange={e => setExtName(e.target.value)} placeholder="Adjuster / contact" className={cn(inputCls, 'h-9')} />
                          </div>
                          <div>
                            <FieldLabel small>Tag</FieldLabel>
                            <select value={extTagId} onChange={e => setExtTagId(e.target.value)} className={cn(inputCls, 'h-9 px-2')}>
                              {chatTags.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <FieldLabel small>Email</FieldLabel>
                          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" className={cn(inputCls, 'h-9')} />
                        </div>
                        <label className="flex cursor-pointer items-center gap-2 text-[12px] text-slate-600">
                          <input type="checkbox" checked={saveContact} onChange={e => setSaveContact(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                          <UserPlus size={13} className="text-slate-400" /> Save to Chat Tags contacts
                        </label>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <FieldLabel>To</FieldLabel>
                    <div className="relative">
                      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search people…"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15" />
                    </div>
                    <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-1.5">
                      {filteredContacts.length === 0 ? (
                        <p className="px-2 py-5 text-center text-[12px] text-slate-400">No people match.</p>
                      ) : filteredContacts.map(c => {
                        const on = contactId === c.id;
                        return (
                          <button key={c.id} type="button" onClick={() => setContactId(c.id)}
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
                  </div>
                )}

                {/* Subject */}
                <div>
                  <FieldLabel>Subject</FieldLabel>
                  <input value={subject} onChange={e => setSubject(e.target.value)} placeholder={source.label} className={inputCls} />
                </div>

                {/* Message */}
                <div className="flex flex-1 flex-col">
                  <FieldLabel>Message</FieldLabel>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Add a note…"
                    className="min-h-[110px] w-full flex-1 resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15" />
                </div>
              </div>

              {/* Right — attachments */}
              <div className="flex min-h-0 flex-col bg-slate-50/60 lg:flex-1">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
                  <div>
                    <h5 className="text-[13px] font-bold text-slate-800">Attachments</h5>
                    <p className="text-[11px] text-slate-400">{selected.length} of {items.length} selected</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <input ref={fileRef} type="file" multiple className="hidden"
                      onChange={e => { onAddFiles(e.target.files); e.target.value = ''; }} />
                    <button type="button" onClick={() => fileRef.current?.click()} title="Attach documents from your device"
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-50">
                      <Upload size={14} /> Device
                    </button>
                    <button type="button" onClick={() => setAppPickerOpen(true)} title="Attach an existing document already in TrackSmart"
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-50">
                      <FolderOpen size={14} /> From app
                    </button>
                    {items.length > 0 && (
                      <button type="button" onClick={() => setChecked(selected.length ? new Set() : new Set(items.map((_, i) => i)))}
                        className="rounded-lg px-2 py-1.5 text-[12px] font-semibold text-slate-500 hover:bg-slate-100">
                        {selected.length ? 'Clear all' : 'Select all'}
                      </button>
                    )}
                  </div>
                </div>
                {items.length > 0 && (kindCounts.docs + kindCounts.imgs + kindCounts.vids > 0) && (
                  <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 px-5 py-2">
                    {kindCounts.docs > 0 && <TypeChip icon={FileText} tone="text-rose-500" label={`${kindCounts.docs} doc${kindCounts.docs !== 1 ? 's' : ''}`} />}
                    {kindCounts.imgs > 0 && <TypeChip icon={ImageIcon} tone="text-amber-500" label={`${kindCounts.imgs} photo${kindCounts.imgs !== 1 ? 's' : ''}`} />}
                    {kindCounts.vids > 0 && <TypeChip icon={Video} tone="text-violet-500" label={`${kindCounts.vids} video${kindCounts.vids !== 1 ? 's' : ''}`} />}
                  </div>
                )}
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 lg:px-4">
                  {items.length === 0 ? (
                    <div className="flex h-full min-h-[160px] flex-col items-center justify-center px-6 text-center text-slate-400">
                      <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100"><Paperclip size={18} /></div>
                      <p className="text-[12.5px] font-semibold text-slate-500">No documents yet</p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <button type="button" onClick={() => fileRef.current?.click()}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-50"><Upload size={13} /> Device</button>
                        <button type="button" onClick={() => setAppPickerOpen(true)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-50"><FolderOpen size={13} /> From app</button>
                      </div>
                      <p className="mt-2 text-[11.5px]">…or just start the conversation.</p>
                    </div>
                  ) : groupOrder.map(g => (
                    <div key={g}>
                      <div className="mb-1 flex items-center justify-between px-1">
                        <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-400">{g}</span>
                        <span className="text-[10px] font-semibold text-slate-300">{groups[g].length}</span>
                      </div>
                      <div className="divide-y divide-slate-50 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        {groups[g].map(i => {
                          const kind = attachmentKindFor(items[i].name);
                          const Icon = KIND_ICON[kind];
                          const on = checked.has(i);
                          return (
                            <label key={i} className={cn('flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors', on ? 'bg-blue-50/40' : 'hover:bg-slate-50')}>
                              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', KIND_SQ[kind])}><Icon size={14} /></span>
                              <span className="min-w-0 flex-1 truncate text-[13px] text-slate-700">{items[i].name}</span>
                              <input type="checkbox" checked={on} onChange={() => toggle(i)} className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {footer}
          </>
        )}

        {/* "Add from app" — pick an existing document already stored in TrackSmart */}
        {appPickerOpen && (
          <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/50 p-4" onClick={closeAppPicker}>
            <div className="flex h-[80vh] max-h-[680px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white"><FolderOpen size={16} /></span>
                <div className="min-w-0">
                  <h4 className="text-[14px] font-bold leading-tight text-slate-900">Add from app</h4>
                  <p className="text-[11.5px] text-slate-500">Attach a document already stored in TrackSmart.</p>
                </div>
                <button onClick={closeAppPicker} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
              </div>
              <div className="px-5 pt-3">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={appSearch} onChange={e => setAppSearch(e.target.value)} placeholder="Search documents…"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15" />
                </div>
              </div>
              {/* Entity tabs — Carrier / Asset / Driver */}
              {appTabs.length > 0 && (
                <div className="flex items-center gap-1 border-b border-slate-100 px-4 pt-2">
                  {appTabs.map(e => {
                    const meta = APP_ENTITY_META[e]; const EntIcon = meta.icon;
                    const count = appGroups[e]?.length ?? 0;
                    const on = activeAppTab === e;
                    return (
                      <button key={e} type="button" onClick={() => selectAppTab(e)}
                        className={cn('-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-semibold transition-colors',
                          on ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
                        <EntIcon size={14} /> {e}
                        <span className={cn('inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold', on ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500')}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {(() => {
                // Path (mirrors Default Compliance): Carrier → records → files.
                // Asset/Driver → subject roster → records → files. Search shows a flat file list.
                const entityDocs = appGroups[activeAppTab] ?? [];
                const searching = !!appSearch.trim();
                const isCarrier = activeAppTab === 'Carrier';
                const RosterIcon = APP_ENTITY_META[activeAppTab]?.icon ?? FolderOpen;

                // Docs scoped to the chosen subject (all, for Carrier / search).
                const scopeDocs = (searching || isCarrier) ? entityDocs
                  : appSubject ? entityDocs.filter(d => d.subjectId === appSubject) : [];
                const subjectName = appSubject ? (entityDocs.find(d => d.subjectId === appSubject)?.subject ?? '') : (isCarrier ? 'Carrier' : '');
                const recordName = appRecord ? (scopeDocs.find(d => d.recordId === appRecord)?.record ?? '') : '';

                const level = searching ? 'files'
                  : (!isCarrier && !appSubject) ? 'roster'
                  : !appRecord ? 'records' : 'files';

                // Level data: distinct {id,label,count} groups.
                const distinct = (rows: AppDocument[], keyOf: (d: AppDocument) => string, labelOf: (d: AppDocument) => string): { id: string; label: string; count: number }[] => {
                  const m = new Map<string, { label: string; count: number }>();
                  rows.forEach(d => { const k = keyOf(d); const cur = m.get(k) ?? { label: labelOf(d), count: 0 }; cur.count++; m.set(k, cur); });
                  return [...m.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => a.label.localeCompare(b.label));
                };
                const roster = level === 'roster' ? distinct(entityDocs, d => d.subjectId, d => d.subject) : [];
                const records = level === 'records' ? distinct(scopeDocs, d => d.recordId, d => d.record) : [];
                const fileDocs = level === 'files' ? (appRecord ? scopeDocs.filter(d => d.recordId === appRecord) : scopeDocs) : [];

                const fileRow = (d: AppDocument, i: number) => {
                  const kind = attachmentKindFor(d.name);
                  const Icon = KIND_ICON[kind];
                  const already = items.some(it => it.name === d.name);
                  const on = appPicked.has(d.name);
                  const sub = searching ? `${d.record} · ${d.subject}` : '';
                  return (
                    <div key={`${d.name}-${i}`} onClick={() => !already && toggleAppPick(d.name)}
                      className={cn('flex items-center gap-3 px-3 py-2.5 transition-colors', already ? 'opacity-60' : on ? 'cursor-pointer bg-blue-50/60' : 'cursor-pointer hover:bg-slate-50')}>
                      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', KIND_SQ[kind])}><Icon size={15} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-slate-700">{d.name}</span>
                        {sub && <span className="block truncate text-[11.5px] text-slate-400">{sub}</span>}
                      </span>
                      <button type="button" onClick={ev => { ev.stopPropagation(); setAppPreview(d); }} title="View document"
                        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-blue-600"><Eye size={14} /> View</button>
                      {already
                        ? <span className="shrink-0 text-[10.5px] font-semibold text-slate-400">Added</span>
                        : <input type="checkbox" checked={on} readOnly tabIndex={-1}
                            className="pointer-events-none h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600" />}
                    </div>
                  );
                };

                return (
                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {/* Breadcrumb / back header */}
                    {!searching && (appSubject || appRecord || isCarrier) && (
                      <div className="mb-2 flex items-center gap-2">
                        {(appSubject || appRecord) && (
                          <button type="button" onClick={() => (appRecord ? setAppRecord(null) : setAppSubject(null))}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">
                            <ChevronLeft size={14} /> Back
                          </button>
                        )}
                        <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] font-bold text-slate-800">
                          <RosterIcon size={14} className="shrink-0 text-slate-400" />
                          <span className="truncate">{subjectName}{recordName ? <span className="font-medium text-slate-400"> › {recordName}</span> : ''}</span>
                        </span>
                      </div>
                    )}

                    {appDocs.length === 0 ? (
                      <p className="px-3 py-12 text-center text-[12.5px] text-slate-400">No documents stored in the app yet.</p>
                    ) : level === 'roster' ? (
                      roster.length === 0 ? (
                        <p className="px-3 py-12 text-center text-[12.5px] text-slate-400">No {activeAppTab.toLowerCase()}s with documents.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                          {roster.map(s => (
                            <button key={s.id} type="button" onClick={() => openSubject(s.id)}
                              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50">
                              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', APP_ENTITY_META[activeAppTab].tone)}><RosterIcon size={15} /></span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-semibold text-slate-800">{s.label}</span>
                                <span className="block text-[11.5px] text-slate-400">{s.count} document{s.count !== 1 ? 's' : ''}</span>
                              </span>
                              <ChevronRight size={16} className="shrink-0 text-slate-300" />
                            </button>
                          ))}
                        </div>
                      )
                    ) : level === 'records' ? (
                      records.length === 0 ? (
                        <p className="px-3 py-12 text-center text-[12.5px] text-slate-400">No documents here.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                          {records.map(r => (
                            <button key={r.id} type="button" onClick={() => setAppRecord(r.id)}
                              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><FileText size={15} /></span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-semibold text-slate-800">{r.label}</span>
                                <span className="block text-[11.5px] text-slate-400">{r.count} file{r.count !== 1 ? 's' : ''}</span>
                              </span>
                              <ChevronRight size={16} className="shrink-0 text-slate-300" />
                            </button>
                          ))}
                        </div>
                      )
                    ) : (
                      fileDocs.length === 0 ? (
                        <p className="px-3 py-12 text-center text-[12.5px] text-slate-400">No documents{searching ? ' match your search' : ''}.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                          {fileDocs.map(fileRow)}
                        </div>
                      )
                    )}
                  </div>
                );
              })()}
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3.5">
                <span className="text-[12px] text-slate-400">{appPicked.size} selected</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={closeAppPicker} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button type="button" disabled={appPicked.size === 0} onClick={confirmAppPick}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
                    <Check size={15} /> Add{appPicked.size ? ` ${appPicked.size}` : ''}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Document preview (from the "View" action in the app picker) */}
        {appPreview && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/70 p-4" onClick={() => setAppPreview(null)}>
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{appPreview.name}</p>
                  <p className="truncate text-[11px] text-slate-400">{appPreview.record} · {appPreview.subject}</p>
                </div>
                <button onClick={() => setAppPreview(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
              </div>
              <div className="p-4">
                {appPreview.url && attachmentKindFor(appPreview.name) === 'image' ? (
                  <img src={appPreview.url} alt={appPreview.name} className="max-h-[60vh] w-full rounded-xl bg-slate-50 object-contain" />
                ) : appPreview.url && attachmentKindFor(appPreview.name) === 'pdf' ? (
                  <iframe title={appPreview.name} src={appPreview.url} className="h-[60vh] w-full rounded-xl border border-slate-200" />
                ) : (
                  <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                    <FileText size={44} />
                    <p className="mt-2 px-4 text-center text-sm font-semibold text-slate-500">{appPreview.name}</p>
                    <p className="mt-0.5 text-[11px]">No preview available</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
                <button type="button" onClick={() => setAppPreview(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Close</button>
                {!items.some(it => it.name === appPreview.name) && (
                  <button type="button" onClick={() => { addItems([{ name: appPreview.name, group: `${appPreview.entity} · ${appPreview.subject}` }]); setAppPreview(null); }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Check size={15} /> Add this</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── small building blocks ────────────────────────────────────────────────────
function FieldLabel({ children, className, small }: { children: ReactNode; className?: string; small?: boolean }) {
  return <label className={cn('mb-1.5 block font-semibold text-slate-500', small ? 'text-[10px] uppercase tracking-wide' : 'text-[11px]', className)}>{children}</label>;
}

function ChannelTile({ active, onClick, icon: Icon, label, sub }: { active: boolean; onClick: () => void; icon: LucideIcon; label: string; sub: string }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors',
        active ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}>
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500')}><Icon size={15} /></span>
      <span className="min-w-0">
        <span className={cn('block text-[13px] font-semibold', active ? 'text-blue-900' : 'text-slate-700')}>{label}</span>
        <span className="block truncate text-[11px] text-slate-400">{sub}</span>
      </span>
    </button>
  );
}

function TypeChip({ icon: Icon, tone, label }: { icon: LucideIcon; tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
      <Icon size={11} className={tone} /> {label}
    </span>
  );
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '?';
}

// The store owns the real token; for the success link we re-read it from the store.
function conversationToken(convId: string): string {
  return getConversations().find(x => x.id === convId)?.linkToken ?? '';
}
