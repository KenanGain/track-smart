import { useSyncExternalStore } from 'react';
import {
  interpretAgent, AGENTS,
  type AiPanel, type AiAction, type AiResource, type AiDashboard,
  type AgentContext, type ComplianceRequest, type ComplianceSubmission,
} from './ai-agents';

// ─────────────────────────────────────────────────────────────────────────────
// Messages store — the single source of truth for every conversation in the app.
//
// It backs the Messages page AND every "Share / Send" action across the product
// (tickets, default accidents, safety events). Two kinds of conversation live
// here:
//   • internal  — a chat with another app user (driver / manager / admin …).
//   • external  — a chat with an outsider (e.g. an insurance adjuster) who is NOT
//                 a user of the app. They receive an email carrying a secure chat
//                 link; whatever they send on that link lands right here in our
//                 chat box. We can DISABLE an external chat at any time — after
//                 that the outsider can no longer reply and a brand-new chat must
//                 be started to reconnect.
//
// Persisted to localStorage so shared conversations survive reloads.
// ─────────────────────────────────────────────────────────────────────────────

export type RoleTag =
  | 'Super Admin' | 'Admin' | 'Manager' | 'Dispatch' | 'Safety'
  | 'Driver' | 'Adjuster' | 'External' | 'AI Agent';

export type ConvKind = 'internal' | 'external';
export type ConvChannel = 'in-app' | 'email';
export type ConvStatus = 'active' | 'disabled';
export type AttachmentKind = 'pdf' | 'image' | 'video' | 'doc';

export interface MsgAttachment {
  id: string;
  name: string;
  kind: AttachmentKind;
  group?: string;   // original grouping label (e.g. "Evidence pictures")
}

/** A shared, clickable pointer to a record elsewhere in the app (deep-link). */
export interface RecordRef {
  type: string;               // 'accident' | 'ticket' | 'safety-event' | 'compliance' …
  id: string;                 // record id used to open it on the destination page
  label: string;              // primary line, e.g. "Ticket OFF-84729"
  sublabel?: string;          // secondary line, e.g. "Speeding · Jacob Carter"
  path: string;               // destination list/page path, e.g. "/tickets"
}

// ── Chat task widgets ────────────────────────────────────────────────────────
// A message can carry an interactive TASK the recipient acts on right in the chat
// (do training, sign a document, acknowledge a notice, fill a form, upload docs,
// review/verify a record …). The recipient's action advances its status.
export type WidgetKind =
  | 'training' | 'signature' | 'form' | 'upload'
  | 'review' | 'verify' | 'warning-letter' | 'alert'
  | 'notice' | 'termination' | 'forward' | 'record';
export type WidgetStatus = 'pending' | 'done' | 'declined';

export interface ChatWidget {
  kind: WidgetKind;
  title: string;
  subtitle?: string;
  status: WidgetStatus;
  actionLabel?: string;       // primary action, e.g. "Start training" / "Sign" / "Acknowledge"
  doneLabel?: string;         // completed label, e.g. "Training completed" / "Signed"
  record?: RecordRef;         // optional link to the source record
  meta?: Record<string, string>;
}

export interface ChatMessage {
  id: string;
  fromMe: boolean;
  text: string;
  at: string;                 // display time, e.g. "10:24 AM"
  iso?: string;               // full timestamp for ordering / simulation
  day?: string;               // optional date-separator label
  system?: boolean;           // centered status line (shares, enable/disable …)
  attachments?: MsgAttachment[];
  record?: RecordRef;         // a shared record link (click → open the record)
  widget?: ChatWidget;        // an interactive task card
  panel?: AiPanel;            // an AI-agent data card (drivers / documents / …)
  action?: AiAction;          // an AI-agent action-result card (mail sent, training assigned …)
  resource?: AiResource;      // a tappable resource widget (upload / form / sign / view)
  compliance?: ComplianceRequest; // an interactive "fill the data & upload" compliance request
  dashboard?: AiDashboard;    // a tagged driver's / asset's interactive mini dashboard
  suggestions?: string[];     // AI-agent follow-up quick prompts
}

/** Where a shared conversation originated, so Messages can link back to the record. */
export interface ConvSource {
  type: 'accident' | 'ticket' | 'safety-event' | 'manual';
  id: string;
  label: string;              // e.g. "Accident ACC-2026-0021"
}

export interface Conversation {
  id: string;
  name: string;
  role: string;               // full descriptive line, e.g. "Driver · TRK-042"
  roleTag: RoleTag;           // short access role chip
  color: string;              // avatar bg
  online?: boolean;
  ai?: boolean;
  agentKey?: string;          // AI agents — links to an AgentDef in ai-agents.ts

  kind: ConvKind;
  channel: ConvChannel;
  status: ConvStatus;
  email?: string;             // external recipient address
  linkToken?: string;         // external secure-chat link token (absent for one-way email sends)
  emailOnly?: boolean;        // external "just email the documents" — one-way, no reply chat/link
  source?: ConvSource;
  tag?: string;               // chat-tag label (Adjuster, Insurance Agent …)
  tagColor?: string;          // chip classes for the tag

  lastAt: string;
  unread: number;
  messages: ChatMessage[];
  createdIso?: string;
}

// ── time / id helpers (fine in app runtime) ──────────────────────────────────
function nowIso(): string { return new Date().toISOString(); }
function nowTime(): string {
  const d = new Date();
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}
let _seq = 0;
function uid(prefix: string): string { _seq += 1; return `${prefix}-${Date.now().toString(36)}-${_seq}`; }
function token(): string {
  let s = '';
  for (let i = 0; i < 3; i++) s += Math.random().toString(36).slice(2, 8);
  return s.slice(0, 16);
}
export function externalChatUrl(t: string): string {
  return `https://chat.tracksmart.app/c/${t}`;
}

export function attachmentKindFor(name: string): AttachmentKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) return 'video';
  if (ext === 'pdf') return 'pdf';
  return 'doc';
}

// ── seeds ────────────────────────────────────────────────────────────────────
const SEED_INTERNAL: Conversation[] = [
  {
    id: 'c1', name: 'John Smith', role: 'Driver · TRK-042', roleTag: 'Driver', color: 'bg-blue-500', online: true,
    kind: 'internal', channel: 'in-app', status: 'active', lastAt: '10:24 AM', unread: 2,
    messages: [
      { id: 'm1', fromMe: false, day: 'Today', text: 'Morning — I picked up the load in Dallas, heading out now.', at: '08:12 AM' },
      { id: 'm2', fromMe: true, text: 'Thanks John. ETA to Houston?', at: '08:15 AM' },
      { id: 'm3', fromMe: false, text: 'Around 1 PM if traffic holds.', at: '08:16 AM' },
      { id: 'm4', fromMe: false, text: 'Also my ELD flagged a 30-minute break warning — can you check?', at: '10:23 AM' },
      { id: 'm5', fromMe: false, text: 'It shows on the Hours of Service page.', at: '10:24 AM' },
    ],
  },
  {
    id: 'c2', name: 'Dana Whitfield', role: 'Safety Manager', roleTag: 'Manager', color: 'bg-emerald-500', online: true,
    kind: 'internal', channel: 'in-app', status: 'active', lastAt: '9:47 AM', unread: 0,
    messages: [
      { id: 'm1', fromMe: false, day: 'Today', text: 'I reviewed the harsh-braking event for Robert Chen — closing it as a warning letter.', at: '9:40 AM' },
      { id: 'm2', fromMe: true, text: 'Sounds good. Log it in the activity trail please.', at: '9:45 AM' },
      { id: 'm3', fromMe: false, text: 'Done ✅', at: '9:47 AM' },
    ],
  },
  {
    id: 'c3', name: 'Maria Rodriguez', role: 'Driver · TRK-118', roleTag: 'Driver', color: 'bg-fuchsia-500', online: false,
    kind: 'internal', channel: 'in-app', status: 'active', lastAt: 'Yesterday', unread: 0,
    messages: [
      { id: 'm1', fromMe: false, day: 'Yesterday', text: 'Uploaded my updated medical certificate to the DQ file.', at: '4:02 PM' },
      { id: 'm2', fromMe: true, text: 'Got it, thanks Maria. Verified and filed.', at: '4:20 PM' },
    ],
  },
  {
    id: 'c4', name: 'Dispatch Desk', role: 'Operations · Dispatch', roleTag: 'Dispatch', color: 'bg-indigo-500', online: true,
    kind: 'internal', channel: 'in-app', status: 'active', lastAt: 'Yesterday', unread: 1,
    messages: [
      { id: 'm1', fromMe: false, day: 'Yesterday', text: 'Load #4821 reassigned to James Sullivan — trailer TRL-455.', at: '2:15 PM' },
      { id: 'm2', fromMe: false, text: 'Confirm when you have a driver for the Reno run.', at: '2:16 PM' },
    ],
  },
  {
    id: 'c5', name: 'Mike Johnson', role: 'Driver · TRK-088', roleTag: 'Driver', color: 'bg-amber-500', online: false,
    kind: 'internal', channel: 'in-app', status: 'active', lastAt: 'Mon', unread: 0,
    messages: [
      { id: 'm1', fromMe: false, day: 'Monday', text: 'Fuel receipt from the Vegas stop is uploaded.', at: '6:31 PM' },
      { id: 'm2', fromMe: true, text: 'Perfect, thank you.', at: '6:45 PM' },
    ],
  },
  {
    id: 'c6', name: 'Priya Nair', role: 'Claims · Adjuster', roleTag: 'Adjuster', color: 'bg-rose-500', online: false,
    kind: 'internal', channel: 'in-app', status: 'active', lastAt: 'Mon', unread: 0,
    messages: [
      { id: 'm1', fromMe: true, day: 'Monday', text: 'Sent the accident report package for ACC-2026-0021.', at: '11:00 AM' },
      { id: 'm2', fromMe: false, text: 'Received — I’ll request the repair estimate next.', at: '11:20 AM' },
    ],
  },
  {
    id: 'c7', name: 'Linda Martinez', role: 'Account Owner', roleTag: 'Super Admin', color: 'bg-purple-600', online: true,
    kind: 'internal', channel: 'in-app', status: 'active', lastAt: '11:05 AM', unread: 1,
    messages: [
      { id: 'm1', fromMe: false, day: 'Today', text: 'I approved the new carrier profile and updated the billing plan.', at: '10:58 AM' },
      { id: 'm2', fromMe: true, text: 'Thanks Linda. Should I roll it out to all terminals?', at: '11:02 AM' },
      { id: 'm3', fromMe: false, text: 'Yes — go ahead. Loop in the admins once it’s live.', at: '11:05 AM' },
    ],
  },
  {
    id: 'c8', name: 'David Kim', role: 'Operations Admin', roleTag: 'Admin', color: 'bg-slate-600', online: true,
    kind: 'internal', channel: 'in-app', status: 'active', lastAt: '10:12 AM', unread: 0,
    messages: [
      { id: 'm1', fromMe: false, day: 'Today', text: 'Added two new drivers to the roster and assigned their DQ files.', at: '10:05 AM' },
      { id: 'm2', fromMe: true, text: 'Great. Make sure their consents are queued.', at: '10:10 AM' },
      { id: 'm3', fromMe: false, text: 'Already sent — awaiting signatures.', at: '10:12 AM' },
    ],
  },
  {
    id: 'c9', name: 'Sarah Thompson', role: 'Fleet Manager', roleTag: 'Manager', color: 'bg-teal-600', online: false,
    kind: 'internal', channel: 'in-app', status: 'active', lastAt: 'Yesterday', unread: 0,
    messages: [
      { id: 'm1', fromMe: false, day: 'Yesterday', text: 'Trailer TRL-455 is due for its annual inspection next week.', at: '3:22 PM' },
      { id: 'm2', fromMe: true, text: 'Booked it for Thursday.', at: '3:40 PM' },
    ],
  },
  {
    id: 'c10', name: 'Robert Chen', role: 'Driver · TRK-201', roleTag: 'Driver', color: 'bg-cyan-600', online: true,
    kind: 'internal', channel: 'in-app', status: 'active', lastAt: '9:30 AM', unread: 3,
    messages: [
      { id: 'm1', fromMe: false, day: 'Today', text: 'Got a hard-brake alert on I-40 — a car cut me off, everything’s fine.', at: '9:24 AM' },
      { id: 'm2', fromMe: true, text: 'Understood, glad you’re safe. I’ll note it as no-fault.', at: '9:27 AM' },
      { id: 'm3', fromMe: false, text: 'Thanks. Delivery is still on schedule.', at: '9:29 AM' },
      { id: 'm4', fromMe: false, text: 'Do you need the dashcam clip?', at: '9:30 AM' },
    ],
  },
  {
    id: 'c11', name: 'Angela Foster', role: 'Compliance Admin', roleTag: 'Admin', color: 'bg-pink-600', online: false,
    kind: 'internal', channel: 'in-app', status: 'active', lastAt: 'Yesterday', unread: 0,
    messages: [
      { id: 'm1', fromMe: false, day: 'Yesterday', text: 'Three medical certificates expire this month — reminders are scheduled.', at: '1:15 PM' },
      { id: 'm2', fromMe: true, text: 'Perfect, thank you Angela.', at: '1:30 PM' },
    ],
  },
  {
    id: 'c12', name: 'James Sullivan', role: 'Driver · TRK-455', roleTag: 'Driver', color: 'bg-orange-500', online: true,
    kind: 'internal', channel: 'in-app', status: 'active', lastAt: 'Yesterday', unread: 0,
    messages: [
      { id: 'm1', fromMe: false, day: 'Yesterday', text: 'On the Reno run now — should reach the yard by 6.', at: '2:40 PM' },
      { id: 'm2', fromMe: true, text: 'Copy that, drive safe.', at: '2:45 PM' },
    ],
  },
  {
    id: 'c13', name: 'Tom Bradley', role: 'Terminal Manager', roleTag: 'Manager', color: 'bg-sky-600', online: false,
    kind: 'internal', channel: 'in-app', status: 'active', lastAt: 'Mon', unread: 0,
    messages: [
      { id: 'm1', fromMe: false, day: 'Monday', text: 'Dock 4 is down for repairs — reroute inbound loads to Dock 2.', at: '8:10 AM' },
      { id: 'm2', fromMe: true, text: 'Will let dispatch know.', at: '8:15 AM' },
    ],
  },
  {
    id: 'c14', name: 'Kevin O’Brien', role: 'Driver · TRK-310', roleTag: 'Driver', color: 'bg-lime-600', online: false,
    kind: 'internal', channel: 'in-app', status: 'active', lastAt: 'Mon', unread: 0,
    messages: [
      { id: 'm1', fromMe: true, day: 'Monday', text: 'Your CDL renewal is coming up — please upload the new copy.', at: '4:50 PM' },
      { id: 'm2', fromMe: false, text: 'Will do this weekend.', at: '5:05 PM' },
    ],
  },
  {
    id: 'c15', name: 'Rachel Green', role: 'HR Admin', roleTag: 'Admin', color: 'bg-green-600', online: true,
    kind: 'internal', channel: 'in-app', status: 'active', lastAt: 'Mon', unread: 0,
    messages: [
      { id: 'm1', fromMe: false, day: 'Monday', text: 'Onboarding packet for the new hire is ready for review.', at: '11:40 AM' },
      { id: 'm2', fromMe: true, text: 'I’ll look it over today.', at: '11:55 AM' },
    ],
  },
];

const SEED_EXTERNAL: Conversation[] = [
  {
    id: 'x1', name: 'Priya Nair (Great West)', role: 'External · Insurance adjuster', roleTag: 'External', color: 'bg-orange-500',
    online: false, kind: 'external', channel: 'email', status: 'active',
    email: 'priya.nair@greatwestcasualty.com', linkToken: 'gw7a2f91kx0z',
    source: { type: 'accident', id: 'ACC-2026-0021', label: 'Accident ACC-2026-0021' },
    tag: 'Adjuster', tagColor: 'bg-orange-100 text-orange-700 ring-orange-200',
    lastAt: '10:40 AM', unread: 1,
    messages: [
      { id: 'm0', fromMe: true, day: 'Today', system: true, text: 'Shared 5 items with priya.nair@greatwestcasualty.com · secure chat link sent by email.', at: '9:02 AM' },
      {
        id: 'm1', fromMe: true, text: 'Hi Priya, attached is our accident report for Jacob Carter (ACM-T0100) on Aug 20, along with the supporting documents and evidence.', at: '9:02 AM',
        attachments: [
          { id: 'a1', name: 'accident-report-jacob-carter.pdf', kind: 'pdf', group: 'Accident report' },
          { id: 'a2', name: 'tractor-front.jpg', kind: 'image', group: 'Vehicle damage' },
          { id: 'a3', name: 'scene-overview.jpg', kind: 'image', group: 'Evidence' },
          { id: 'a4', name: 'dashcam-forward.mp4', kind: 'video', group: 'Video' },
          { id: 'a5', name: 'repair-estimate-evergreen.pdf', kind: 'pdf', group: 'Repairs' },
        ],
      },
      { id: 'm2', fromMe: false, text: 'Received, thank you. Opened the link — reviewing the package now.', at: '9:48 AM' },
      { id: 'm3', fromMe: false, text: 'Could you also send the police report number when you have it?', at: '10:40 AM' },
    ],
    createdIso: nowIso(),
  },
  {
    id: 'x2', name: 'Marcus Reed (Sentinel)', role: 'External · Claims TPA', roleTag: 'External', color: 'bg-orange-600',
    online: false, kind: 'external', channel: 'email', status: 'disabled',
    email: 'm.reed@sentinelclaims.com', linkToken: 'snt55b0c34d',
    source: { type: 'accident', id: 'ACC-2026-0018', label: 'Accident ACC-2026-0018' },
    tag: 'Adjuster', tagColor: 'bg-orange-100 text-orange-700 ring-orange-200',
    lastAt: 'Yesterday', unread: 0,
    messages: [
      { id: 'm0', fromMe: true, day: 'Yesterday', system: true, text: 'Shared 3 items with m.reed@sentinelclaims.com · secure chat link sent by email.', at: '1:10 PM' },
      { id: 'm1', fromMe: true, text: 'Marcus, here is the initial report and photos for claim SNT-4471.', at: '1:10 PM',
        attachments: [
          { id: 'a1', name: 'incident-report.pdf', kind: 'pdf', group: 'Accident report' },
          { id: 'a2', name: 'left-side.jpg', kind: 'image', group: 'Vehicle damage' },
          { id: 'a3', name: 'trailer-roof.jpg', kind: 'image', group: 'Vehicle damage' },
        ],
      },
      { id: 'm2', fromMe: false, text: 'Thanks — claim is now closed on our end.', at: '2:05 PM' },
      { id: 'm3', fromMe: true, system: true, text: 'Chat disabled — the external participant can no longer reply. Start a new chat to reconnect.', at: '2:30 PM' },
    ],
    createdIso: nowIso(),
  },
];

// One conversation per specialized AI agent (from the AGENTS catalog). Each opens
// with the agent's intro so the thread and list preview aren't empty.
const SEED_AI: Conversation[] = AGENTS.map((a, i) => ({
  id: a.key, name: a.name, role: a.role, roleTag: 'AI Agent' as RoleTag, color: a.color,
  online: true, ai: true, agentKey: a.key,
  kind: 'internal' as ConvKind, channel: 'in-app' as ConvChannel, status: 'active' as ConvStatus,
  lastAt: 'Today', unread: i === 0 ? 1 : 0,
  messages: [
    { id: 'm1', fromMe: false, day: 'Today', text: `Hi! I’m ${a.name} — ${a.greeting}`, at: '9:00 AM',
      suggestions: a.prompts },
  ],
}));

function seedConversations(): Conversation[] {
  return [...SEED_INTERNAL, ...SEED_EXTERNAL, ...SEED_AI];
}

// ── persistence + tiny pub/sub store ─────────────────────────────────────────
// v2: specialized AI agents (hiring / safety / HOS / violations / DQ / account /
// payroll) replaced the four generic agents.
const STORAGE_KEY = 'messages:conversations:v3';

function load(): Conversation[] {
  try {
    localStorage.removeItem('messages:conversations:v1'); // drop the superseded seed
    localStorage.removeItem('messages:conversations:v2'); // v2 seeded the removed Pay Stub agent
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Conversation[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch { /* ignore */ }
  return seedConversations();
}

let conversations: Conversation[] = load();
const listeners = new Set<() => void>();

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations)); } catch { /* ignore */ }
}
function emit() { persist(); listeners.forEach(l => l()); }
function setConversations(next: Conversation[]) { conversations = next; emit(); }
/** Update one conversation. `toFront` moves it to the top of the list (new activity). */
function patch(id: string, fn: (c: Conversation) => Conversation, toFront = false) {
  const next = conversations.map(c => (c.id === id ? fn(c) : c));
  if (toFront) {
    const idx = next.findIndex(c => c.id === id);
    if (idx > 0) { const [item] = next.splice(idx, 1); next.unshift(item); }
  }
  setConversations(next);
}

export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
export function getConversations(): Conversation[] { return conversations; }

/** React hook — re-renders on any store change. */
export function useConversations(): Conversation[] {
  return useSyncExternalStore(subscribe, getConversations, getConversations);
}

// ── AI "typing" indicator (its own tiny pub/sub) ─────────────────────────────
// Tracks which AI conversations are mid-reply so the UI can show a typing bubble.
const typingIds = new Set<string>();
const typingListeners = new Set<() => void>();
let typingSnapshot: string[] = [];
function refreshTyping() { typingSnapshot = [...typingIds]; }
function emitTyping() { typingListeners.forEach(l => l()); }
function setTyping(convId: string, on: boolean) {
  if (on) typingIds.add(convId); else typingIds.delete(convId);
  refreshTyping();
  emitTyping();
}
function subscribeTyping(l: () => void): () => void { typingListeners.add(l); return () => { typingListeners.delete(l); }; }
function getTyping(): string[] { return typingSnapshot; }
/** React hook — the list of conversation ids whose AI agent is currently typing. */
export function useAiTyping(): string[] {
  return useSyncExternalStore(subscribeTyping, getTyping, getTyping);
}

// ── simulated outsider replies (external chats only) ─────────────────────────
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>[]>();
const AUTO_REPLIES = [
  'Thanks — I’ve received this and will review shortly.',
  'Got it. I’ll get back to you with next steps.',
  'Appreciate the quick turnaround. Looking at it now.',
  'Received. One moment while I check the file.',
];
let replyIx = 0;

function cancelTimers(convId: string) {
  const arr = pendingTimers.get(convId);
  if (arr) { arr.forEach(clearTimeout); pendingTimers.delete(convId); }
}
function scheduleInbound(convId: string, delay = 2600) {
  const t = setTimeout(() => {
    const conv = conversations.find(c => c.id === convId);
    if (!conv || conv.kind !== 'external' || conv.status !== 'active') return;
    const text = AUTO_REPLIES[replyIx++ % AUTO_REPLIES.length];
    receiveMessage(convId, text);
    const arr = pendingTimers.get(convId)?.filter(x => x !== t) ?? [];
    pendingTimers.set(convId, arr);
  }, delay);
  pendingTimers.set(convId, [...(pendingTimers.get(convId) ?? []), t]);
}

// ── mutations ────────────────────────────────────────────────────────────────

/** Append a message from us; on active external chats an outsider reply follows. */
export function sendMessage(convId: string, text: string, attachments?: MsgAttachment[], resource?: AiResource, compliance?: ComplianceRequest) {
  const at = nowTime();
  patch(convId, c => ({
    ...c,
    lastAt: at,
    messages: [...c.messages, { id: uid('me'), fromMe: true, text, at, iso: nowIso(), attachments, resource, compliance }],
  }), true);
  const conv = conversations.find(c => c.id === convId);
  if (conv && conv.kind === 'external' && conv.status === 'active') scheduleInbound(convId);
}

/** Append a message from the other side (outsider / contact). Bumps unread. */
export function receiveMessage(convId: string, text: string) {
  const at = nowTime();
  patch(convId, c => ({
    ...c,
    lastAt: at,
    unread: c.unread + 1,
    messages: [...c.messages, { id: uid('in'), fromMe: false, text, at, iso: nowIso() }],
  }), true);
}

export function markRead(convId: string) {
  const c = conversations.find(x => x.id === convId);
  if (c && c.unread) patch(convId, x => ({ ...x, unread: 0 }));
}

// ── AI agent chat (front-end demo) ───────────────────────────────────────────
// The user asks an AI agent something (natural language OR a /command with an
// optional @contact); we append their message, show a brief "typing" state, then
// deliver a specialized reply — a data panel and/or an action-result card. Actions
// that target a driver are also delivered into that driver's own chat.
const aiTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Resolve an `@token` (first name or full name) to an internal contact conversation. */
function resolveContact(token: string): { id: string; name: string; first: string } {
  const t = token.replace(/^@/, '').trim().toLowerCase();
  const found = conversations.find(c =>
    c.kind === 'internal' && !c.ai &&
    (c.name.toLowerCase() === t || c.name.toLowerCase().split(/\s+/)[0] === t));
  if (found) return { id: found.id, name: found.name, first: found.name.split(/\s+/)[0] };
  // Unknown contact → create a driver chat named after the token (title-cased).
  const name = token.replace(/^@/, '').trim().replace(/\b\w/g, m => m.toUpperCase()) || 'Driver';
  return { id: getOrCreateDriverConversation(name), name, first: name.split(/\s+/)[0] };
}

/** Send a prompt to an AI agent conversation and schedule its demo reply. */
export function askAgent(convId: string, text: string, ctx?: AgentContext) {
  const clean = text.trim();
  if (!clean) return;
  const conv = conversations.find(c => c.id === convId);
  if (!conv) return;

  // 1. Append the user's message.
  const at = nowTime();
  patch(convId, c => ({
    ...c, lastAt: at,
    messages: [...c.messages, { id: uid('me'), fromMe: true, text: clean, at, iso: nowIso() }],
  }), true);

  // 2. Interpret against the specialized agent.
  const reply = interpretAgent(conv.agentKey, clean, ctx);
  setTyping(convId, true);
  const prev = aiTimers.get(convId);
  if (prev) clearTimeout(prev);
  const t = setTimeout(() => {
    setTyping(convId, false);
    aiTimers.delete(convId);

    // 3. If the action targets a contact, deliver the message (and any resource
    //    widget) into their chat.
    let action = reply.action;
    if (reply.deliver) {
      const c = resolveContact(reply.deliver.toToken);
      sendMessage(c.id, reply.deliver.text, undefined, reply.deliver.resource, reply.deliver.compliance);
      if (action) action = { ...action, title: `${action.title} → ${c.first}`, openConvId: c.id, openLabel: `Open chat with ${c.first}` };
    }

    const rat = nowTime();
    const msg: ChatMessage = {
      id: uid('ai'), fromMe: false, text: reply.text, at: rat, iso: nowIso(),
      panel: reply.panel, action, resource: reply.resource,
      compliance: reply.compliance, dashboard: reply.dashboard, suggestions: reply.suggestions,
    };
    patch(convId, c => ({ ...c, lastAt: rat, messages: [...c.messages, msg] }), true);
  }, 850);
  aiTimers.set(convId, t);
}

/** Enable / disable an external chat. Disabling stops the outsider from replying. */
export function setExternalEnabled(convId: string, enabled: boolean) {
  const conv = conversations.find(c => c.id === convId);
  if (!conv || conv.kind !== 'external') return;
  if (!enabled) cancelTimers(convId);
  const at = nowTime();
  const line: ChatMessage = {
    id: uid('sys'), fromMe: true, system: true, at, iso: nowIso(),
    text: enabled
      ? 'Chat re-enabled — the external participant can reply again.'
      : 'Chat disabled — the external participant can no longer reply. Start a new chat to reconnect.',
  };
  patch(convId, c => ({ ...c, status: enabled ? 'active' : 'disabled', lastAt: at, messages: [...c.messages, line] }));
}

/** Start a fresh external chat with the same outsider (new secure link). Returns the new id. */
export function startNewExternalChat(fromConvId: string): string | null {
  const old = conversations.find(c => c.id === fromConvId);
  if (!old || old.kind !== 'external') return null;
  const id = uid('x');
  const tk = token();
  const at = nowTime();
  const fresh: Conversation = {
    ...old, id, linkToken: tk, status: 'active', unread: 0, lastAt: at, createdIso: nowIso(),
    messages: [{
      id: uid('sys'), fromMe: true, system: true, at, iso: nowIso(), day: 'Today',
      text: `New secure chat link sent to ${old.email ?? 'the recipient'}.`,
    }],
  };
  setConversations([fresh, ...conversations]);
  return id;
}

export interface ShareInput {
  recipientName: string;
  recipientEmail?: string;
  recipientId?: string;          // existing conversation id → post into that internal chat
  channel: ConvChannel;          // 'in-app' → internal · 'email' → external outsider
  roleTag?: RoleTag;
  color?: string;
  tag?: string;                  // chat-tag label (Adjuster …)
  tagColor?: string;
  subject?: string;
  message: string;
  items: { name: string; group?: string }[];
  source: ConvSource;
  currentUserName?: string;
  record?: RecordRef;            // optional clickable record link attached to the shared message
  externalDelivery?: 'chat' | 'email'; // external only: 'chat' = secure chat link (default) · 'email' = one-way document email
}

const SHARE_COLORS = ['bg-orange-500', 'bg-teal-600', 'bg-sky-600', 'bg-rose-500', 'bg-indigo-500', 'bg-emerald-600'];
let shareColorIx = 0;

/**
 * The heart of every "Share / Send" action. Creates (or extends) a conversation
 * and drops the shared items in as an attachment message. External shares mint a
 * secure chat link and simulate the outsider opening it. Returns the conv id.
 */
export function shareToMessages(input: ShareInput): string {
  const attachments: MsgAttachment[] = input.items.map(it => ({
    id: uid('att'), name: it.name, kind: attachmentKindFor(it.name), group: it.group,
  }));
  const at = nowTime();
  const external = input.channel === 'email';

  // In-app share into an existing conversation → just append.
  if (!external && input.recipientId) {
    const target = conversations.find(c => c.id === input.recipientId);
    if (target) {
      const sys: ChatMessage = {
        id: uid('sys'), fromMe: true, system: true, at, iso: nowIso(),
        text: `Shared ${attachments.length} item${attachments.length !== 1 ? 's' : ''} from ${input.source.label}.`,
      };
      const body: ChatMessage = { id: uid('me'), fromMe: true, text: input.message, at, iso: nowIso(), attachments, record: input.record };
      patch(target.id, c => ({ ...c, lastAt: at, messages: [...c.messages, sys, body], source: c.source ?? input.source }), true);
      return target.id;
    }
  }

  // Otherwise create a new conversation (external outsider, or a new in-app contact).
  // External "email" delivery = one-way document email: no secure chat link, no simulated reply.
  const emailOnly = external && input.externalDelivery === 'email';
  const id = uid(external ? 'x' : 'c');
  const tk = external && !emailOnly ? token() : undefined;
  const color = input.color ?? SHARE_COLORS[shareColorIx++ % SHARE_COLORS.length];
  const sysText = emailOnly
    ? `Emailed ${attachments.length} document${attachments.length !== 1 ? 's' : ''} to ${input.recipientEmail ?? 'the recipient'} · one-way (no reply chat).`
    : external
      ? `Shared ${attachments.length} item${attachments.length !== 1 ? 's' : ''} with ${input.recipientEmail ?? 'the recipient'} · secure chat link sent by email.`
      : `Shared ${attachments.length} item${attachments.length !== 1 ? 's' : ''} from ${input.source.label}.`;
  const conv: Conversation = {
    id,
    name: input.recipientName || (input.recipientEmail ?? 'New contact'),
    role: external ? `External · ${input.source.label}` : `Shared · ${input.source.label}`,
    roleTag: input.roleTag ?? (external ? 'External' : 'Driver'),
    color,
    online: false,
    kind: external ? 'external' : 'internal',
    channel: input.channel,
    status: 'active',
    email: input.recipientEmail,
    linkToken: tk,
    emailOnly: emailOnly || undefined,
    source: input.source,
    tag: input.tag,
    tagColor: input.tagColor,
    lastAt: at,
    unread: 0,
    createdIso: nowIso(),
    messages: [
      { id: uid('sys'), fromMe: true, system: true, text: sysText, at, iso: nowIso(), day: 'Today' },
      { id: uid('me'), fromMe: true, text: input.message, at, iso: nowIso(), attachments, record: input.record },
    ],
  };
  setConversations([conv, ...conversations]);
  if (external && !emailOnly) scheduleInbound(id, 3200);
  return id;
}

// ── deep-link focus (Share dialog → "Open in Messages") ──────────────────────
let pendingFocus: string | null = null;
export function setMessagesFocus(id: string) { pendingFocus = id; }
export function consumeMessagesFocus(): string | null { const f = pendingFocus; pendingFocus = null; return f; }

// ── deep-link to a record (shared record link in a chat → open the record) ────
let pendingRecord: { path: string; id: string } | null = null;
export function setPendingRecord(path: string, id: string) { pendingRecord = { path, id }; }
/** A destination page calls this on mount with its own path; gets the id to open (once). */
export function consumePendingRecord(path: string): string | null {
  if (pendingRecord && pendingRecord.path === path) { const id = pendingRecord.id; pendingRecord = null; return id; }
  return null;
}

// ── task widgets ─────────────────────────────────────────────────────────────
const DRIVER_COLORS = ['bg-blue-500', 'bg-fuchsia-500', 'bg-amber-500', 'bg-cyan-600', 'bg-teal-600', 'bg-orange-500', 'bg-lime-600'];
let driverColorIx = 0;

/** Find the internal conversation for a named driver, creating one if needed. */
export function getOrCreateDriverConversation(driverName: string): string {
  const name = driverName.trim() || 'Driver';
  const existing = conversations.find(c => c.kind === 'internal' && !c.ai && c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;
  const id = uid('c');
  const conv: Conversation = {
    id, name, role: 'Driver', roleTag: 'Driver', color: DRIVER_COLORS[driverColorIx++ % DRIVER_COLORS.length],
    kind: 'internal', channel: 'in-app', status: 'active', lastAt: nowTime(), unread: 0, createdIso: nowIso(), messages: [],
  };
  setConversations([conv, ...conversations]);
  return id;
}

/** Post a message carrying a task widget into a conversation. Returns the message id. */
export function sendWidget(convId: string, input: { widget: ChatWidget; text?: string }): string {
  const at = nowTime();
  const mid = uid('w');
  const msg: ChatMessage = {
    id: mid, fromMe: true, at, iso: nowIso(),
    text: input.text?.trim() || input.widget.title,
    widget: input.widget,
  };
  patch(convId, c => ({ ...c, lastAt: at, messages: [...c.messages, msg] }), true);
  return mid;
}

/** Convenience: send a widget straight to a named driver's chat. */
export function sendWidgetToDriver(driverName: string, widget: ChatWidget, text?: string): string {
  const convId = getOrCreateDriverConversation(driverName);
  sendWidget(convId, { widget, text });
  return convId;
}

/**
 * The recipient filled in and uploaded a compliance request. Flips EVERY copy of that
 * request (the driver's card and the office-side preview in the agent chat) to
 * "submitted", and posts a short confirmation line into the driver's thread so the
 * conversation reads naturally.
 */
export function submitComplianceRequest(convId: string, requestId: string, submission: ComplianceSubmission) {
  let label = 'the document';
  let name = '';
  for (const c of conversations) {
    if (!c.messages.some(m => m.compliance?.id === requestId)) continue;
    patch(c.id, x => ({
      ...x,
      messages: x.messages.map(m => (m.compliance?.id === requestId
        ? { ...m, compliance: { ...m.compliance, status: 'submitted' as const, submission } }
        : m)),
    }));
    const hit = c.messages.find(m => m.compliance?.id === requestId);
    if (hit?.compliance) { label = hit.compliance.ask.documentName || hit.compliance.ask.recordName; name = hit.compliance.forName; }
  }
  const at = nowTime();
  const files = submission.files.length;
  const line: ChatMessage = {
    id: uid('in'), fromMe: false, at, iso: nowIso(),
    text: files
      ? `Done — I’ve filled in the details and uploaded ${files === 1 ? label : `${files} files for ${label}`}.`
      : `Done — I’ve confirmed the details for ${label}.`,
  };
  patch(convId, c => ({ ...c, lastAt: at, messages: [...c.messages, line] }), true);
  return { label, name };
}

/** Advance a widget's status (the recipient acting on the task). */
export function setWidgetStatus(convId: string, msgId: string, status: WidgetStatus) {
  patch(convId, c => ({
    ...c,
    messages: c.messages.map(m => (m.id === msgId && m.widget ? { ...m, widget: { ...m.widget, status } } : m)),
  }));
}

/** Share a clickable record link into an in-app contact's conversation. Returns the conv id. */
export function shareRecordToMessages(input: { recipientId: string; record: RecordRef; message?: string; currentUserName?: string }): string | null {
  const target = conversations.find(c => c.id === input.recipientId);
  if (!target) return null;
  const at = nowTime();
  const body: ChatMessage = {
    id: uid('me'), fromMe: true, at, iso: nowIso(),
    text: input.message?.trim() || `Shared a record: ${input.record.label}`,
    record: input.record,
  };
  patch(target.id, c => ({ ...c, lastAt: at, messages: [...c.messages, body] }), true);
  return target.id;
}

/** Reset to seeds (used by dev / tests). */
export function resetMessages() {
  cancelAll();
  setConversations(seedConversations());
}
function cancelAll() {
  pendingTimers.forEach(arr => arr.forEach(clearTimeout)); pendingTimers.clear();
  aiTimers.forEach(clearTimeout); aiTimers.clear();
  typingIds.clear(); refreshTyping(); emitTyping();
}
