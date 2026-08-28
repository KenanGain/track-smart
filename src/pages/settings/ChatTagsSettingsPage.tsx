import { useState } from 'react';
import { MessageSquare, Plus, Pencil, Trash2, Check, X, Tag as TagIcon, Mail, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useChatTags, useChatContacts, addChatTag, updateChatTag, removeChatTag,
  addChatContact, updateChatContact, removeChatContact, tagById,
  type ChatContact,
} from './chat-tags.data';

// ─────────────────────────────────────────────────────────────────────────────
// Settings ▸ Chat Tags — manage the role vocabulary (Adjuster, Insurance Agent …)
// and a directory of external contacts (name · tag · email) that the universal
// share dialog can pick from.
// ─────────────────────────────────────────────────────────────────────────────

export function ChatTagsSettingsPage() {
  const tags = useChatTags();
  const contacts = useChatContacts();

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-slate-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8">
        <div className="mb-6 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><MessageSquare size={20} /></span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Chat Tags</h1>
            <p className="mt-0.5 text-sm text-slate-500">Tags and saved contacts used when you share a record in a chat — pick a tagged recipient instead of retyping an email.</p>
          </div>
        </div>

        <TagsCard tags={tags} />
        <div className="h-6" />
        <ContactsCard contacts={contacts} tags={tags} />
      </div>
    </div>
  );
}

// ── Tags ─────────────────────────────────────────────────────────────────────
function TagsCard({ tags }: { tags: ReturnType<typeof useChatTags> }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  const startEdit = (id: string, label: string) => { setEditingId(id); setDraft(label); };
  const saveEdit = () => { if (editingId && draft.trim()) updateChatTag(editingId, { label: draft.trim() }); setEditingId(null); };
  const addNew = () => { if (newLabel.trim()) addChatTag(newLabel.trim()); setNewLabel(''); setAdding(false); };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <TagIcon size={15} className="text-blue-600" />
          <h2 className="text-sm font-bold text-slate-800">Tags</h2>
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500">{tags.length}</span>
        </div>
        <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-blue-700"><Plus size={15} /> Add tag</button>
      </div>
      <div className="flex flex-wrap gap-2 p-5">
        {tags.map(t => (
          editingId === t.id ? (
            <span key={t.id} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1">
              <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                className="w-28 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              <button type="button" onClick={saveEdit} className="rounded p-0.5 text-emerald-600 hover:bg-emerald-50"><Check size={14} /></button>
              <button type="button" onClick={() => setEditingId(null)} className="rounded p-0.5 text-slate-400 hover:bg-slate-100"><X size={14} /></button>
            </span>
          ) : (
            <span key={t.id} className={cn('group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset', t.color)}>
              {t.label}
              <button type="button" onClick={() => startEdit(t.id, t.label)} className="opacity-0 transition-opacity group-hover:opacity-100"><Pencil size={12} /></button>
              <button type="button" onClick={() => removeChatTag(t.id)} className="opacity-0 transition-opacity group-hover:opacity-100"><Trash2 size={12} /></button>
            </span>
          )
        ))}
        {adding && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1">
            <input autoFocus value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Tag name"
              onKeyDown={e => { if (e.key === 'Enter') addNew(); if (e.key === 'Escape') { setAdding(false); setNewLabel(''); } }}
              className="w-28 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            <button type="button" onClick={addNew} className="rounded p-0.5 text-emerald-600 hover:bg-emerald-50"><Check size={14} /></button>
            <button type="button" onClick={() => { setAdding(false); setNewLabel(''); }} className="rounded p-0.5 text-slate-400 hover:bg-slate-100"><X size={14} /></button>
          </span>
        )}
      </div>
    </section>
  );
}

// ── Contacts ───────────────────────────────────────────────────────────────
function ContactsCard({ contacts, tags }: { contacts: ChatContact[]; tags: ReturnType<typeof useChatTags> }) {
  const [editing, setEditing] = useState<ChatContact | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-blue-600" />
          <h2 className="text-sm font-bold text-slate-800">Contacts</h2>
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500">{contacts.length}</span>
        </div>
        <button type="button" onClick={() => { setAdding(true); setEditing(null); }} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-blue-700"><Plus size={15} /> Add contact</button>
      </div>

      {(adding || editing) && (
        <ContactForm
          key={editing?.id ?? 'new'}
          initial={editing}
          tags={tags}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onSave={(vals) => {
            if (editing) updateChatContact(editing.id, vals);
            else addChatContact(vals);
            setAdding(false); setEditing(null);
          }}
        />
      )}

      <div className="divide-y divide-slate-100">
        {contacts.length === 0 && !adding ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No contacts yet. Add an adjuster, agent, repair shop…</p>
        ) : contacts.map(c => {
          const tag = tagById(c.tagId);
          return (
            <div key={c.id} className="group flex items-center gap-3 px-5 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-600">{initials(c.name)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-semibold text-slate-800">{c.name}</span>
                  {tag && <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset', tag.color)}>{tag.label}</span>}
                </div>
                <div className="flex items-center gap-1 text-[12px] text-slate-500"><Mail size={12} className="text-slate-400" /> {c.email}</div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button type="button" onClick={() => { setEditing(c); setAdding(false); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><Pencil size={15} /></button>
                <button type="button" onClick={() => removeChatContact(c.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 size={15} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ContactForm({ initial, tags, onSave, onCancel }: {
  initial: ChatContact | null;
  tags: ReturnType<typeof useChatTags>;
  onSave: (v: { name: string; tagId: string; email: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [tagId, setTagId] = useState(initial?.tagId ?? tags[0]?.id ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const valid = name.trim() && /\S+@\S+\.\S+/.test(email);

  return (
    <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
            className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Tag</label>
          <select value={tagId} onChange={e => setTagId(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            {tags.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com"
            className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
        <button type="button" disabled={!valid} onClick={() => onSave({ name: name.trim(), tagId, email: email.trim() })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><Check size={15} /> {initial ? 'Save' : 'Add'}</button>
      </div>
    </div>
  );
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '?';
}
