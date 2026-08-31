import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Send, Paperclip, Phone, Video, MoreVertical, ChevronLeft, Plus,
  CheckCheck, Smile, MessageSquare, ArrowLeftRight,
  Image as ImageIcon, Play, FileText, Mail, Hash, Download, Eye, Share2, X, Clock,
  Bot, Users, Link2, Copy, Ban, RotateCcw, ShieldCheck, ExternalLink,
  GraduationCap, PenLine, ClipboardList, Upload, ClipboardCheck, FileWarning, BellRing, Megaphone, UserX, CheckCircle2, CornerUpRight,
  AlertTriangle, Ticket, UserPlus, Sparkles, ArrowRight, DollarSign, AtSign, Slash, Building2,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useConversations, sendMessage, markRead, setExternalEnabled, startNewExternalChat,
  externalChatUrl, consumeMessagesFocus, setPendingRecord, setWidgetStatus,
  askAgent, useAiTyping,
  type Conversation, type RoleTag, type MsgAttachment, type AttachmentKind, type RecordRef,
  type ChatWidget, type WidgetKind,
} from './messages-store';
import {
  DEFAULT_AGENT_PROMPTS, getAgent,
  type AiPanel, type AiTone, type AgentIntent, type AiAction, type AiActionIcon, type AgentCommand,
} from './ai-agents';
import { ShareToChat } from '@/components/share/ShareToChat';

// ─────────────────────────────────────────────────────────────────────────────
// Messages — the app's chat hub. A searchable conversation list, the selected
// thread with composer, and a contact/profile panel. Conversations come from the
// shared messages-store, so anything shared from tickets / accidents / safety
// events (in-app OR to an outsider by email) shows up here. External chats carry
// a secure link and can be disabled; attachments shared in a chat also populate
// the profile's media tabs.
// ─────────────────────────────────────────────────────────────────────────────

// Short access-role classification shown as a colored chip beside every name.
const ROLE_TONE: Record<RoleTag, string> = {
  'Super Admin': 'bg-purple-100 text-purple-700 ring-purple-200',
  Admin:         'bg-indigo-100 text-indigo-700 ring-indigo-200',
  Manager:       'bg-blue-100 text-blue-700 ring-blue-200',
  Dispatch:      'bg-cyan-100 text-cyan-700 ring-cyan-200',
  Safety:        'bg-emerald-100 text-emerald-700 ring-emerald-200',
  Driver:        'bg-amber-100 text-amber-700 ring-amber-200',
  Adjuster:      'bg-rose-100 text-rose-700 ring-rose-200',
  External:      'bg-orange-100 text-orange-700 ring-orange-200',
  'AI Agent':    'bg-violet-100 text-violet-700 ring-violet-200',
};

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '?';
}

function RoleBadge({ tag, className }: { tag: RoleTag; className?: string }) {
  return (
    <span className={cn('shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset', ROLE_TONE[tag], className)}>
      {tag}
    </span>
  );
}

// Prefer a conversation's chat-tag (Adjuster, Insurance Agent …) over the generic
// role badge when one is set (external / shared chats).
function ConvBadge({ conv, className }: { conv: Conversation; className?: string }) {
  if (conv.tag) {
    return (
      <span className={cn('shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset', conv.tagColor ?? 'bg-orange-100 text-orange-700 ring-orange-200', className)}>
        {conv.tag}
      </span>
    );
  }
  return <RoleBadge tag={conv.roleTag} className={className} />;
}

// ── Contact profile + media shared in each conversation (3rd column) ──────────
interface PhotoItem { id: string; hue: string; caption: string }
interface VideoItem { id: string; hue: string; duration: string; caption: string }
interface DocItem { id: string; name: string; size: string; ext: string }
interface ContactDetails {
  userId: string;
  email: string;
  phone: string;
  media: { photos: PhotoItem[]; videos: VideoItem[]; docs: DocItem[] };
}

const HUES = [
  'from-sky-400 to-blue-500', 'from-emerald-400 to-teal-500', 'from-amber-400 to-orange-500',
  'from-fuchsia-400 to-pink-500', 'from-violet-400 to-indigo-500', 'from-rose-400 to-red-500',
  'from-cyan-400 to-sky-500', 'from-lime-400 to-emerald-500',
];
const h = (i: number) => HUES[i % HUES.length];

// Rich profiles for the seeded contacts. Anything not listed here is derived from
// the conversation itself (email, source, and files shared in the thread).
const CONTACT_DETAILS: Record<string, ContactDetails> = {
  c1: {
    userId: 'DRV-2001', email: 'john.smith@acmelogistics.co', phone: '+1 (512) 555-0142',
    media: {
      photos: [{ id: 'p1', hue: h(0), caption: 'BOL — Dallas' }, { id: 'p2', hue: h(1), caption: 'Pickup dock' }, { id: 'p3', hue: h(2), caption: 'Odometer' }],
      videos: [{ id: 'v1', hue: h(4), duration: '0:42', caption: 'Dashcam clip' }],
      docs: [{ id: 'd1', name: 'Rate-confirmation.pdf', size: '240 KB', ext: 'PDF' }, { id: 'd2', name: 'BOL-4821.pdf', size: '1.2 MB', ext: 'PDF' }],
    },
  },
  c2: {
    userId: 'USR-0007', email: 'dana.whitfield@acmelogistics.co', phone: '+1 (512) 555-0110',
    media: {
      photos: [{ id: 'p1', hue: h(3), caption: 'Event snapshot' }],
      videos: [{ id: 'v1', hue: h(5), duration: '0:12', caption: 'Harsh-brake clip' }, { id: 'v2', hue: h(0), duration: '0:20', caption: 'Cabin view' }],
      docs: [{ id: 'd1', name: 'Warning-letter.pdf', size: '88 KB', ext: 'PDF' }],
    },
  },
  c3: {
    userId: 'DRV-2002', email: 'maria.rodriguez@acmelogistics.co', phone: '+1 (312) 555-0188',
    media: {
      photos: [{ id: 'p1', hue: h(1), caption: 'Medical cert' }, { id: 'p2', hue: h(6), caption: 'License front' }],
      videos: [],
      docs: [{ id: 'd1', name: 'Medical-Certificate.pdf', size: '320 KB', ext: 'PDF' }, { id: 'd2', name: 'License-front.jpg', size: '900 KB', ext: 'JPG' }],
    },
  },
  c4: {
    userId: 'USR-0102', email: 'dispatch@acmelogistics.co', phone: '+1 (512) 555-0100',
    media: {
      photos: [],
      videos: [],
      docs: [{ id: 'd1', name: 'Load-4821.pdf', size: '150 KB', ext: 'PDF' }, { id: 'd2', name: 'Route-Reno.pdf', size: '210 KB', ext: 'PDF' }],
    },
  },
  c5: {
    userId: 'DRV-2003', email: 'mike.johnson@acmelogistics.co', phone: '+1 (702) 555-0166',
    media: {
      photos: [{ id: 'p1', hue: h(2), caption: 'Fuel receipt' }],
      videos: [],
      docs: [{ id: 'd1', name: 'Fuel-receipt-Vegas.jpg', size: '640 KB', ext: 'JPG' }],
    },
  },
  c6: {
    userId: 'USR-0311', email: 'priya.nair@sentinelclaims.com', phone: '+1 (415) 555-0123',
    media: {
      photos: [{ id: 'p1', hue: h(5), caption: 'Damage — front' }, { id: 'p2', hue: h(3), caption: 'Damage — rear' }, { id: 'p3', hue: h(4), caption: 'Trailer' }, { id: 'p4', hue: h(0), caption: 'Scene' }],
      videos: [{ id: 'v1', hue: h(1), duration: '1:05', caption: 'Scene walkthrough' }],
      docs: [{ id: 'd1', name: 'ACC-2026-0021-report.pdf', size: '2.1 MB', ext: 'PDF' }, { id: 'd2', name: 'Repair-estimate.pdf', size: '480 KB', ext: 'PDF' }],
    },
  },
  c7: { userId: 'SADM-0001', email: 'linda.martinez@acmelogistics.co', phone: '+1 (512) 555-0001',
    media: { photos: [], videos: [], docs: [{ id: 'd1', name: 'Carrier-profile.pdf', size: '210 KB', ext: 'PDF' }, { id: 'd2', name: 'Billing-plan-2026.xlsx', size: '64 KB', ext: 'XLSX' }] } },
  c8: { userId: 'ADM-0031', email: 'david.kim@acmelogistics.co', phone: '+1 (512) 555-0131',
    media: { photos: [], videos: [], docs: [{ id: 'd1', name: 'New-driver-roster.xlsx', size: '52 KB', ext: 'XLSX' }, { id: 'd2', name: 'DQ-assignments.pdf', size: '140 KB', ext: 'PDF' }] } },
  c9: { userId: 'MGR-0012', email: 'sarah.thompson@acmelogistics.co', phone: '+1 (214) 555-0177',
    media: { photos: [{ id: 'p1', hue: h(6), caption: 'Trailer TRL-455' }], videos: [], docs: [{ id: 'd1', name: 'Inspection-schedule.pdf', size: '96 KB', ext: 'PDF' }] } },
  c10: { userId: 'DRV-2101', email: 'robert.chen@acmelogistics.co', phone: '+1 (405) 555-0210',
    media: { photos: [{ id: 'p1', hue: h(0), caption: 'I-40 dashcam' }], videos: [{ id: 'v1', hue: h(5), duration: '0:18', caption: 'Hard-brake clip' }], docs: [{ id: 'd1', name: 'Trip-log-TRK-201.pdf', size: '180 KB', ext: 'PDF' }] } },
  c11: { userId: 'ADM-0032', email: 'angela.foster@acmelogistics.co', phone: '+1 (512) 555-0132',
    media: { photos: [], videos: [], docs: [{ id: 'd1', name: 'Expiring-certs.pdf', size: '78 KB', ext: 'PDF' }] } },
  c12: { userId: 'DRV-2102', email: 'james.sullivan@acmelogistics.co', phone: '+1 (775) 555-0455',
    media: { photos: [{ id: 'p1', hue: h(2), caption: 'Reno yard' }], videos: [], docs: [{ id: 'd1', name: 'BOL-Reno.pdf', size: '260 KB', ext: 'PDF' }] } },
  c13: { userId: 'MGR-0013', email: 'tom.bradley@acmelogistics.co', phone: '+1 (512) 555-0140',
    media: { photos: [{ id: 'p1', hue: h(3), caption: 'Dock 4 repairs' }], videos: [], docs: [{ id: 'd1', name: 'Terminal-report.pdf', size: '112 KB', ext: 'PDF' }] } },
  c14: { userId: 'DRV-2103', email: 'kevin.obrien@acmelogistics.co', phone: '+1 (312) 555-0310',
    media: { photos: [], videos: [], docs: [{ id: 'd1', name: 'CDL-renewal-notice.pdf', size: '54 KB', ext: 'PDF' }] } },
  c15: { userId: 'ADM-0033', email: 'rachel.green@acmelogistics.co', phone: '+1 (512) 555-0133',
    media: { photos: [], videos: [], docs: [{ id: 'd1', name: 'Onboarding-packet.pdf', size: '320 KB', ext: 'PDF' }] } },
  'ai-hiring': { userId: 'AGENT-HIRING', email: 'hiring@tracksmart.ai', phone: 'Always available',
    media: { photos: [], videos: [], docs: [{ id: 'd1', name: 'Hiring-pipeline.pdf', size: '140 KB', ext: 'PDF' }] } },
  'ai-safety': { userId: 'AGENT-SAFETY', email: 'safety@tracksmart.ai', phone: 'Always available',
    media: { photos: [], videos: [], docs: [{ id: 'd1', name: 'Safety-summary.pdf', size: '180 KB', ext: 'PDF' }] } },
  'ai-hos': { userId: 'AGENT-HOS', email: 'hos@tracksmart.ai', phone: 'Always available',
    media: { photos: [], videos: [], docs: [] } },
  'ai-violations': { userId: 'AGENT-VIOLATIONS', email: 'violations@tracksmart.ai', phone: 'Always available',
    media: { photos: [], videos: [], docs: [{ id: 'd1', name: 'Open-violations.pdf', size: '104 KB', ext: 'PDF' }] } },
  'ai-dq': { userId: 'AGENT-DQ', email: 'dq@tracksmart.ai', phone: 'Always available',
    media: { photos: [], videos: [], docs: [{ id: 'd1', name: 'Expiring-credentials.pdf', size: '96 KB', ext: 'PDF' }] } },
  'ai-account': { userId: 'AGENT-ACCOUNT', email: 'account@tracksmart.ai', phone: 'Always available',
    media: { photos: [], videos: [], docs: [{ id: 'd1', name: 'Account-overview.pdf', size: '120 KB', ext: 'PDF' }] } },
  'ai-paystub': { userId: 'AGENT-PAYROLL', email: 'payroll@tracksmart.ai', phone: 'Always available',
    media: { photos: [], videos: [], docs: [{ id: 'd1', name: 'Pay-run-Aug25.pdf', size: '150 KB', ext: 'PDF' }] } },
};
// Build a profile from the conversation itself — used for shared / external
// chats that have no hand-written entry. Files shared in the thread become media.
function deriveDetails(conv: Conversation): ContactDetails {
  const explicit = CONTACT_DETAILS[conv.id];
  const photos: PhotoItem[] = []; const videos: VideoItem[] = []; const docs: DocItem[] = [];
  let pi = 0;
  conv.messages.forEach(m => m.attachments?.forEach(a => {
    if (a.kind === 'image') photos.push({ id: a.id, hue: h(pi++), caption: a.name });
    else if (a.kind === 'video') videos.push({ id: a.id, hue: h(pi++), duration: '0:30', caption: a.name });
    else docs.push({ id: a.id, name: a.name, size: '—', ext: (a.name.split('.').pop() ?? 'DOC').toUpperCase() });
  }));
  if (explicit) {
    // Merge shared files on top of the hand-written profile.
    return {
      ...explicit,
      media: {
        photos: [...explicit.media.photos, ...photos],
        videos: [...explicit.media.videos, ...videos],
        docs: [...explicit.media.docs, ...docs],
      },
    };
  }
  return {
    userId: conv.kind === 'external'
      ? (conv.linkToken ? `EXT-${conv.linkToken.slice(0, 6).toUpperCase()}` : 'EXTERNAL')
      : `USR-${conv.id.toUpperCase()}`,
    email: conv.email ?? '—',
    phone: conv.kind === 'external' ? 'External · via chat link' : '—',
    media: { photos, videos, docs },
  };
}

const EXT_TONE: Record<string, string> = {
  PDF: 'bg-rose-50 text-rose-600', JPG: 'bg-amber-50 text-amber-600', PNG: 'bg-amber-50 text-amber-600',
  MP4: 'bg-violet-50 text-violet-600', MOV: 'bg-violet-50 text-violet-600',
  DOCX: 'bg-blue-50 text-blue-600', XLSX: 'bg-emerald-50 text-emerald-600',
};

const ATT_ICON: Record<AttachmentKind, LucideIcon> = { pdf: FileText, image: ImageIcon, video: Video, doc: FileText };

// Task-widget presentation — light card, soft per-type accent. `navigates` = the
// primary action opens the linked record. `sq` = icon square, `btn` = action button.
const WIDGET_META: Record<WidgetKind, { icon: LucideIcon; sq: string; btn: string; action: string; done: string; navigates?: boolean }> = {
  training:         { icon: GraduationCap,  sq: 'bg-violet-50 text-violet-600',  btn: 'bg-violet-600 hover:bg-violet-700',   action: 'Start training',   done: 'Training completed' },
  signature:        { icon: PenLine,        sq: 'bg-blue-50 text-blue-600',      btn: 'bg-blue-600 hover:bg-blue-700',       action: 'Review & sign',    done: 'Signed' },
  form:             { icon: ClipboardList,  sq: 'bg-sky-50 text-sky-600',        btn: 'bg-sky-600 hover:bg-sky-700',         action: 'Fill form',        done: 'Form submitted' },
  upload:           { icon: Upload,         sq: 'bg-emerald-50 text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700', action: 'Upload documents', done: 'Uploaded' },
  review:           { icon: ClipboardCheck, sq: 'bg-indigo-50 text-indigo-600',  btn: 'bg-indigo-600 hover:bg-indigo-700',   action: 'Open to review',   done: 'Reviewed', navigates: true },
  verify:           { icon: ShieldCheck,    sq: 'bg-emerald-50 text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700', action: 'Verify',          done: 'Verified' },
  'warning-letter': { icon: FileWarning,    sq: 'bg-amber-50 text-amber-600',    btn: 'bg-amber-500 hover:bg-amber-600',     action: 'Acknowledge & sign', done: 'Acknowledged' },
  alert:            { icon: BellRing,       sq: 'bg-orange-50 text-orange-600',  btn: 'bg-orange-500 hover:bg-orange-600',   action: 'Acknowledge',      done: 'Acknowledged' },
  notice:           { icon: Megaphone,      sq: 'bg-sky-50 text-sky-600',        btn: 'bg-sky-600 hover:bg-sky-700',         action: 'Acknowledge',      done: 'Acknowledged' },
  termination:      { icon: UserX,          sq: 'bg-rose-50 text-rose-600',      btn: 'bg-rose-600 hover:bg-rose-700',       action: 'Acknowledge',      done: 'Acknowledged' },
  forward:          { icon: CornerUpRight,  sq: 'bg-slate-100 text-slate-500',   btn: 'bg-slate-600 hover:bg-slate-700',     action: 'Open',             done: 'Opened', navigates: true },
  record:           { icon: FileText,       sq: 'bg-blue-50 text-blue-600',      btn: 'bg-blue-600 hover:bg-blue-700',       action: 'Open record',      done: 'Opened', navigates: true },
};

// Short verb shown in a message-card header when it carries a task widget.
const WIDGET_VERB: Record<WidgetKind, string> = {
  training: 'Assigned training', signature: 'Signature request', form: 'Form request',
  upload: 'Document request', review: 'Review request', verify: 'Verification request',
  'warning-letter': 'Warning letter', alert: 'Alert', notice: 'Notice',
  termination: 'Termination notice', forward: 'Forwarded item', record: 'Shared record',
};

// The colored "action" line in a message-card header (like the screenshot's
// "Sent package" / "Requested documents"): a verb + icon summarizing what the
// message carries. Plain chatter returns null (no verb, just name + time).
function headerAction(m: { fromMe: boolean; attachments?: MsgAttachment[]; record?: RecordRef; widget?: ChatWidget }):
  { label: string; Icon: LucideIcon } | null {
  if (m.widget) return { label: WIDGET_VERB[m.widget.kind], Icon: WIDGET_META[m.widget.kind].icon };
  if (m.record) return { label: 'Shared record', Icon: Link2 };
  if (m.attachments && m.attachments.length) return { label: m.fromMe ? 'Sent files' : 'Shared files', Icon: m.fromMe ? Send : Paperclip };
  return null;
}

// One attached file inside a message card — filename + View + Download actions.
function AttachmentChip({ att, onView, onDownload }: { att: MsgAttachment; onView: () => void; onDownload: () => void }) {
  const Icon = ATT_ICON[att.kind];
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 ring-1 ring-slate-200">
      <Icon size={13} className="shrink-0 text-slate-400" />
      <span className="max-w-[150px] truncate text-[11.5px] font-medium text-slate-700" title={att.name}>{att.name}</span>
      <span className="ml-0.5 flex items-center gap-0.5 border-l border-slate-100 pl-1">
        <button type="button" onClick={onView} title="View"
          className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[10.5px] font-semibold text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600"><Eye size={12} /> View</button>
        <button type="button" onClick={onDownload} title="Download"
          className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[10.5px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"><Download size={12} /> Download</button>
      </span>
    </div>
  );
}

// Colored chip tone for a Priority/Status value (overdue→rose, due→amber, ok→emerald).
function valueTone(v: string): string {
  const s = v.toLowerCase();
  if (/(overdue|critical|urgent|high|expired|fail|missing)/.test(s)) return 'bg-rose-100 text-rose-700';
  if (/(due|soon|medium|pending|await|warn)/.test(s)) return 'bg-amber-100 text-amber-700';
  if (/(on track|valid|complete|verified|active|current|low|ok|good)/.test(s)) return 'bg-emerald-100 text-emerald-700';
  return 'bg-slate-100 text-slate-600';
}

// ── AI agent data panel ──────────────────────────────────────────────────────
// The rich data card an AI agent attaches to a reply (drivers / documents /
// expiring / accidents / tickets / hiring): a header, KPI tiles, a list of rows
// with colored status chips, and a deep-link into the matching page.
const AI_TONE: Record<AiTone, { chip: string; num: string; sq: string }> = {
  rose:    { chip: 'bg-rose-100 text-rose-700',       num: 'text-rose-600',    sq: 'bg-rose-50 text-rose-600' },
  amber:   { chip: 'bg-amber-100 text-amber-700',     num: 'text-amber-600',   sq: 'bg-amber-50 text-amber-600' },
  emerald: { chip: 'bg-emerald-100 text-emerald-700', num: 'text-emerald-600', sq: 'bg-emerald-50 text-emerald-600' },
  blue:    { chip: 'bg-blue-100 text-blue-700',       num: 'text-blue-600',    sq: 'bg-blue-50 text-blue-600' },
  violet:  { chip: 'bg-violet-100 text-violet-700',   num: 'text-violet-600',  sq: 'bg-violet-50 text-violet-600' },
  slate:   { chip: 'bg-slate-100 text-slate-600',     num: 'text-slate-700',   sq: 'bg-slate-100 text-slate-500' },
};

const AI_INTENT: Record<AgentIntent, { icon: LucideIcon; tone: AiTone }> = {
  greeting:   { icon: Sparkles,       tone: 'violet' },
  help:       { icon: Sparkles,       tone: 'violet' },
  drivers:    { icon: Users,          tone: 'blue' },
  documents:  { icon: FileText,       tone: 'blue' },
  expiring:   { icon: BellRing,       tone: 'amber' },
  accidents:  { icon: AlertTriangle,  tone: 'rose' },
  tickets:    { icon: Ticket,         tone: 'amber' },
  hiring:     { icon: UserPlus,       tone: 'violet' },
  onboarding: { icon: UserPlus,       tone: 'violet' },
  safety:     { icon: ShieldCheck,    tone: 'rose' },
  hos:        { icon: Clock,          tone: 'amber' },
  violations: { icon: AlertTriangle,  tone: 'amber' },
  dqfiles:    { icon: ClipboardCheck, tone: 'blue' },
  account:    { icon: Building2,      tone: 'emerald' },
  paystub:    { icon: DollarSign,     tone: 'emerald' },
};

// Action-result card icons (the agent "did something").
const AI_ACTION_ICON: Record<AiActionIcon, LucideIcon> = {
  mail: Mail, send: Send, check: CheckCircle2, bell: BellRing, upload: Upload,
  graduation: GraduationCap, file: FileText, user: Users, dollar: DollarSign, clipboard: ClipboardList,
};

// A compact "the agent did it" result card — icon + title + status, with an
// optional button to open the driver's chat where the message was delivered.
function AiActionCard({ action, onOpen }: { action: AiAction; onOpen?: (convId: string) => void }) {
  const Icon = AI_ACTION_ICON[action.icon];
  const tone = AI_TONE[action.tone];
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tone.sq)}><Icon size={17} /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-slate-800">{action.title}</p>
        {action.detail && <p className="truncate text-[11.5px] text-slate-500">{action.detail}</p>}
      </div>
      {action.status && <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', tone.chip)}>{action.status}</span>}
      {action.openConvId && onOpen && (
        <button type="button" onClick={() => onOpen(action.openConvId!)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-slate-700">
          {action.openLabel ?? 'Open chat'} <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}

function AiPanelCard({ panel, onOpen }: { panel: AiPanel; onOpen?: (path: string) => void }) {
  const { icon: Icon, tone } = AI_INTENT[panel.intent];
  const accent = AI_TONE[tone];
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-2.5 border-b border-slate-100 p-3">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', accent.sq)}><Icon size={17} /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-bold text-slate-800">{panel.title}</p>
          {panel.summary && <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{panel.summary}</p>}
        </div>
      </div>

      {/* KPI tiles */}
      {panel.stats && panel.stats.length > 0 && (
        <div className={cn('grid gap-px bg-slate-100', panel.stats.length >= 4 ? 'grid-cols-4' : panel.stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
          {panel.stats.map(s => (
            <div key={s.label} className="bg-white px-2.5 py-2 text-center">
              <p className={cn('text-[17px] font-extrabold leading-none', s.tone ? AI_TONE[s.tone].num : 'text-slate-700')}>{s.value}</p>
              <p className="mt-1 text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Rows */}
      {panel.rows && panel.rows.length > 0 && (
        <div className="divide-y divide-slate-50">
          {panel.rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-slate-800">{r.title}</p>
                {r.subtitle && <p className="truncate text-[11px] text-slate-500">{r.subtitle}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {r.badge && <span className={cn('rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide', r.tone ? AI_TONE[r.tone].chip : 'bg-slate-100 text-slate-600')}>{r.badge}</span>}
                {r.meta && <span className="text-[10.5px] font-medium text-slate-400">{r.meta}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footnote + deep link */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-2.5">
        <span className="min-w-0 truncate text-[10.5px] font-medium text-slate-400">{panel.footnote}</span>
        {panel.link && (
          <button type="button" onClick={() => onOpen?.(panel.link!.path)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-slate-700">
            {panel.link.label} <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

// A task card inside a chat bubble — a titled header, a data grid of the record's
// details (from widget.meta), and the primary action. Always light for readability.
function ChatTaskCard({ widget, onComplete, onOpenRecord }: {
  widget: ChatWidget; onComplete: () => void; onOpenRecord?: (r: RecordRef) => void;
}) {
  const meta = WIDGET_META[widget.kind];
  const Icon = meta.icon;
  const done = widget.status === 'done';
  const kindLabel = WIDGET_VERB[widget.kind];
  const primary = () => {
    if (meta.navigates && widget.record && onOpenRecord) { onOpenRecord(widget.record); }
    if (!done) onComplete();
  };
  // Pull Priority/Status out for colored chips; the rest render as a labelled grid.
  const entries = Object.entries(widget.meta ?? {});
  const priority = entries.find(([k]) => /^priority$/i.test(k))?.[1];
  const status = entries.find(([k]) => /^status$/i.test(k))?.[1];
  const gridEntries = entries.filter(([k]) => !/^(priority|status)$/i.test(k));
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-2.5 p-3">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', meta.sq)}><Icon size={16} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn('rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide', meta.sq)}>{kindLabel}</span>
            {priority && <span className={cn('rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide', valueTone(priority))}>{priority}</span>}
            {status && <span className={cn('rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide', valueTone(status))}>{status}</span>}
          </div>
          <p className="mt-1 truncate text-[13px] font-bold text-slate-800">{widget.title}</p>
          {widget.subtitle && <p className="truncate text-[11px] text-slate-500">{widget.subtitle}</p>}
        </div>
      </div>
      {gridEntries.length > 0 && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 bg-slate-50/70 px-3 py-2.5">
          {gridEntries.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{k}</p>
              <p className="truncate text-[11.5px] font-semibold text-slate-700" title={v}>{v}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-2.5">
        {done ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[12px] font-bold text-emerald-700">
            <CheckCircle2 size={13} /> {widget.doneLabel || meta.done}
          </span>
        ) : (
          <button type="button" onClick={primary}
            className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold text-white transition-colors', meta.btn)}>
            {meta.navigates && <ExternalLink size={12} />} {widget.actionLabel || meta.action}
          </button>
        )}
        {widget.record && !meta.navigates && onOpenRecord && (
          <button type="button" onClick={() => onOpenRecord(widget.record!)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700">
            Open record <ExternalLink size={10} />
          </button>
        )}
      </div>
    </div>
  );
}

type PreviewItem = { type: 'photo' | 'video' | 'doc'; title: string; hue?: string; sub?: string };

export function MessagesPage({ currentUserName, onNavigate }: { currentUserName?: string; onNavigate?: (path: string) => void }) {
  const convos = useConversations();
  const typingIds = useAiTyping();
  const [selectedId, setSelectedId] = useState<string>(() => consumeMessagesFocus() ?? convos[0]?.id ?? '');
  const [listTab, setListTab] = useState<'contacts' | 'ai'>('contacts');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [infoTab, setInfoTab] = useState<'photos' | 'videos' | 'docs'>('photos');
  const [chatView, setChatView] = useState<'chat' | 'profile'>('chat');
  const [preview, setPreview] = useState<PreviewItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1900);
  };
  const [listOnRight, setListOnRight] = useState<boolean>(() => {
    try { return localStorage.getItem('messages:list-side') === 'right'; } catch { return false; }
  });
  const toggleSide = () => setListOnRight(v => {
    const n = !v;
    try { localStorage.setItem('messages:list-side', n ? 'right' : 'left'); } catch { /* ignore */ }
    return n;
  });
  const endRef = useRef<HTMLDivElement>(null);

  const selected = convos.find(c => c.id === selectedId) ?? null;
  const details = selected ? deriveDetails(selected) : null;
  // Agent is mid-reply (typing bubble).
  const aiTyping = !!selected?.ai && typingIds.includes(selected.id);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const inTab = convos.filter(c => !!c.ai === (listTab === 'ai'));
    if (!q) return inTab;
    return inTab.filter(c => c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q)
      || c.roleTag.toLowerCase().includes(q) || c.messages.some(m => m.text.toLowerCase().includes(q)));
  }, [convos, search, listTab]);
  const contactsUnread = convos.filter(c => !c.ai).reduce((n, c) => n + c.unread, 0);
  const aiUnread = convos.filter(c => c.ai).reduce((n, c) => n + c.unread, 0);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [selectedId, selected?.messages.length, aiTyping]);
  // Reading a conversation clears its unread — including messages that arrive while it's open.
  useEffect(() => { if (selectedId) markRead(selectedId); }, [selectedId, selected?.messages.length]);

  const select = (id: string) => {
    setSelectedId(id);
    setMobileView('chat');
    setChatView('chat');
    markRead(id);
  };

  const switchTab = (t: 'contacts' | 'ai') => {
    setListTab(t);
    setChatView('chat');
    const inTab = convos.filter(c => !!c.ai === (t === 'ai'));
    if (inTab.length && !inTab.some(c => c.id === selectedId)) select(inTab[0].id);
  };

  const send = () => {
    const text = draft.trim();
    if (!text || !selected) return;
    if (selected.kind === 'external' && (selected.status === 'disabled' || selected.emailOnly)) return;
    if (selected.ai) askAgent(selected.id, text);
    else sendMessage(selected.id, text);
    setDraft('');
    setPicker(null); setPendingCmd(null);
  };

  // Send a canned prompt to the current AI agent (quick-prompt chips).
  const sendPrompt = (text: string) => { if (selected?.ai) askAgent(selected.id, text); };

  // The specialized agent behind this AI chat (its prompts + slash commands).
  const agent = selected?.ai ? getAgent(selected.agentKey) : undefined;

  // Quick-prompt chips: the latest AI reply's follow-ups, else the agent's starters.
  const aiSuggestions = useMemo(() => {
    if (!selected?.ai) return [];
    for (let i = selected.messages.length - 1; i >= 0; i--) {
      const s = selected.messages[i].suggestions;
      if (s && s.length) return s;
    }
    return agent?.prompts ?? DEFAULT_AGENT_PROMPTS;
  }, [selected, agent]);

  // ── @contact / slash-command pickers (AI console helpers) ──
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [picker, setPicker] = useState<null | 'contact' | 'command'>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pendingCmd, setPendingCmd] = useState<AgentCommand | null>(null);

  const pickerContacts = useMemo(() => {
    const q = pickerQuery.toLowerCase();
    return convos.filter(c => c.kind === 'internal' && !c.ai
      && (!q || c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q))).slice(0, 6);
  }, [convos, pickerQuery]);
  const pickerCommands = useMemo(() => {
    const q = pickerQuery.toLowerCase();
    return (agent?.commands ?? []).filter(c => !q || c.id.includes(q) || c.label.toLowerCase().includes(q));
  }, [agent, pickerQuery]);

  const closePicker = () => { setPicker(null); setPendingCmd(null); };

  const onDraftChange = (v: string) => {
    setDraft(v);
    if (!selected?.ai) { setPicker(null); return; }
    const m = v.match(/(?:^|\s)([@/])([\w'’.-]*)$/);
    if (m) { setPicker(m[1] === '@' ? 'contact' : 'command'); setPickerQuery(m[2]); }
    else setPicker(null);
  };

  const runCmd = (cmd: AgentCommand, contactFirst?: string) => {
    if (!selected) return;
    askAgent(selected.id, contactFirst ? `/${cmd.id} @${contactFirst}` : `/${cmd.id}`);
    setDraft(''); closePicker(); taRef.current?.focus();
  };
  const pickCommand = (cmd: AgentCommand) => {
    if (cmd.needsContact) {
      setDraft(d => d.replace(/[/][\w'’.-]*$/, ''));   // drop the /token
      setPendingCmd(cmd); setPicker('contact'); setPickerQuery('');
      taRef.current?.focus();
    } else { runCmd(cmd); }
  };
  const pickContact = (c: Conversation) => {
    const first = c.name.split(' ')[0];
    if (pendingCmd) { runCmd(pendingCmd, first); return; }
    setDraft(d => d.replace(/[@][\w'’.-]*$/, `@${first} `));
    setPicker(null); taRef.current?.focus();
  };
  const openTrigger = (t: '@' | '/') => {
    if (!selected?.ai) return;
    setDraft(d => (d && !d.endsWith(' ') ? d + ' ' : d) + t);
    setPicker(t === '@' ? 'contact' : 'command'); setPickerQuery(''); setPendingCmd(null);
    taRef.current?.focus();
  };

  const disabledExternal = selected?.kind === 'external' && selected.status === 'disabled';
  const oneWayEmail = selected?.kind === 'external' && !!selected.emailOnly;

  const toggleExternal = () => {
    if (!selected || selected.kind !== 'external') return;
    setExternalEnabled(selected.id, selected.status !== 'active');
    notify(selected.status === 'active' ? 'External chat disabled' : 'External chat re-enabled');
  };
  const startNew = () => {
    if (!selected) return;
    const id = startNewExternalChat(selected.id);
    if (id) { select(id); notify('New secure chat link created'); }
  };
  const copyChatLink = () => {
    if (!selected?.linkToken) return;
    try { navigator.clipboard?.writeText(externalChatUrl(selected.linkToken)); } catch { /* ignore */ }
    notify('Chat link copied');
  };

  const previewAttachment = (a: MsgAttachment) => {
    if (a.kind === 'image') setPreview({ type: 'photo', title: a.name, hue: h(0) });
    else if (a.kind === 'video') setPreview({ type: 'video', title: a.name, hue: h(4), sub: 'Video' });
    else setPreview({ type: 'doc', title: a.name, sub: a.name.split('.').pop()?.toUpperCase() });
  };

  // Open a shared record link — stash the id for the destination page, then navigate.
  const openRecord = (rec: RecordRef) => { setPendingRecord(rec.path, rec.id); onNavigate?.(rec.path); };
  const completeWidget = (msgId: string) => { if (selected) { setWidgetStatus(selected.id, msgId, 'done'); notify('Task completed'); } };

  return (
    <div className={cn('flex h-full min-h-0 bg-white', listOnRight && 'md:flex-row-reverse')}>
      {/* ── Conversation list ── */}
      <aside className={cn('w-full shrink-0 flex-col border-slate-200 bg-white md:flex md:w-80 lg:w-96',
        '2xl:w-auto 2xl:shrink 2xl:flex-1 2xl:min-w-[360px] 2xl:max-w-[560px]',
        listOnRight ? 'md:border-l' : 'md:border-r',
        mobileView === 'list' ? 'flex' : 'hidden')}>
        <div className="shrink-0 border-b border-slate-100 px-4 pt-4 pb-3">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              Messages
              {(contactsUnread + aiUnread) > 0 && <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-bold text-white">{contactsUnread + aiUnread}</span>}
            </h1>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={toggleSide} title={listOnRight ? 'Move list to the left' : 'Move list to the right'}
                className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:inline-flex"><ArrowLeftRight size={17} /></button>
              <button type="button" onClick={() => setShareOpen(true)} title="New message / share" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"><Plus size={18} /></button>
            </div>
          </div>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${listTab === 'ai' ? 'AI agents' : 'messages'}…`}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>

          <div className="mt-3 flex gap-1 rounded-lg bg-slate-100 p-0.5">
            {([['contacts', 'Contacts', Users, contactsUnread], ['ai', 'AI Agents', Bot, aiUnread]] as const).map(([id, label, Icon, n]) => (
              <button key={id} type="button" onClick={() => switchTab(id)}
                className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-semibold transition-colors',
                  listTab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                <Icon size={14} /> {label}
                {n > 0 && <span className={cn('inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold', listTab === id ? 'bg-blue-600 text-white' : 'bg-slate-400 text-white')}>{n}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-400">No {listTab === 'ai' ? 'AI agents' : 'conversations'}{search ? ` match “${search}”` : ' yet'}.</div>
          ) : filtered.map(c => {
            const last = c.messages[c.messages.length - 1];
            const active = c.id === selectedId;
            const isExternal = c.kind === 'external';
            return (
              <button key={c.id} type="button" onClick={() => select(c.id)}
                className={cn('flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors',
                  active ? 'bg-blue-50/70' : 'hover:bg-slate-50')}>
                <div className="relative shrink-0">
                  <span className={cn('flex h-11 w-11 items-center justify-center rounded-full text-[13px] font-bold text-white', c.color)}>{c.ai ? <Bot size={20} /> : initials(c.name)}</span>
                  {c.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />}
                  {isExternal && (c.emailOnly
                    ? <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-slate-400"><Mail size={9} className="text-white" /></span>
                    : <span className={cn('absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white', c.status === 'active' ? 'bg-orange-500' : 'bg-slate-400')}><Link2 size={9} className="text-white" /></span>)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('min-w-0 truncate text-[14px] font-semibold', active ? 'text-blue-900' : 'text-slate-800')}>{c.name}</span>
                    <ConvBadge conv={c} />
                    <span className="ml-auto shrink-0 text-[11px] text-slate-400">{c.lastAt}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('truncate text-[12px]', c.unread ? 'font-semibold text-slate-700' : 'text-slate-500')}>
                      {last?.system ? last.text : `${last?.fromMe ? 'You: ' : ''}${last?.text ?? ''}`}
                    </span>
                    {c.unread > 0 && <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">{c.unread}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Middle: chat thread ── */}
      <section className={cn('flex-1 flex-col bg-slate-50 md:flex 2xl:flex-[1.6]', mobileView === 'chat' ? 'flex' : 'hidden')}>
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100"><MessageSquare size={26} /></div>
            <p className="text-sm font-semibold text-slate-600">Select a conversation</p>
            <p className="mt-1 text-xs">Choose a contact on the left to start chatting.</p>
          </div>
        ) : (
          <>
            {/* CHAT VIEW */}
            <div className={cn('min-h-0 flex-1 flex-col', chatView === 'profile' ? 'hidden 2xl:flex' : 'flex')}>
              {/* Chat header */}
              <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
                <button type="button" onClick={() => setMobileView('list')} className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 md:hidden"><ChevronLeft size={20} /></button>
                <button type="button" onClick={() => setChatView('profile')} title="View contact profile"
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-0.5 pr-2 text-left transition-colors hover:bg-slate-50 2xl:cursor-default 2xl:hover:bg-transparent">
                  <div className="relative shrink-0">
                    <span className={cn('flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-bold text-white', selected.color)}>{selected.ai ? <Bot size={18} /> : initials(selected.name)}</span>
                    {selected.online && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 truncate text-[14px] font-bold text-slate-900">{selected.name}</span>
                      <ConvBadge conv={selected} />
                    </div>
                    <div className="truncate text-[12px] text-slate-500">{selected.online ? <span className="text-emerald-600">Online</span> : 'Offline'} · {selected.role}</div>
                  </div>
                </button>
                <div className="flex items-center gap-0.5 text-slate-500">
                  <button type="button" onClick={() => setShareOpen(true)} title="Share files" className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 hover:text-slate-700"><Share2 size={17} /></button>
                  <button type="button" title="Call" className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 hover:text-slate-700"><Phone size={17} /></button>
                  <button type="button" title="Video" className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 hover:text-slate-700"><Video size={17} /></button>
                  <button type="button" title="More" className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 hover:text-slate-700"><MoreVertical size={17} /></button>
                </div>
              </div>

              {/* One-way document email — a sent-email log, no reply chat/link */}
              {selected.kind === 'external' && selected.emailOnly && (
                <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-slate-100/70 px-4 py-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600">
                    <Mail size={12} /> Documents emailed · one-way
                  </span>
                  {selected.email && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                      <span className="truncate">{selected.email}</span>
                    </span>
                  )}
                  {selected.source && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                      <FileText size={12} className="text-slate-400" /> {selected.source.label}
                    </span>
                  )}
                </div>
              )}

              {/* External-chat banner — link, source, enable/disable */}
              {selected.kind === 'external' && !selected.emailOnly && (
                <div className={cn('flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2.5',
                  selected.status === 'active' ? 'border-orange-100 bg-orange-50/60' : 'border-slate-200 bg-slate-100/70')}>
                  <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold',
                    selected.status === 'active' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600')}>
                    <Link2 size={12} /> {selected.status === 'active' ? 'External chat · live' : 'External chat · disabled'}
                  </span>
                  {selected.source && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                      <FileText size={12} className="text-slate-400" /> {selected.source.label}
                    </span>
                  )}
                  {selected.linkToken && (
                    <button type="button" onClick={copyChatLink} title="Copy secure chat link"
                      className="inline-flex min-w-0 max-w-[280px] items-center gap-1.5 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50">
                      <span className="truncate font-mono">{externalChatUrl(selected.linkToken)}</span>
                      <Copy size={12} className="shrink-0 text-slate-400" />
                    </button>
                  )}
                  <div className="ml-auto flex items-center gap-1.5">
                    {selected.status === 'active' ? (
                      <button type="button" onClick={toggleExternal} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50"><Ban size={12} /> Disable</button>
                    ) : (
                      <>
                        <button type="button" onClick={toggleExternal} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50"><ShieldCheck size={12} /> Re-enable</button>
                        <button type="button" onClick={startNew} className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-700"><RotateCcw size={12} /> Start new chat</button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Messages thread */}
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6 2xl:px-8">
                <div className="mx-auto w-full max-w-5xl space-y-3.5">
                  {selected.messages.map((m, i) => {
                    const prev = selected.messages[i - 1];
                    const showDay = m.day && m.day !== prev?.day;
                    // Light, differentiated bubbles: mine = soft blue (right), theirs = white (left).
                    const mine = m.fromMe;
                    if (m.system) {
                      return (
                        <div key={m.id}>
                          {showDay && <div className="my-4 flex items-center justify-center"><span className="rounded-full bg-slate-200/70 px-3 py-1 text-[11px] font-semibold text-slate-500">{m.day}</span></div>}
                          <div className="my-2 flex items-center justify-center">
                            <span className="max-w-[90%] rounded-full bg-slate-100 px-3 py-1 text-center text-[11px] font-medium text-slate-500">{m.text}</span>
                          </div>
                        </div>
                      );
                    }
                    const action = headerAction(m);
                    const senderName = mine ? (currentUserName || 'You') : selected.name;
                    return (
                      <div key={m.id}>
                        {showDay && (
                          <div className="my-4 flex items-center justify-center">
                            <span className="rounded-full bg-slate-200/70 px-3 py-1 text-[11px] font-semibold text-slate-500">{m.day}</span>
                          </div>
                        )}
                        <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                          {/* Message card — mine = soft blue, theirs = soft amber (matches the case-thread scheme). */}
                          <div className={cn('min-w-[14rem] max-w-[88%] rounded-2xl px-4 py-3 shadow-sm ring-1 ring-inset sm:max-w-[80%]',
                            mine ? 'bg-blue-50 ring-blue-100' : 'bg-amber-50/70 ring-amber-100')}>
                            {/* Header: action verb + sender + role badge + timestamp */}
                            <div className="mb-1.5 flex items-center gap-2">
                              {action && <action.Icon size={13} className={cn('shrink-0', mine ? 'text-blue-600' : 'text-amber-600')} />}
                              {action && <span className={cn('shrink-0 text-[12px] font-bold', mine ? 'text-blue-700' : 'text-amber-700')}>{action.label}</span>}
                              <span className="min-w-0 truncate text-[12.5px] font-bold text-slate-900">{senderName}</span>
                              {mine
                                ? <span className="shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset bg-blue-100 text-blue-700 ring-blue-200">You</span>
                                : <ConvBadge conv={selected} />}
                              <span className="ml-auto flex shrink-0 items-center gap-1 text-[10.5px] text-slate-400">
                                <Clock size={11} /> {m.at}
                                {mine && <CheckCheck size={13} className="text-blue-500" />}
                              </span>
                            </div>
                            {m.text && <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-700">{m.text}</p>}
                            {m.attachments && m.attachments.length > 0 && (
                              <div className={cn('mt-3 border-t pt-2.5', mine ? 'border-blue-200/60' : 'border-amber-200/70')}>
                                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{m.attachments.length} attachment{m.attachments.length > 1 ? 's' : ''}</p>
                                <div className="flex flex-wrap gap-2">
                                  {m.attachments.map(a => (
                                    <AttachmentChip key={a.id} att={a} onView={() => previewAttachment(a)} onDownload={() => notify(`Downloading ${a.name}…`)} />
                                  ))}
                                </div>
                              </div>
                            )}
                            {m.record && (
                              <button type="button" onClick={() => openRecord(m.record!)}
                                className="mt-3 flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition-colors hover:bg-slate-50">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><FileText size={15} /></span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[12.5px] font-bold text-slate-800">{m.record.label}</span>
                                  {m.record.sublabel && <span className="block truncate text-[11px] text-slate-500">{m.record.sublabel}</span>}
                                  <span className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] font-semibold text-blue-600">Open record <ExternalLink size={10} /></span>
                                </span>
                              </button>
                            )}
                            {m.widget && (
                              <ChatTaskCard widget={m.widget} onComplete={() => completeWidget(m.id)} onOpenRecord={openRecord} />
                            )}
                            {m.panel && (
                              <AiPanelCard panel={m.panel} onOpen={(path) => onNavigate?.(path)} />
                            )}
                            {m.action && (
                              <AiActionCard action={m.action} onOpen={(id) => select(id)} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {aiTyping && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 rounded-2xl bg-amber-50/70 px-4 py-3 shadow-sm ring-1 ring-inset ring-amber-100">
                        <Bot size={15} className="text-violet-500" />
                        <span className="text-[12px] font-semibold text-slate-500">{selected.name} is typing</span>
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
              </div>

              {/* Composer — locked for a one-way document email (no reply chat) */}
              {oneWayEmail ? (
                <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 sm:px-6 2xl:px-8">
                  <div className="mx-auto flex w-full max-w-5xl items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="flex items-center gap-2 text-[12px] font-medium text-slate-500"><Mail size={14} className="text-slate-400" /> Documents were emailed — this is a one-way send with no reply chat.</p>
                  </div>
                </div>
              ) : disabledExternal ? (
                <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 sm:px-6 2xl:px-8">
                  <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="flex items-center gap-2 text-[12px] font-medium text-slate-500"><Ban size={14} className="text-slate-400" /> This chat is disabled — the recipient can’t reply. Start a new chat to reconnect.</p>
                    <button type="button" onClick={startNew} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-bold text-white hover:bg-blue-700"><RotateCcw size={14} /> Start new chat</button>
                  </div>
                </div>
              ) : (
                <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 sm:px-6 2xl:px-8">
                  {/* AI quick-prompt chips — canned questions the agent can answer */}
                  {selected.ai && aiSuggestions.length > 0 && (
                    <div className="mx-auto mb-2.5 w-full max-w-5xl">
                      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">
                        <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-violet-500" /> Ask {selected.name.split(' ')[0]}</span>
                        <span className="hidden items-center gap-1 font-semibold normal-case text-slate-400 sm:flex">
                          · <AtSign size={11} className="text-slate-400" /> mention a driver · <Slash size={11} className="text-slate-400" /> run a task
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {aiSuggestions.map(s => (
                          <button key={s} type="button" onClick={() => sendPrompt(s)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-semibold text-slate-600 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700">
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mx-auto flex w-full max-w-5xl items-end gap-2">
                    <button type="button" onClick={() => setShareOpen(true)} title="Attach / share" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"><Paperclip size={18} /></button>
                    {selected.ai && (
                      <>
                        <button type="button" onClick={() => openTrigger('@')} title="Mention a driver / contact" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-600"><AtSign size={18} /></button>
                        <button type="button" onClick={() => openTrigger('/')} title="Run a task" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-600"><Slash size={18} /></button>
                      </>
                    )}
                    <div className="relative flex-1">
                      {/* @contact / slash-command picker */}
                      {selected.ai && picker && (
                        <div className="absolute bottom-full left-0 z-30 mb-2 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                          <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-3 py-2">
                            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                              {picker === 'command'
                                ? <><Slash size={12} /> Tasks</>
                                : <><AtSign size={12} /> {pendingCmd ? `Send “${pendingCmd.label}” to…` : 'Mention a contact'}</>}
                            </span>
                            <button type="button" onClick={closePicker} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={14} /></button>
                          </div>
                          {picker === 'command' ? (
                            pickerCommands.length === 0
                              ? <p className="px-3 py-4 text-center text-[12px] text-slate-400">No tasks match.</p>
                              : pickerCommands.map(cmd => {
                                  const CIcon = AI_ACTION_ICON[cmd.icon];
                                  return (
                                    <button key={cmd.id} type="button" onClick={() => pickCommand(cmd)}
                                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50">
                                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><CIcon size={14} /></span>
                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[12.5px] font-bold text-slate-800">/{cmd.id} <span className="font-medium text-slate-400">· {cmd.label}</span></span>
                                        <span className="block truncate text-[11px] text-slate-500">{cmd.hint}</span>
                                      </span>
                                      {cmd.needsContact && <AtSign size={13} className="shrink-0 text-slate-300" />}
                                    </button>
                                  );
                                })
                          ) : (
                            pickerContacts.length === 0
                              ? <p className="px-3 py-4 text-center text-[12px] text-slate-400">No contacts match.</p>
                              : pickerContacts.map(c => (
                                  <button key={c.id} type="button" onClick={() => pickContact(c)}
                                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50">
                                    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white', c.color)}>{initials(c.name)}</span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-[12.5px] font-bold text-slate-800">{c.name}</span>
                                      <span className="block truncate text-[11px] text-slate-500">{c.role}</span>
                                    </span>
                                  </button>
                                ))
                          )}
                        </div>
                      )}
                      <textarea
                        ref={taRef}
                        value={draft}
                        onChange={e => onDraftChange(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Escape' && picker) { e.preventDefault(); setPicker(null); return; }
                          if (e.key === 'Enter' && !e.shiftKey) {
                            if (picker === 'command' && pickerCommands[0]) { e.preventDefault(); pickCommand(pickerCommands[0]); return; }
                            if (picker === 'contact' && pickerContacts[0]) { e.preventDefault(); pickContact(pickerContacts[0]); return; }
                            e.preventDefault(); send();
                          }
                        }}
                        rows={1}
                        placeholder={selected.ai ? `Ask ${selected.name.split(' ')[0]} — or type @ / …` : `Message ${selected.name.split(' ')[0]}…`}
                        className="max-h-32 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-10 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <button type="button" title="Emoji" className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"><Smile size={17} /></button>
                    </div>
                    <button type="button" onClick={send} disabled={!draft.trim()}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
                      <Send size={17} />
                    </button>
                  </div>
                </div>
              )}
            </div>{/* end CHAT VIEW */}

            {/* PROFILE VIEW (opened from the header) — only below 2xl */}
            {details && (
              <div className={cn('min-h-0 flex-1 flex-col', chatView === 'profile' ? 'flex 2xl:hidden' : 'hidden')}>
                <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
                  <button type="button" onClick={() => setChatView('chat')} title="Back to chat" className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"><ChevronLeft size={20} /></button>
                  <span className="text-[14px] font-bold text-slate-900">Contact profile</span>
                </div>
                <ContactProfile contact={selected} details={details} infoTab={infoTab} setInfoTab={setInfoTab} onPreview={setPreview} onNotify={notify} />
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Details panel (3rd column) ── */}
      {selected && details && (
        <aside className={cn('hidden shrink-0 flex-col bg-white border-slate-200',
          '2xl:flex 2xl:w-auto 2xl:shrink 2xl:flex-[1.15] 2xl:min-w-[380px] 2xl:max-w-[680px]',
          listOnRight ? 'border-r' : 'border-l')}>
          <ContactProfile contact={selected} details={details} infoTab={infoTab} setInfoTab={setInfoTab} onPreview={setPreview} onNotify={notify} />
        </aside>
      )}

      {/* Share / new-message dialog */}
      {shareOpen && (
        <ShareToChat
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          title={selected ? `Share with ${selected.name}` : 'New message'}
          source={{ type: 'manual', id: 'manual', label: 'a new message' }}
          items={[]}
          recipientName={selected && selected.kind === 'external' ? selected.name : ''}
          recipientEmail={selected?.email}
          defaultChannel={selected?.kind === 'external' ? 'email' : 'in-app'}
          currentUserName={currentUserName}
          onSent={(id) => select(id)}
          onOpenInMessages={(id) => select(id)}
        />
      )}

      {/* Media preview lightbox */}
      {preview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4" onClick={() => setPreview(null)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{preview.title}</p>
                {preview.sub && <p className="text-[11px] text-slate-400">{preview.sub}</p>}
              </div>
              <button type="button" onClick={() => setPreview(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-4">
              {preview.type === 'doc' ? (
                <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                  <FileText size={48} />
                  <p className="mt-2 px-4 text-center text-sm font-semibold text-slate-500">{preview.title}</p>
                </div>
              ) : (
                <div className={cn('relative flex items-center justify-center rounded-xl bg-gradient-to-br', preview.hue, preview.type === 'video' ? 'aspect-video' : 'aspect-[4/3]')}>
                  {preview.type === 'video'
                    ? <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/30 backdrop-blur"><Play size={26} className="ml-1 text-white" /></span>
                    : <ImageIcon size={48} className="text-white/80" />}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
              <button type="button" onClick={() => notify(`Downloading ${preview.title}…`)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Download size={15} /> Download</button>
              <button type="button" onClick={() => notify('Share link copied')} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Share2 size={15} /> Share</button>
            </div>
          </div>
        </div>
      )}

      {/* Transient toast */}
      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">{toast}</div>
      )}
    </div>
  );
}

// Contact profile — the contact card + Photos/Videos/Docs media.
function ContactProfile({ contact, details, infoTab, setInfoTab, onPreview, onNotify }: {
  contact: Conversation;
  details: ContactDetails;
  infoTab: 'photos' | 'videos' | 'docs';
  setInfoTab: (t: 'photos' | 'videos' | 'docs') => void;
  onPreview: (p: PreviewItem) => void;
  onNotify: (m: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Contact card */}
      <div className="shrink-0 border-b border-slate-100 px-5 py-5 text-center">
        <div className="relative mx-auto w-fit">
          <span className={cn('flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white', contact.color)}>{contact.ai ? <Bot size={34} /> : initials(contact.name)}</span>
          {contact.online && <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-[3px] border-white bg-emerald-500" />}
        </div>
        <h2 className="mt-3 text-[15px] font-bold text-slate-900">{contact.name}</h2>
        <p className="text-[12px] text-slate-500">{contact.role}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          <ConvBadge conv={contact} />
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
            contact.online ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
            <span className={cn('h-1.5 w-1.5 rounded-full', contact.online ? 'bg-emerald-500' : 'bg-slate-400')} />
            {contact.online ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="mt-4 space-y-2 text-left">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[12px]">
            <Hash size={14} className="shrink-0 text-slate-400" />
            <span className="text-slate-400">User ID</span>
            <span className="ml-auto font-mono font-semibold text-slate-700">{details.userId}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[12px]">
            <Mail size={14} className="shrink-0 text-slate-400" />
            <span className="truncate text-slate-600" title={details.email}>{details.email}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[12px]">
            <Phone size={14} className="shrink-0 text-slate-400" />
            <span className="text-slate-600">{details.phone}</span>
          </div>
          {contact.kind === 'external' && contact.linkToken && (
            <button type="button" onClick={() => { try { navigator.clipboard?.writeText(externalChatUrl(contact.linkToken!)); } catch { /* ignore */ } onNotify('Chat link copied'); }}
              className="flex w-full items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-left text-[12px] ring-1 ring-orange-100 hover:bg-orange-100/70">
              <Link2 size={14} className="shrink-0 text-orange-500" />
              <span className="min-w-0 flex-1 truncate font-mono text-orange-700">{externalChatUrl(contact.linkToken)}</span>
              <Copy size={13} className="shrink-0 text-orange-400" />
            </button>
          )}
        </div>
      </div>

      {/* Media tabs */}
      <div className="flex shrink-0 border-b border-slate-200 px-3">
        {([['photos', 'Photos', details.media.photos.length], ['videos', 'Videos', details.media.videos.length], ['docs', 'Docs', details.media.docs.length]] as const).map(([id, label, n]) => (
          <button key={id} type="button" onClick={() => setInfoTab(id)}
            className={cn('flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition-colors',
              infoTab === id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
            {label}
            <span className={cn('inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold', infoTab === id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500')}>{n}</span>
          </button>
        ))}
      </div>

      {/* Media content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {infoTab === 'photos' && (
          details.media.photos.length === 0
            ? <MediaEmpty icon={ImageIcon} label="No photos shared" />
            : <div className="grid grid-cols-3 gap-2">
                {details.media.photos.map(p => (
                  <div key={p.id} title={p.caption} className={cn('group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-gradient-to-br', p.hue)}
                    onClick={() => onPreview({ type: 'photo', title: p.caption, hue: p.hue })}>
                    <ImageIcon size={20} className="absolute inset-0 m-auto text-white/80" />
                    <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/45 opacity-0 transition-opacity group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                      <MActionBtn icon={Eye} title="View" onClick={() => onPreview({ type: 'photo', title: p.caption, hue: p.hue })} />
                      <MActionBtn icon={Download} title="Download" onClick={() => onNotify(`Downloading ${p.caption}…`)} />
                      <MActionBtn icon={Share2} title="Share" onClick={() => onNotify('Share link copied')} />
                    </div>
                    <span className="absolute inset-x-0 bottom-0 truncate bg-black/30 px-1.5 py-0.5 text-[9px] font-medium text-white">{p.caption}</span>
                  </div>
                ))}
              </div>
        )}
        {infoTab === 'videos' && (
          details.media.videos.length === 0
            ? <MediaEmpty icon={Video} label="No videos shared" />
            : <div className="grid grid-cols-2 gap-2">
                {details.media.videos.map(v => (
                  <div key={v.id}>
                    <div className={cn('group relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br', v.hue)}>
                      <button type="button" title="Play" onClick={() => onPreview({ type: 'video', title: v.caption, hue: v.hue, sub: `Video · ${v.duration}` })}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/30 backdrop-blur transition-colors hover:bg-white/50"><Play size={16} className="ml-0.5 text-white" /></button>
                      <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1 py-0.5 text-[9px] font-bold text-white">{v.duration}</span>
                      <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <MActionBtn icon={Download} title="Download" small onClick={() => onNotify(`Downloading ${v.caption}…`)} />
                        <MActionBtn icon={Share2} title="Share" small onClick={() => onNotify('Share link copied')} />
                      </div>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-slate-500">{v.caption}</p>
                  </div>
                ))}
              </div>
        )}
        {infoTab === 'docs' && (
          details.media.docs.length === 0
            ? <MediaEmpty icon={FileText} label="No documents shared" />
            : <div className="space-y-2">
                {details.media.docs.map(d => (
                  <div key={d.id} className="group flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 hover:bg-slate-50">
                    <button type="button" onClick={() => onPreview({ type: 'doc', title: d.name, sub: `${d.ext} · ${d.size}` })}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[9px] font-bold', EXT_TONE[d.ext] ?? 'bg-slate-100 text-slate-500')}>{d.ext}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-slate-700" title={d.name}>{d.name}</p>
                        <p className="text-[11px] text-slate-400">{d.size}</p>
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <DocBtn icon={Eye} title="View" onClick={() => onPreview({ type: 'doc', title: d.name, sub: `${d.ext} · ${d.size}` })} />
                      <DocBtn icon={Download} title="Download" onClick={() => onNotify(`Downloading ${d.name}…`)} />
                      <DocBtn icon={Share2} title="Share" onClick={() => onNotify('Share link copied')} />
                    </div>
                  </div>
                ))}
              </div>
        )}
      </div>
    </div>
  );
}

function MActionBtn({ icon: Icon, title, onClick, small }: { icon: LucideIcon; title: string; onClick: () => void; small?: boolean }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={cn('inline-flex items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm transition-colors hover:bg-white', small ? 'h-6 w-6' : 'h-8 w-8')}>
      <Icon size={small ? 12 : 15} />
    </button>
  );
}

function DocBtn({ icon: Icon, title, onClick }: { icon: LucideIcon; title: string; onClick: () => void }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
      <Icon size={15} />
    </button>
  );
}

function MediaEmpty({ icon: Icon, label }: { icon: typeof ImageIcon; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100"><Icon size={20} /></div>
      <p className="text-[12px] font-medium">{label}</p>
    </div>
  );
}
