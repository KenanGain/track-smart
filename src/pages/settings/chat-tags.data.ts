import { useSyncExternalStore } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Chat Tags — a small directory of external people you share records with (an
// insurance adjuster, an agent, a lawyer, a repair shop …). Each contact carries
// a NAME, a TAG (its role) and an EMAIL. The share dialog pulls from here so you
// can pick a tagged recipient instead of re-typing an address every time.
//
// Two things are managed:
//   • Tags     — the role vocabulary (Adjuster, Insurance Agent, …) with a color.
//   • Contacts — name + tag + email.
// Persisted to localStorage.
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatTag {
  id: string;
  label: string;
  color: string;   // tailwind chip classes: bg + text + ring
}

export interface ChatContact {
  id: string;
  name: string;
  tagId: string;
  email: string;
}

export const TAG_PALETTE: string[] = [
  'bg-orange-100 text-orange-700 ring-orange-200',
  'bg-blue-100 text-blue-700 ring-blue-200',
  'bg-violet-100 text-violet-700 ring-violet-200',
  'bg-emerald-100 text-emerald-700 ring-emerald-200',
  'bg-rose-100 text-rose-700 ring-rose-200',
  'bg-amber-100 text-amber-700 ring-amber-200',
  'bg-cyan-100 text-cyan-700 ring-cyan-200',
  'bg-indigo-100 text-indigo-700 ring-indigo-200',
  'bg-slate-100 text-slate-700 ring-slate-200',
];

const SEED_TAGS: ChatTag[] = [
  { id: 'adjuster', label: 'Adjuster', color: TAG_PALETTE[0] },
  { id: 'insurance-agent', label: 'Insurance Agent', color: TAG_PALETTE[1] },
  { id: 'lawyer', label: 'Lawyer', color: TAG_PALETTE[2] },
  { id: 'repair-shop', label: 'Repair Shop', color: TAG_PALETTE[3] },
  { id: 'towing', label: 'Towing', color: TAG_PALETTE[5] },
  { id: 'law-enforcement', label: 'Law Enforcement', color: TAG_PALETTE[7] },
  { id: 'broker', label: 'Broker', color: TAG_PALETTE[6] },
  { id: 'other', label: 'Other', color: TAG_PALETTE[8] },
];

const SEED_CONTACTS: ChatContact[] = [
  { id: 'ct1', name: 'Priya Nair', tagId: 'adjuster', email: 'priya.nair@greatwestcasualty.com' },
  { id: 'ct2', name: 'Marcus Reed', tagId: 'adjuster', email: 'm.reed@sentinelclaims.com' },
  { id: 'ct3', name: 'Elaine Cho', tagId: 'insurance-agent', email: 'elaine.cho@northlineins.com' },
  { id: 'ct4', name: 'Dawson & Pratt LLP', tagId: 'lawyer', email: 'intake@dawsonpratt.com' },
  { id: 'ct5', name: 'Evergreen Truck Repair', tagId: 'repair-shop', email: 'service@evergreentruck.com' },
  { id: 'ct6', name: 'Cascade Towing', tagId: 'towing', email: 'dispatch@cascadetowing.com' },
];

// ── tiny pub/sub store ───────────────────────────────────────────────────────
const TAGS_KEY = 'chat:tags:v1';
const CONTACTS_KEY = 'chat:contacts:v1';

function load<T>(key: string, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; }
  } catch { /* ignore */ }
  return seed;
}

let tags: ChatTag[] = load(TAGS_KEY, SEED_TAGS);
let contacts: ChatContact[] = load(CONTACTS_KEY, SEED_CONTACTS);
const listeners = new Set<() => void>();

function emit() {
  try { localStorage.setItem(TAGS_KEY, JSON.stringify(tags)); localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts)); } catch { /* ignore */ }
  listeners.forEach(l => l());
}
function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }

let uidN = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${uidN++}`;

// ── reads ────────────────────────────────────────────────────────────────────
export function getChatTags() { return tags; }
export function getChatContacts() { return contacts; }
export function useChatTags(): ChatTag[] { return useSyncExternalStore(subscribe, getChatTags, getChatTags); }
export function useChatContacts(): ChatContact[] { return useSyncExternalStore(subscribe, getChatContacts, getChatContacts); }
export function tagById(id?: string): ChatTag | undefined { return tags.find(t => t.id === id); }

// ── tag CRUD ───────────────────────────────────────────────────────────────
export function addChatTag(label: string, color?: string): ChatTag {
  const tag: ChatTag = { id: uid('tag'), label: label.trim() || 'New tag', color: color ?? TAG_PALETTE[tags.length % TAG_PALETTE.length] };
  tags = [...tags, tag]; emit(); return tag;
}
export function updateChatTag(id: string, patch: Partial<Omit<ChatTag, 'id'>>) {
  tags = tags.map(t => (t.id === id ? { ...t, ...patch } : t)); emit();
}
export function removeChatTag(id: string) {
  tags = tags.filter(t => t.id !== id);
  // Re-home any contacts on the removed tag to "other" (kept if present, else first tag).
  const fallback = tags.find(t => t.id === 'other')?.id ?? tags[0]?.id ?? '';
  contacts = contacts.map(c => (c.tagId === id ? { ...c, tagId: fallback } : c));
  emit();
}

// ── contact CRUD ─────────────────────────────────────────────────────────────
export function addChatContact(input: { name: string; tagId: string; email: string }): ChatContact {
  const c: ChatContact = { id: uid('ct'), name: input.name.trim(), tagId: input.tagId, email: input.email.trim() };
  contacts = [...contacts, c]; emit(); return c;
}
export function updateChatContact(id: string, patch: Partial<Omit<ChatContact, 'id'>>) {
  contacts = contacts.map(c => (c.id === id ? { ...c, ...patch } : c)); emit();
}
export function removeChatContact(id: string) { contacts = contacts.filter(c => c.id !== id); emit(); }

/** Find or create a contact by email (used when the share dialog saves a new one). */
export function upsertChatContact(input: { name: string; tagId: string; email: string }): ChatContact {
  const existing = contacts.find(c => c.email.toLowerCase() === input.email.trim().toLowerCase());
  if (existing) { updateChatContact(existing.id, { name: input.name.trim() || existing.name, tagId: input.tagId || existing.tagId }); return existing; }
  return addChatContact(input);
}
