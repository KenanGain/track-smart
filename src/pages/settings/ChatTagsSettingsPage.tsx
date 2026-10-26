import React, { Fragment, useMemo, useState } from 'react';
import { MessageSquare, Plus, Pencil, Trash2, Check, X, Tag as TagIcon, Mail, Users, CircleSlash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ListPageHeader } from '@/components/ui/ListPageHeader';
import { ListScrollFrame } from '@/components/ui/ListScrollFrame';
import { KpiStatRow, type KpiStat } from '@/components/ui/KpiStatCard';
import { ListHeaderBridge, chipsFromStats, useHeaderChips } from '@/components/ui/list-header-bridge';
import { ScrollBody, usePageChrome } from '@/components/ui/PageChrome';
import {
  FilterSelect, FiltersToggle, GroupBySelect, ListToolbar, ResetFilters, SortTh, TableGroupBand, TablePager, useTableSort,
} from '@/components/ui/ListChrome';
import { PIN_TD_ACTIONS, PIN_TH, PIN_TH_ACTIONS, mobileFold } from '@/components/ui/list-chrome';
import { RowActions } from '@/components/ui/RowActions';
import {
  useChatTags, useChatContacts, addChatTag, updateChatTag, removeChatTag,
  addChatContact, updateChatContact, removeChatContact, tagById,
  type ChatContact,
} from './chat-tags.data';

// ─────────────────────────────────────────────────────────────────────────────
// Settings ▸ Chat Tags — manage the role vocabulary (Adjuster, Insurance Agent …)
// and a directory of external contacts (name · tag · email) that the universal
// share dialog can pick from. Two tabs in the page header: the contacts (a list),
// and the tags they are filed under.
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'contacts' | 'tags';

export function ChatTagsSettingsPage() {
  const tags = useChatTags();
  const contacts = useChatContacts();
  const [tab, setTab] = useState<Tab>('contacts');
  const { scrollRef, onScroll, condensed, bridge } = usePageChrome(tab);
  const [contactDialog, setContactDialog] = useState<ChatContact | 'new' | null>(null);
  const [addingTag, setAddingTag] = useState(false);

  const used = useMemo(() => new Set(contacts.map(c => c.tagId)), [contacts]);
  const stats: KpiStat[] = [
    { id: 'contacts', label: 'Contacts', value: contacts.length, Icon: Users, accent: 'blue' },
    { id: 'tags', label: 'Tags', value: tags.length, Icon: TagIcon, accent: 'violet' },
    { id: 'used', label: 'Tags in use', value: tags.filter(t => used.has(t.id)).length, Icon: Check, accent: 'emerald' },
    { id: 'unused', label: 'Unused tags', value: tags.filter(t => !used.has(t.id)).length, Icon: CircleSlash, accent: 'slate' },
  ];

  return (
    <ListHeaderBridge value={bridge.value}>
      <div className="flex h-full min-h-0 flex-col bg-slate-50">
        <ListPageHeader
          Icon={MessageSquare}
          title="Chat Tags"
          description="Tags and saved contacts used when you share a record in a chat — pick a tagged recipient instead of retyping an email."
          condensed={condensed}
          chips={bridge.chips ?? undefined}
          tabs={[
            { id: 'contacts', label: 'Contacts', icon: Users, count: contacts.length },
            { id: 'tags', label: 'Tags', icon: TagIcon, count: tags.length },
          ]}
          activeTab={tab}
          onTabChange={(id) => setTab(id as Tab)}
          tabsLabel="Chat tags sections"
          actions={tab === 'contacts' ? (
            <Button onClick={() => setContactDialog('new')} className={cn('gap-2 bg-blue-600 text-white hover:bg-blue-700', condensed ? 'h-8' : 'h-9')}>
              <Plus className="h-4 w-4" /> Add contact
            </Button>
          ) : (
            <Button onClick={() => setAddingTag(true)} className={cn('gap-2 bg-blue-600 text-white hover:bg-blue-700', condensed ? 'h-8' : 'h-9')}>
              <Plus className="h-4 w-4" /> Add tag
            </Button>
          )}
        />

        {tab === 'contacts' && (
          <ContactsList contacts={contacts} tags={tags} stats={stats} scrollRef={scrollRef} onScroll={onScroll}
            onEdit={(c) => setContactDialog(c)} />
        )}
        {tab === 'tags' && (
          <ScrollBody scrollRef={scrollRef} onScroll={onScroll}>
            <KpiStatRow stats={stats} />
            <TagsCard tags={tags} contacts={contacts} adding={addingTag} onAdding={setAddingTag} />
          </ScrollBody>
        )}

        {contactDialog && (
          <Dialog open onOpenChange={(o) => { if (!o) setContactDialog(null); }}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{contactDialog === 'new' ? 'Add contact' : 'Edit contact'}</DialogTitle>
              </DialogHeader>
              <ContactForm
                initial={contactDialog === 'new' ? null : contactDialog}
                tags={tags}
                onCancel={() => setContactDialog(null)}
                onSave={(vals) => {
                  if (contactDialog === 'new') addChatContact(vals);
                  else updateChatContact(contactDialog.id, vals);
                  setContactDialog(null);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </ListHeaderBridge>
  );
}

// ── Contacts ───────────────────────────────────────────────────────────────
type Col = 'name' | 'tag' | 'email';
type GroupBy = 'none' | 'tag';
const GROUPS: { id: GroupBy; label: string }[] = [
  { id: 'none', label: 'No grouping' },
  { id: 'tag', label: 'Group: Tag' },
];

const TD = ({ children, className, onClick }: { children?: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) => (
  <td onClick={onClick} className={cn('px-4 py-2.5 text-sm align-middle whitespace-nowrap', className)}>{children}</td>
);

function ContactsList({ contacts, tags, stats, scrollRef, onScroll, onEdit }: {
  contacts: ChatContact[];
  tags: ReturnType<typeof useChatTags>;
  stats: KpiStat[];
  scrollRef?: React.Ref<HTMLDivElement>;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
  onEdit: (c: ChatContact) => void;
}) {
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useHeaderChips(chipsFromStats(stats));

  const tagLabel = (c: ChatContact) => tagById(c.tagId)?.label ?? 'No tag';
  const q = search.trim().toLowerCase();
  const rows = contacts.filter(c => {
    if (tagFilter && tagLabel(c) !== tagFilter) return false;
    return !q || [c.name, c.email, tagLabel(c)].some(s => s.toLowerCase().includes(q));
  });
  const readers = useMemo(() => ({
    name: (c: ChatContact) => c.name,
    tag: (c: ChatContact) => tagById(c.tagId)?.label ?? '',
    email: (c: ChatContact) => c.email,
  }), []);
  const { sort, onSort, sorted } = useTableSort<Col, ChatContact>(rows, readers, { col: 'name', dir: 'asc' });
  const tagOrder = (c: ChatContact) => { const i = tags.findIndex(t => t.id === c.tagId); return i < 0 ? tags.length : i; };
  const grouped = groupBy === 'none' ? sorted : sorted
    .map((c, i) => ({ c, i })).sort((x, y) => tagOrder(x.c) - tagOrder(y.c) || x.i - y.i).map(x => x.c);
  const groupCounts = new Map<string, number>();
  if (groupBy !== 'none') grouped.forEach(c => groupCounts.set(tagLabel(c), (groupCounts.get(tagLabel(c)) ?? 0) + 1));

  const pages = Math.max(1, Math.ceil(grouped.length / pageSize));
  const safePage = Math.min(page, pages);
  const slice = grouped.slice((safePage - 1) * pageSize, safePage * pageSize);
  const filterCount = [!!tagFilter, groupBy !== 'none'].filter(Boolean).length;
  const touched = filterCount > 0 || !!q;
  const reset = () => { setSearch(''); setTagFilter(''); setGroupBy('none'); setPage(1); };
  const toPage1 = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

  return (
    <ListScrollFrame
      above={<KpiStatRow stats={stats} />}
      title="Contacts"
      count={grouped.length}
      total={contacts.length}
      description="Outside people you share records with — adjusters, agents, lawyers, repair shops. Click a row to edit it."
      scrollRef={scrollRef}
      onScroll={onScroll}
      contentKey={`${filtersOpen}|${slice.length}`}
      toolbar={
        <ListToolbar search={search} onSearch={toPage1(setSearch)} placeholder="Search name, email, tag…"
          filters={<div className={mobileFold(filtersOpen)}>
            <FilterSelect value={tagFilter} onChange={toPage1(setTagFilter)} title="Tag" allLabel="All tags" options={tags.map(t => t.label)} />
          </div>}
          filtersExtra={<>
            <FiltersToggle open={filtersOpen} onToggle={() => setFiltersOpen(o => !o)} count={filterCount} />
            <div className={mobileFold(filtersOpen)}>
              <GroupBySelect value={groupBy} onChange={toPage1(setGroupBy)} options={GROUPS} />
              <ResetFilters on={touched} onReset={reset} />
            </div>
          </>} />
      }
      footer={<TablePager page={safePage} pageSize={pageSize} total={grouped.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />}
    >
      <table className="w-full">
        <thead>
          <tr>
            <SortTh col="name" label="Contact" sortable sort={sort} onSort={onSort} className={PIN_TH} />
            <SortTh col="tag" label="Tag" sortable sort={sort} onSort={onSort} className={PIN_TH} />
            <SortTh col="email" label="Email" sortable sort={sort} onSort={onSort} className={PIN_TH} />
            <SortTh label="Actions" sort={sort} className={PIN_TH_ACTIONS} />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {slice.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-14 text-center">
                <Users className="mx-auto h-7 w-7 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">{contacts.length ? 'No contact matches' : 'No contacts yet'}</p>
                <p className="mt-1 text-xs text-slate-500">{contacts.length ? 'Try another tag or search.' : 'Add an adjuster, agent, repair shop…'}</p>
                {touched && (
                  <button type="button" onClick={reset} className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Clear filters</button>
                )}
              </td>
            </tr>
          )}
          {slice.map((c, i) => {
            const tag = tagById(c.tagId);
            const band = groupBy === 'tag' && (i === 0 || tagLabel(slice[i - 1]) !== tagLabel(c));
            return (
              <Fragment key={c.id}>
                {band && <TableGroupBand label={tagLabel(c)} count={groupCounts.get(tagLabel(c)) ?? 0} colSpan={4} />}
                <tr className="group cursor-pointer transition-colors hover:bg-slate-50" onClick={() => onEdit(c)}>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">{initials(c.name)}</span>
                      <span className="font-semibold text-slate-900">{c.name}</span>
                    </div>
                  </TD>
                  <TD>{tag ? <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset', tag.color)}>{tag.label}</span> : <span className="text-slate-300">—</span>}</TD>
                  <TD className="text-[13px] text-slate-600"><span className="inline-flex items-center gap-1.5"><Mail size={12} className="text-slate-400" /> {c.email}</span></TD>
                  <TD className={PIN_TD_ACTIONS} onClick={(e) => e.stopPropagation()}>
                    <RowActions noun="contact" name={c.name} onEdit={() => onEdit(c)} onDelete={() => removeChatContact(c.id)} />
                  </TD>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </ListScrollFrame>
  );
}

// ── Tags ─────────────────────────────────────────────────────────────────────
function TagsCard({ tags, contacts, adding, onAdding }: {
  tags: ReturnType<typeof useChatTags>; contacts: ChatContact[]; adding: boolean; onAdding: (v: boolean) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const usage = (id: string) => contacts.filter(c => c.tagId === id).length;

  const startEdit = (id: string, label: string) => { setEditingId(id); setDraft(label); };
  const saveEdit = () => { if (editingId && draft.trim()) updateChatTag(editingId, { label: draft.trim() }); setEditingId(null); };
  const addNew = () => { if (newLabel.trim()) addChatTag(newLabel.trim()); setNewLabel(''); onAdding(false); };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Tags</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-600">{tags.length}</span>
          </div>
          <p className="mt-0.5 text-[12px] text-slate-500">The labels a contact is filed under. Hover a tag to rename or remove it; the number is how many contacts use it.</p>
        </div>
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
              <span className="rounded-full bg-white/70 px-1.5 text-[10px] font-bold tabular-nums">{usage(t.id)}</span>
              <button type="button" onClick={() => startEdit(t.id, t.label)} className="opacity-0 transition-opacity group-hover:opacity-100" aria-label={`Rename ${t.label}`}><Pencil size={12} /></button>
              <button type="button" onClick={() => removeChatTag(t.id)} className="opacity-0 transition-opacity group-hover:opacity-100" aria-label={`Remove ${t.label}`}><Trash2 size={12} /></button>
            </span>
          )
        ))}
        {adding && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1">
            <input autoFocus value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Tag name"
              onKeyDown={e => { if (e.key === 'Enter') addNew(); if (e.key === 'Escape') { onAdding(false); setNewLabel(''); } }}
              className="w-28 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            <button type="button" onClick={addNew} className="rounded p-0.5 text-emerald-600 hover:bg-emerald-50"><Check size={14} /></button>
            <button type="button" onClick={() => { onAdding(false); setNewLabel(''); }} className="rounded p-0.5 text-slate-400 hover:bg-slate-100"><X size={14} /></button>
          </span>
        )}
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
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Name</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
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
      <div className="mt-4 flex justify-end gap-2">
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
