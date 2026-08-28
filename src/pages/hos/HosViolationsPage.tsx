import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  Clock, Search, Download, Filter, Columns, ChevronDown, ChevronUp, ChevronsUpDown, X,
  ShieldAlert, CircleAlert, Flag, AlertOctagon, CheckCircle2, Gauge, Truck,
  Eye, Trash2, MoreVertical, GraduationCap, Ban, History, ClipboardCheck,
  FileWarning, RotateCcw, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/pages/ats/ats-ui';
import { KpiStatCard } from '@/components/ui/KpiStatCard';
import {
  getHosViolations, fmtDurationMin,
  HOS_TYPE_BY_ID, HOS_SEVERITY_TONE, HOS_STATUS_META, HOS_REGION_META, hosSeverityRank,
  HOS_TRAINING_TYPES, HOS_DISPOSITION_BY_ID,
  type HosViolationRecord, type HosSeverity, type HosVStatus, type HosRegion, type HosDisposition,
} from './hos-violations.data';
import { HosLogsView } from './HosLogsView';
import { COMPANY_TONE, HOS_COMPANIES } from '@/data/eld-providers.data';
import { ActivityTimeline } from '@/components/ui/ActivityTimeline';
import { ReviewResolutionTab, toActivityEntries } from '@/components/ui/ReviewResolution';
import { ACTIVITY_BADGE_TONE, type ActivityKind } from '@/components/ui/activity-kinds';
import { sendWidgetToDriver, consumePendingRecord, type RecordRef, type ChatWidget } from '@/pages/messages/messages-store';

const PAGE_SIZES = [10, 25, 50, 100];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtWhen(dt: string): { date: string; time: string } {
  const [d, t] = (dt || '').split('T');
  if (!d) return { date: dt || '—', time: '' };
  const [y, m, day] = d.split('-');
  const date = `${MONTHS[Number(m) - 1] ?? m} ${Number(day)}, ${y}`;
  if (!t) return { date, time: '' };
  const [hRaw, mm] = t.split(':');
  let hh = Number(hRaw);
  const ap = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;
  return { date, time: `${String(hh).padStart(2, '0')}:${mm ?? '00'} ${ap}` };
}

const AVATAR_COLORS = ['bg-rose-500', 'bg-pink-500', 'bg-fuchsia-500', 'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-sky-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500', 'bg-amber-500', 'bg-orange-500'];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '—';
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

// ── Region tab buckets ───────────────────────────────────────────────────────
type RegionBucket = 'all' | 'us' | 'canada' | 'both';
function bucketOf(region: HosRegion): Exclude<RegionBucket, 'all'> {
  if (region === 'US') return 'us';
  if (region === 'Both') return 'both';
  return 'canada'; // Canada + Canada South
}

// ── Columns ──────────────────────────────────────────────────────────────────
type ColId = 'driver' | 'company' | 'vehicle' | 'when' | 'violation' | 'type' | 'duration' | 'severity' | 'points' | 'action' | 'notes' | 'status';
const COLUMN_DEFS: { id: ColId; label: string; locked?: boolean; defaultOn: boolean }[] = [
  { id: 'driver', label: 'Driver', locked: true, defaultOn: true },
  { id: 'company', label: 'Source', defaultOn: true },
  { id: 'vehicle', label: 'Truck / Trailer', defaultOn: true },
  { id: 'when', label: 'Start time', locked: true, defaultOn: true },
  { id: 'violation', label: 'Violation', defaultOn: true },
  { id: 'type', label: 'Type', defaultOn: true },
  { id: 'duration', label: 'Duration', defaultOn: true },
  { id: 'severity', label: 'Severity', defaultOn: true },
  { id: 'points', label: 'Risk point', defaultOn: true },
  { id: 'action', label: 'Resolution', defaultOn: true },
  { id: 'notes', label: 'Review Notes', defaultOn: true },
  { id: 'status', label: 'Status', defaultOn: true },
];
const STATUS_RANK: Record<HosVStatus, number> = { open: 1, review: 2, resolved: 3 };
type SortState = { col: ColId; dir: 'asc' | 'desc' };
function sortVal(r: HosViolationRecord, col: ColId): string | number {
  switch (col) {
    case 'driver': return r.driverName.toLowerCase();
    case 'company': return r.company.toLowerCase();
    case 'vehicle': return (r.truckId ?? '').toLowerCase();
    case 'when': return r.dateTime;
    case 'violation': return (HOS_TYPE_BY_ID[r.typeId]?.label ?? '').toLowerCase();
    case 'type': return (HOS_TYPE_BY_ID[r.typeId]?.category ?? '').toLowerCase();
    case 'duration': return r.durationMin;
    case 'severity': return hosSeverityRank(r.severity);
    case 'points': return r.riskPoints;
    case 'action': return r.actionTaken.toLowerCase();
    case 'notes': return r.reviewNotes.toLowerCase();
    case 'status': return STATUS_RANK[r.status];
  }
}

function SortTh({ id, label, minW, align, sort, onSort }: {
  id: ColId; label: string; minW: string; align?: 'right'; sort: SortState | null; onSort: (id: ColId) => void;
}) {
  const active = sort?.col === id;
  return (
    <th className={cn('px-3 py-2.5 whitespace-nowrap', minW, align === 'right' && 'text-right')}>
      <button type="button" onClick={() => onSort(id)}
        className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider hover:text-slate-700', active ? 'text-slate-700' : 'text-slate-500')}>
        {label}
        {active ? (sort!.dir === 'asc' ? <ChevronUp size={12} className="text-blue-500" /> : <ChevronDown size={12} className="text-blue-500" />)
          : <ChevronsUpDown size={12} className="text-slate-300" />}
      </button>
    </th>
  );
}

function ColumnsDropdown({ visible, onToggle }: { visible: Set<ColId>; onToggle: (id: ColId) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
        <Columns size={14} /> Columns <ChevronDown size={13} className={cn('text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Toggle columns</div>
            {COLUMN_DEFS.map(c => (
              <label key={c.id} className={cn('flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-slate-700', c.locked ? 'opacity-60' : 'cursor-pointer hover:bg-slate-50')}>
                <input type="checkbox" disabled={c.locked} checked={visible.has(c.id)} onChange={() => onToggle(c.id)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                {c.label}
                {c.locked && <span className="ml-auto text-[10px] font-medium text-slate-400">Always</span>}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Region tab tones (mirrors the Default Accidents tabs)
const TAB_TONE: Record<string, { active: string; badge: string }> = {
  blue: { active: 'border-blue-600 text-blue-700 bg-blue-50/40', badge: 'bg-blue-100 text-blue-700' },
  sky: { active: 'border-sky-600 text-sky-700 bg-sky-50/40', badge: 'bg-sky-100 text-sky-700' },
  red: { active: 'border-red-600 text-red-700 bg-red-50/40', badge: 'bg-red-100 text-red-700' },
  violet: { active: 'border-violet-600 text-violet-700 bg-violet-50/40', badge: 'bg-violet-100 text-violet-700' },
};

// Sub-category (type) card palette (mirrors the accidents sub-category strip)
const SUBCAT_PALETTE = [
  { bg: 'bg-sky-50/60', count: 'text-sky-700', chip: 'bg-sky-50 text-sky-700 ring-sky-200', bar: 'bg-sky-500', barBg: 'bg-sky-100' },
  { bg: 'bg-violet-50/60', count: 'text-violet-700', chip: 'bg-violet-50 text-violet-700 ring-violet-200', bar: 'bg-violet-500', barBg: 'bg-violet-100' },
  { bg: 'bg-emerald-50/60', count: 'text-emerald-700', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-500', barBg: 'bg-emerald-100' },
  { bg: 'bg-amber-50/60', count: 'text-amber-700', chip: 'bg-amber-50 text-amber-700 ring-amber-200', bar: 'bg-amber-500', barBg: 'bg-amber-100' },
  { bg: 'bg-rose-50/60', count: 'text-rose-700', chip: 'bg-rose-50 text-rose-700 ring-rose-200', bar: 'bg-rose-500', barBg: 'bg-rose-100' },
  { bg: 'bg-indigo-50/60', count: 'text-indigo-700', chip: 'bg-indigo-50 text-indigo-700 ring-indigo-200', bar: 'bg-indigo-500', barBg: 'bg-indigo-100' },
  { bg: 'bg-teal-50/60', count: 'text-teal-700', chip: 'bg-teal-50 text-teal-700 ring-teal-200', bar: 'bg-teal-500', barBg: 'bg-teal-100' },
  { bg: 'bg-fuchsia-50/60', count: 'text-fuchsia-700', chip: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200', bar: 'bg-fuchsia-500', barBg: 'bg-fuchsia-100' },
];

function PersonCell({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white', avatarColor(name))}>{initials(name)}</span>
      <span className="truncate text-[13px] font-semibold text-slate-800" title={name}>{name}</span>
    </div>
  );
}

// Row-level kebab menu (Edit / Delete) — matches the accidents/tickets pattern.
// Uses a fixed-position portal so the menu escapes the sticky Action column's
// stacking context (otherwise sibling sticky cells cover it).
function RowActions({ items }: { items: { label: string; icon: LucideIcon; onClick: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: Math.min(r.bottom + 4, window.innerHeight - items.length * 40 - 12), left: Math.max(8, r.right - 160) });
    setOpen(true);
  };
  return (
    <>
      <button ref={btnRef} type="button" title="More actions" onClick={openMenu}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
        <MoreVertical size={15} />
      </button>
      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[70]" onClick={() => setOpen(false)} />
          <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: 160, zIndex: 80 }}
            className="rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            {items.map(it => (
              <button key={it.label} type="button" onClick={() => { setOpen(false); it.onClick(); }}
                className={cn('flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px]', it.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50')}>
                <it.icon size={14} /> {it.label}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

// Assign-training modal (bulk or single). `count` = drivers affected.
function TrainingModal({ count, onClose, onAssign }: { count: number; onClose: () => void; onAssign: (name: string) => void }) {
  const [name, setName] = useState(HOS_TRAINING_TYPES[0]);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600"><GraduationCap size={18} /></div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Assign training</h3>
            <p className="text-[13px] text-slate-500">Assign a training course to {count === 1 ? 'this driver' : <><span className="font-semibold text-slate-700">{count} drivers</span></>}.</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Training course</label>
          <select value={name} onChange={e => setName(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            {HOS_TRAINING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={() => onAssign(name)} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-violet-700"><GraduationCap size={15} /> Assign training</button>
        </div>
      </div>
    </div>
  );
}

// View popup with Details / Review / Activity tabs. The review lifecycle lives
// in its own tab (not embedded in the details form) via the shared
// ReviewResolutionTab, so it matches the Safety Events surface.
function HosViolationModal({ record, onClose, onAddNote, onDispose, onAssignTraining, onReopen, onVerify }: {
  record: HosViolationRecord;
  onClose: () => void;
  onAddNote: (text: string) => void;
  onDispose: (disp: HosDisposition) => void;
  onAssignTraining: () => void;
  onReopen: () => void;
  onVerify: () => void;
}) {
  const type = HOS_TYPE_BY_ID[record.typeId];
  const when = fmtWhen(record.dateTime);
  const st = HOS_STATUS_META[record.status];
  const verifiedAct = (record.activity ?? []).find(a => a.kind === 'verified');
  const [tab, setTab] = useState<'details' | 'review' | 'activity'>('details');
  const labelCls = 'text-[10px] font-bold uppercase tracking-wider text-slate-400';
  const Field = ({ label, value }: { label: string; value: ReactNode }) => (
    <div><div className={labelCls}>{label}</div><div className="mt-0.5 text-[13px] font-semibold text-slate-800">{value}</div></div>
  );

  const TABS = [['details', 'Details'], ['review', 'Review'], ['activity', `Activity (${record.activity?.length ?? 0})`]] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="flex h-[660px] max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 pt-4">
          <div className="min-w-0 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', COMPANY_TONE[record.company] ?? 'border-slate-200 bg-slate-50 text-slate-600')}>{record.company}</span>
              <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', HOS_SEVERITY_TONE[record.severity])}>{record.severity}</span>
              <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', st.tone)}><span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}</span>
              {record.falseViolation && <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700"><Ban size={10} /> False</span>}
            </div>
            <h3 className="mt-1.5 text-base font-bold text-slate-900">{type?.label ?? record.typeId}</h3>
            <p className="text-[12px] text-slate-500">{record.driverName} · {record.truckId} / {record.trailerId} · {when.date} {when.time}</p>
          </div>
          <button type="button" onClick={onClose} className="mt-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 px-5">
          {TABS.map(([id, lbl]) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className={cn('flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold transition-colors', tab === id ? 'border-orange-600 text-orange-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
              {id === 'review' && <ClipboardCheck size={14} />}{id === 'activity' && <History size={14} />}{lbl}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'details' && (
            <div className="space-y-4">
              {type?.description && <p className="text-[12px] leading-relaxed text-slate-500">{type.description}</p>}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="Type" value={type?.category ?? '—'} />
                <Field label="Duration" value={fmtDurationMin(record.durationMin)} />
                <Field label="Risk points" value={record.riskPoints} />
                <Field label="Source" value={record.company} />
                <Field label="Truck / Trailer" value={`${record.truckId} / ${record.trailerId}`} />
                <Field label="Resolution" value={record.disposition ? HOS_DISPOSITION_BY_ID[record.disposition].label : 'Pending review'} />
              </div>
              <div className="text-[11px] text-slate-400">Violation ID <span className="font-mono">{record.id}</span> · Received <span className="font-mono">{fmtWhen(record.receivedAt).date}</span></div>
            </div>
          )}
          {tab === 'review' && (
            <ReviewResolutionTab
              status={record.status}
              subjectName={record.driverName}
              disposition={record.disposition}
              trainingName={record.training?.name}
              reviewedBy={record.reviewedBy}
              reviewNotes={record.reviewNotes}
              verified={!!verifiedAct}
              verifiedBy={verifiedAct?.by}
              onDispose={onDispose}
              onAssignTraining={onAssignTraining}
              onReopen={onReopen}
              onAddNote={onAddNote}
              onVerify={onVerify}
            />
          )}
          {tab === 'activity' && (
            <ActivityTimeline entries={toActivityEntries(record.activity, fmtWhen)} />
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Close</button>
        </div>
      </div>
    </div>
  );
}

interface HosViolationsPageProps {
  accountId?: string;
  currentUserName?: string;
}

export function HosViolationsPage({ accountId, currentUserName = 'Safety Manager' }: HosViolationsPageProps = {}) {
  const [tab, setTab] = useState<'violations' | 'logs'>('violations');
  const [records, setRecords] = useState<HosViolationRecord[]>(() => getHosViolations(accountId));
  useEffect(() => { setRecords(getHosViolations(accountId)); setSelected(new Set()); }, [accountId]);

  // View popup + delete + multiselect + training.
  const [viewingId, setViewingId] = useState<string | null>(null);
  // Open a specific violation when arriving from a shared record / widget link.
  useEffect(() => { const id = consumePendingRecord('/safety-event/hours-of-service-violations'); if (id) setViewingId(id); }, []);
  const [deleting, setDeleting] = useState<HosViolationRecord | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [trainingIds, setTrainingIds] = useState<string[] | null>(null);
  const viewing = viewingId ? records.find(r => r.id === viewingId) ?? null : null;

  // ── Activity + review actions (each appends to the audit trail) ──
  const nowStamp = () => { const d = new Date(); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const newActId = () => `act-${Math.random().toString(36).slice(2, 9)}`;
  const withAct = (r: HosViolationRecord, kind: ActivityKind, detail?: string, title?: string): HosViolationRecord =>
    ({ ...r, activity: [...(r.activity ?? []), { id: newActId(), at: nowStamp(), by: currentUserName, kind, detail, title, badge: { label: 'Reviewer', tone: ACTIVITY_BADGE_TONE.Reviewer } }] });
  const applyTo = (ids: string[], fn: (r: HosViolationRecord) => HosViolationRecord) =>
    setRecords(prev => prev.map(r => (ids.includes(r.id) ? fn(r) : r)));

  const addNote = (id: string, text: string) => applyTo([id], r => withAct({ ...r, reviewNotes: r.reviewNotes ? `${r.reviewNotes}\n${text}` : text }, 'note', text));

  // A resolution pushes a driver-facing task/notice into the driver's chat.
  // 'false' (dismiss) and 'training' are handled elsewhere — dismiss sends nothing.
  const hosRef = (r: HosViolationRecord): RecordRef => ({
    type: 'hos', id: r.id, label: `HOS violation · ${r.driverName}`,
    sublabel: [HOS_TYPE_BY_ID[r.typeId]?.label, r.truckId].filter(Boolean).join(' · ') || undefined,
    path: '/safety-event/hours-of-service-violations',
  });
  const dispatchDisposition = (r: HosViolationRecord, disp: HosDisposition) => {
    if (disp === 'false' || disp === 'training') return;
    const evt = HOS_TYPE_BY_ID[r.typeId]?.label ?? 'HOS violation';
    const base = { status: 'pending' as const, record: hosRef(r), subtitle: evt };
    const map: Record<string, ChatWidget> = {
      warning: { ...base, kind: 'warning-letter', title: 'Warning letter' },
      alert: { ...base, kind: 'alert', title: 'Safety alert' },
      notice: { ...base, kind: 'notice', title: 'Driver notice' },
      terminated: { ...base, kind: 'termination', title: 'Termination notice' },
    };
    const widget = map[disp];
    if (widget) sendWidgetToDriver(r.driverName, widget, `${widget.title} regarding your ${evt}.`);
  };
  const sendTrainingWidget = (r: HosViolationRecord, name: string) => {
    sendWidgetToDriver(r.driverName, {
      kind: 'training', title: `Training assigned: ${name}`, subtitle: 'Complete your assigned safety training',
      status: 'pending', record: hosRef(r),
    }, `You've been assigned training: ${name}.`);
  };

  // Close a violation with a chosen resolution (disposition). Works on one or many.
  const closeWith = (ids: string[], disp: HosDisposition) => {
    const targets = records.filter(r => ids.includes(r.id));
    applyTo(ids, r => {
      const meta = HOS_DISPOSITION_BY_ID[disp];
      const base: HosViolationRecord = {
        ...r, status: 'resolved', disposition: disp, actionTaken: meta.label,
        reviewedBy: r.reviewedBy ?? currentUserName, reviewedAt: r.reviewedAt ?? nowStamp(),
        falseViolation: disp === 'false' ? true : r.falseViolation,
      };
      return withAct(base, meta.kind, `Closed — ${meta.label}`);
    });
    targets.forEach(r => dispatchDisposition(r, disp));
  };
  // Assigning training closes the violation with the "training" resolution.
  const assignTraining = (ids: string[], name: string) => {
    const targets = records.filter(r => ids.includes(r.id));
    applyTo(ids, r => withAct({
      ...r, training: { name, assignedBy: currentUserName, assignedAt: nowStamp() },
      status: 'resolved', disposition: 'training', actionTaken: `Training: ${name}`,
      reviewedBy: r.reviewedBy ?? currentUserName, reviewedAt: r.reviewedAt ?? nowStamp(),
    }, 'training', `Closed — assigned training: ${name}`));
    targets.forEach(r => sendTrainingWidget(r, name));
  };
  const reopenMany = (ids: string[]) => applyTo(ids, r => (r.status === 'review' ? r : withAct({ ...r, status: 'review', disposition: undefined, actionTaken: 'None — pending review' }, 'reopened', 'Reopened for review')));
  // Verify — logs a live "Verified" entry by the current user (once).
  const verify = (ids: string[]) => applyTo(ids, r => ((r.activity ?? []).some(a => a.kind === 'verified' && a.by === currentUserName)
    ? r
    : withAct({ ...r, reviewedBy: r.reviewedBy ?? currentUserName, reviewedAt: r.reviewedAt ?? nowStamp() }, 'verified', 'Verified against ELD edits.', 'Verified violation')));
  const confirmDelete = () => { if (deleting) setRecords(prev => prev.filter(x => x.id !== deleting.id)); setDeleting(null); };

  const toggleSel = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSel = () => setSelected(new Set());

  // Real-time audit: when the current user opens a violation, log an
  // "Opened for review" activity attributed to them (deduped, once per user).
  useEffect(() => {
    if (!viewingId) return;
    setRecords(prev => prev.map(r => {
      if (r.id !== viewingId) return r;
      if ((r.activity ?? []).some(a => a.kind === 'viewed' && a.by === currentUserName)) return r;
      const title = r.status === 'review' ? 'Opened for review' : 'Viewed record';
      return { ...r, activity: [...(r.activity ?? []), { id: newActId(), at: nowStamp(), by: currentUserName, kind: 'viewed', title, detail: `${currentUserName} opened this violation`, badge: { label: 'Reviewer', tone: ACTIVITY_BADGE_TONE.Reviewer } }] };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingId]);

  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState<HosSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<HosVStatus | 'all'>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [region, setRegion] = useState<RegionBucket>('all');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [subExpanded, setSubExpanded] = useState(false);

  const [sort, setSort] = useState<SortState | null>(null);
  const toggleSort = (col: ColId) => setSort(s => (s?.col === col ? (s.dir === 'asc' ? { col, dir: 'desc' } : null) : { col, dir: 'asc' }));
  const [visibleCols, setVisibleCols] = useState<Set<ColId>>(() => new Set(COLUMN_DEFS.filter(c => c.defaultOn).map(c => c.id)));
  const toggleCol = (id: ColId) => setVisibleCols(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const showCol = (id: ColId) => visibleCols.has(id);

  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const kpis = useMemo(() => ({
    total: records.length,
    critical: records.filter(r => r.severity === 'Critical').length,
    high: records.filter(r => r.severity === 'High').length,
    review: records.filter(r => r.status === 'review').length,
    resolved: records.filter(r => r.status === 'resolved').length,
    points: records.reduce((a, r) => a + r.riskPoints, 0),
  }), [records]);

  const regionCounts = useMemo(() => {
    const c = { all: records.length, us: 0, canada: 0, both: 0 };
    for (const r of records) {
      const b = bucketOf(HOS_TYPE_BY_ID[r.typeId]?.region ?? 'US');
      c[b]++;
    }
    return c;
  }, [records]);

  // Everything except the type sub-filter — feeds the type breakdown cards.
  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter(r => {
      if (sevFilter !== 'all' && r.severity !== sevFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (companyFilter !== 'all' && r.company !== companyFilter) return false;
      if (region !== 'all' && bucketOf(HOS_TYPE_BY_ID[r.typeId]?.region ?? 'US') !== region) return false;
      if (q) {
        const label = HOS_TYPE_BY_ID[r.typeId]?.label ?? '';
        if (!`${r.driverName} ${r.company} ${label} ${r.actionTaken} ${r.reviewNotes} ${r.truckId ?? ''} ${r.trailerId ?? ''}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [records, search, sevFilter, statusFilter, companyFilter, region]);
  const companies = useMemo(() => HOS_COMPANIES.filter(c => records.some(r => r.company === c)), [records]);

  const typeBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    baseFiltered.forEach(r => counts.set(r.typeId, (counts.get(r.typeId) ?? 0) + 1));
    return [...counts.entries()]
      .map(([id, count]) => ({ id, count, label: HOS_TYPE_BY_ID[id]?.label ?? id }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [baseFiltered]);

  const filtered = useMemo(
    () => (typeFilter ? baseFiltered.filter(r => r.typeId === typeFilter) : baseFiltered),
    [baseFiltered, typeFilter],
  );

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = sortVal(a, sort.col), bv = sortVal(b, sort.col);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filtered, sort]);

  useEffect(() => { setPage(1); }, [search, sevFilter, statusFilter, companyFilter, region, typeFilter, pageSize]);
  useEffect(() => { setTypeFilter(null); setSubExpanded(false); }, [region]);

  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);
  const start = (safePage - 1) * pageSize;
  const rows = sorted.slice(start, start + pageSize);
  const pageIds = rows.map(r => r.id);
  const allSel = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const toggleAll = () => setSelected(prev => {
    const n = new Set(prev);
    if (allSel) pageIds.forEach(id => n.delete(id)); else pageIds.forEach(id => n.add(id));
    return n;
  });
  const selectedIds = [...selected];

  const kpiAllActive = sevFilter === 'all' && statusFilter === 'all';
  const toggleSev = (s: HosSeverity) => setSevFilter(p => (p === s ? 'all' : s));
  const toggleStatus = (s: HosVStatus) => setStatusFilter(p => (p === s ? 'all' : s));

  const REGION_TABS: { id: RegionBucket; label: string; tone: keyof typeof TAB_TONE; count: number }[] = [
    { id: 'all', label: 'All Rules', tone: 'blue', count: regionCounts.all },
    { id: 'us', label: 'US Federal', tone: 'sky', count: regionCounts.us },
    { id: 'canada', label: 'Canada', tone: 'red', count: regionCounts.canada },
    { id: 'both', label: 'Cross-border', tone: 'violet', count: regionCounts.both },
  ];

  const anyFilter = sevFilter !== 'all' || statusFilter !== 'all' || companyFilter !== 'all' || region !== 'all' || typeFilter || search;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        iconGradient="from-orange-500 to-red-600"
        Icon={Clock}
        title="Hours of Service"
        subtitle="Driver duty-status logs and FMCSA / Canadian HOS violations, synced from your ELD provider"
        actions={
          <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50">
            <Download size={15} /> Export
          </button>
        }
      >
        <div className="flex gap-1">
          {([['logs', 'Logs'], ['violations', 'Violations']] as const).map(([id, label]) => {
            const active = tab === id;
            return (
              <button key={id} type="button" onClick={() => setTab(id)}
                className={cn('relative flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
                  active ? 'border-orange-600 text-orange-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
                {label}
              </button>
            );
          })}
        </div>
      </PageHeader>

      {tab === 'logs' && <HosLogsView accountId={accountId} />}
      {tab === 'violations' && (
      <div className="space-y-5 p-4 sm:p-8">
        {/* KPI cards — click to filter by severity / status */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <KpiStatCard label="Total Violations" value={kpis.total} Icon={ShieldAlert} accent="blue"
            active={kpiAllActive && region === 'all' && !typeFilter}
            onClick={() => { setSevFilter('all'); setStatusFilter('all'); setRegion('all'); setTypeFilter(null); }} />
          <KpiStatCard label="Critical" value={kpis.critical} Icon={AlertOctagon} accent="red"
            active={sevFilter === 'Critical'} onClick={() => toggleSev('Critical')} />
          <KpiStatCard label="High" value={kpis.high} Icon={CircleAlert} accent="amber"
            active={sevFilter === 'High'} onClick={() => toggleSev('High')} />
          <KpiStatCard label="In Review" value={kpis.review} Icon={Flag} accent="amber"
            active={statusFilter === 'review'} onClick={() => toggleStatus('review')} />
          <KpiStatCard label="Closed" value={kpis.resolved} Icon={CheckCircle2} accent="emerald"
            active={statusFilter === 'resolved'} onClick={() => toggleStatus('resolved')} />
          <KpiStatCard label="Risk Points" value={kpis.points} Icon={Gauge} accent="violet" />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Region tabs */}
          <div className="flex overflow-x-auto border-b border-slate-200">
            {REGION_TABS.map(tab => {
              const active = region === tab.id;
              const tone = TAB_TONE[tab.tone];
              return (
                <button key={tab.id} type="button" onClick={() => setRegion(tab.id)}
                  className={cn('group relative flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 transition-colors',
                    active ? tone.active : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800')}>
                  <span className="text-sm font-semibold">{tab.label}</span>
                  <span className={cn('inline-flex h-5 min-w-[24px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums', active ? tone.badge : 'bg-slate-100 text-slate-500')}>{tab.count}</span>
                </button>
              );
            })}
          </div>

          {/* Sub-category — violation-type breakdown cards (the "type filters") */}
          <div className="border-b border-slate-200 bg-slate-50/40 px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Violation types in this view</div>
                <div className="text-[11px] text-slate-400">Click a card to narrow the table to that violation type</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {typeFilter && (
                  <button type="button" onClick={() => setTypeFilter(null)} className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:opacity-80">Clear type <X size={11} /></button>
                )}
                {typeBreakdown.length > 8 && (
                  <button type="button" onClick={() => setSubExpanded(v => !v)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50">
                    {subExpanded ? 'Show less' : 'Show all types'}
                    <ChevronDown size={13} className={cn('transition-transform', subExpanded && 'rotate-180')} />
                  </button>
                )}
              </div>
            </div>
            {typeBreakdown.length === 0 ? (
              <div className="py-4 text-center text-[12px] italic text-slate-400">No violation types in this view.</div>
            ) : (
              <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4',
                subExpanded && 'max-h-[264px] overflow-y-auto overscroll-contain pr-1')}>
                {(subExpanded ? typeBreakdown : typeBreakdown.slice(0, 8)).map((t, i) => {
                  const selected = typeFilter === t.id;
                  const denom = baseFiltered.length || 1;
                  const sharePct = (t.count / denom) * 100;
                  const c = SUBCAT_PALETTE[i % SUBCAT_PALETTE.length];
                  return (
                    <button key={t.id} type="button" onClick={() => setTypeFilter(selected ? null : t.id)}
                      title={`${t.label} — ${t.count}`}
                      className={cn('group flex h-full flex-col overflow-hidden rounded-lg border text-left shadow-sm transition-all',
                        selected ? 'border-blue-600 ring-2 ring-blue-300/40 bg-white' : cn('border-slate-200 hover:border-slate-300 hover:shadow-md', c.bg))}>
                      <div className={cn('h-1 w-full', selected ? 'bg-blue-500' : c.bar)} />
                      <div className="flex flex-1 flex-col px-3 py-2.5">
                        <div className="line-clamp-2 min-h-[2.6em] text-[11px] font-semibold leading-snug text-slate-700" title={t.label}>{t.label}</div>
                        <div className="mt-2 flex items-end justify-between gap-2">
                          <span className={cn('text-[22px] font-bold leading-none tabular-nums', selected ? 'text-blue-700' : c.count)}>{t.count}</span>
                          <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ring-1', selected ? 'text-blue-700 bg-white ring-blue-300/40' : c.chip)}>{sharePct.toFixed(0)}%</span>
                        </div>
                        <div className={cn('mt-2 h-1 overflow-hidden rounded-full', selected ? 'bg-slate-100' : c.barBg)}>
                          <div className={cn('h-full rounded-full transition-all', selected ? 'bg-blue-500' : c.bar)} style={{ width: `${Math.min(100, sharePct)}%` }} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-3 sm:px-4">
            <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search driver, violation, notes…"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <span className="hidden shrink-0 items-center text-slate-400 sm:inline-flex"><Filter size={14} /></span>
            <select value={sevFilter} onChange={e => setSevFilter(e.target.value as HosSeverity | 'all')}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none">
              <option value="all">All severities</option>
              {(['Critical', 'High', 'Medium', 'Low'] as HosSeverity[]).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as HosVStatus | 'all')}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none">
              <option value="all">All statuses</option>
              <option value="review">In Review</option>
              <option value="resolved">Closed</option>
            </select>
            <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none">
              <option value="all">All sources</option>
              {companies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ColumnsDropdown visible={visibleCols} onToggle={toggleCol} />
            <div className="ml-auto flex items-center gap-2">
              {anyFilter && (
                <button type="button" onClick={() => { setSearch(''); setSevFilter('all'); setStatusFilter('all'); setCompanyFilter('all'); setRegion('all'); setTypeFilter(null); }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">
                  <X size={13} /> Clear
                </button>
              )}
              <span className="shrink-0 text-[12px] font-medium text-slate-400 tabular-nums">{total} of {records.length}</span>
            </div>
          </div>

          {/* Bulk-action bar (multiselect) */}
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-blue-100 bg-blue-50/70 px-3 py-2.5 sm:px-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[12px] font-bold text-blue-700 shadow-sm ring-1 ring-blue-200">{selected.size} selected</span>
              <span className="text-[12px] font-medium text-slate-500">Close as:</span>
              <button type="button" onClick={() => setTrainingIds(selectedIds)} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:bg-violet-700"><GraduationCap size={14} /> Assign training</button>
              <button type="button" onClick={() => { closeWith(selectedIds, 'warning'); clearSel(); }} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-amber-700 hover:bg-amber-50"><FileWarning size={14} /> Warning letter</button>
              <button type="button" onClick={() => { closeWith(selectedIds, 'false'); clearSel(); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"><Ban size={14} /> Dismiss false</button>
              <button type="button" onClick={() => { reopenMany(selectedIds); clearSel(); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw size={14} /> Reopen</button>
              <button type="button" onClick={clearSel} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-500 hover:bg-slate-50"><X size={13} /> Clear</button>
            </div>
          )}

          {total === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><ShieldAlert size={22} /></div>
              <p className="text-sm font-semibold text-slate-700">No violations {anyFilter ? 'match your filters' : 'recorded yet'}</p>
              <p className="mt-1 text-xs text-slate-400">Try adjusting the filters or search term.</p>
            </div>
          ) : (<>
            {/* Desktop table (xl+) */}
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-max text-left">
                <thead className="border-b border-slate-200 bg-slate-50/60">
                  <tr>
                    <th className="w-10 pl-5 pr-1 py-2.5">
                      <input type="checkbox" checked={allSel} onChange={toggleAll} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                    </th>
                    {showCol('driver') && <SortTh id="driver" label="Driver" minW="min-w-[170px]" sort={sort} onSort={toggleSort} />}
                    {showCol('company') && <SortTh id="company" label="Source" minW="min-w-[100px]" sort={sort} onSort={toggleSort} />}
                    {showCol('vehicle') && <SortTh id="vehicle" label="Truck / Trailer" minW="min-w-[130px]" sort={sort} onSort={toggleSort} />}
                    {showCol('when') && <SortTh id="when" label="Start time" minW="min-w-[130px]" sort={sort} onSort={toggleSort} />}
                    {showCol('violation') && <SortTh id="violation" label="Violation" minW="min-w-[240px]" sort={sort} onSort={toggleSort} />}
                    {showCol('type') && <SortTh id="type" label="Type" minW="min-w-[120px]" sort={sort} onSort={toggleSort} />}
                    {showCol('duration') && <SortTh id="duration" label="Duration" minW="min-w-[90px]" align="right" sort={sort} onSort={toggleSort} />}
                    {showCol('severity') && <SortTh id="severity" label="Severity" minW="min-w-[100px]" sort={sort} onSort={toggleSort} />}
                    {showCol('points') && <SortTh id="points" label="Risk point" minW="min-w-[90px]" align="right" sort={sort} onSort={toggleSort} />}
                    {showCol('action') && <SortTh id="action" label="Resolution" minW="min-w-[160px]" sort={sort} onSort={toggleSort} />}
                    {showCol('notes') && <SortTh id="notes" label="Review Notes" minW="min-w-[240px]" sort={sort} onSort={toggleSort} />}
                    {showCol('status') && <SortTh id="status" label="Status" minW="min-w-[120px]" sort={sort} onSort={toggleSort} />}
                    <th className="sticky right-0 z-[2] min-w-[110px] border-l border-slate-200 bg-slate-100 px-3 py-2.5 pr-5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const type = HOS_TYPE_BY_ID[r.typeId];
                    const when = fmtWhen(r.dateTime);
                    const st = HOS_STATUS_META[r.status];
                    const isSel = selected.has(r.id);
                    return (
                        <tr key={r.id} onClick={() => setViewingId(r.id)}
                          className={cn('group cursor-pointer border-b border-slate-100 align-middle hover:bg-slate-50/60', isSel && 'bg-blue-50/50')}>
                          <td className="w-10 pl-5 pr-1 py-3" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={isSel} onChange={() => toggleSel(r.id)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                          </td>
                          {showCol('driver') && (
                            <td className="px-3 py-3"><PersonCell name={r.driverName} /></td>
                          )}
                          {showCol('company') && (
                            <td className="px-3 py-3"><span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', COMPANY_TONE[r.company] ?? 'border-slate-200 bg-slate-50 text-slate-600')}>{r.company}</span></td>
                          )}
                          {showCol('vehicle') && (
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1 whitespace-nowrap text-[12px] font-semibold text-slate-700"><Truck size={11} className="shrink-0 text-slate-300" /> {r.truckId ?? '—'}</div>
                              <div className="text-[11px] text-slate-400">{r.trailerId ?? '—'}</div>
                            </td>
                          )}
                          {showCol('when') && (
                            <td className="px-3 py-3">
                              <div className="whitespace-nowrap text-[13px] font-semibold text-slate-800">{when.date}</div>
                              <div className="text-[11px] tabular-nums text-slate-400">{when.time}</div>
                            </td>
                          )}
                          {showCol('violation') && (
                            <td className="px-3 py-3">
                              <div className="text-[13px] font-semibold text-slate-800">{type?.label ?? r.typeId}</div>
                              <div className="mt-0.5 flex items-center gap-1.5">
                                {type && <span className={cn('inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold', HOS_REGION_META[type.region].tone)}>{HOS_REGION_META[type.region].label}</span>}
                                <span className="line-clamp-1 text-[11px] text-slate-400" title={type?.description}>{type?.description}</span>
                              </div>
                            </td>
                          )}
                          {showCol('type') && (
                            <td className="px-3 py-3"><span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{type?.category ?? '—'}</span></td>
                          )}
                          {showCol('duration') && (
                            <td className="px-3 py-3 text-right"><span className="whitespace-nowrap font-mono text-[12px] font-semibold text-slate-700">{fmtDurationMin(r.durationMin)}</span></td>
                          )}
                          {showCol('severity') && (
                            <td className="px-3 py-3"><span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', HOS_SEVERITY_TONE[r.severity])}>{r.severity}</span></td>
                          )}
                          {showCol('points') && (
                            <td className="px-3 py-3 text-right"><span className="inline-flex min-w-[34px] items-center justify-center rounded-md bg-slate-100 px-2 py-1 text-[12px] font-bold tabular-nums text-slate-700">{r.riskPoints}</span></td>
                          )}
                          {showCol('action') && (
                            <td className="px-3 py-3">
                              {r.disposition
                                ? (() => { const d = HOS_DISPOSITION_BY_ID[r.disposition]; return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', d.tone)}>{d.label}</span>; })()
                                : <span className="text-[11px] text-slate-400">Pending review</span>}
                            </td>
                          )}
                          {showCol('notes') && (
                            <td className="px-3 py-3"><span className="line-clamp-2 max-w-[280px] text-[12px] leading-snug text-slate-500" title={r.reviewNotes}>{r.reviewNotes}</span></td>
                          )}
                          {showCol('status') && (
                            <td className="px-3 py-3"><span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', st.tone)}><span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', st.dot)} />{st.label}</span></td>
                          )}
                          <td className={cn('sticky right-0 z-[1] border-l border-slate-100 px-3 py-3 pr-5', isSel ? 'bg-blue-50/50' : 'bg-white group-hover:bg-slate-50')}>
                            <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                              <button type="button" title="View" onClick={() => setViewingId(r.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
                                <Eye size={14} />
                              </button>
                              <RowActions items={[
                                { label: 'Assign training', icon: GraduationCap, onClick: () => setTrainingIds([r.id]) },
                                { label: 'Reopen', icon: RotateCcw, onClick: () => reopenMany([r.id]) },
                                { label: 'Delete', icon: Trash2, onClick: () => setDeleting(r), danger: true },
                              ]} />
                            </div>
                          </td>
                        </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Card list (below xl) */}
            <ul className="divide-y divide-slate-100 xl:hidden">
              {rows.map(r => {
                const type = HOS_TYPE_BY_ID[r.typeId];
                const when = fmtWhen(r.dateTime);
                const st = HOS_STATUS_META[r.status];
                const isSel = selected.has(r.id);
                return (
                  <li key={r.id} onClick={() => setViewingId(r.id)} className={cn('cursor-pointer space-y-2 px-4 py-3.5', isSel && 'bg-blue-50/50')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <input type="checkbox" checked={isSel} onClick={e => e.stopPropagation()} onChange={() => toggleSel(r.id)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800">{type?.label ?? r.typeId}</p>
                          <p className="text-[11px] text-slate-400">{r.driverName} · {when.date} · {when.time}</p>
                        </div>
                      </div>
                      <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold', st.tone)}>{st.label}</span>
                    </div>
                    <p className="line-clamp-2 text-[12px] leading-snug text-slate-500">{r.reviewNotes}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', COMPANY_TONE[r.company] ?? 'border-slate-200 bg-slate-50 text-slate-600')}>{r.company}</span>
                      <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', HOS_SEVERITY_TONE[r.severity])}>{r.severity}</span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600"><Gauge size={10} /> {r.riskPoints} pts</span>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{fmtDurationMin(r.durationMin)}</span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600"><Truck size={10} /> {r.truckId ?? '—'} / {r.trailerId ?? '—'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500"><Truck size={11} className="text-slate-300" /> {r.actionTaken}</div>
                      <div className="flex shrink-0 items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <button type="button" title="View" onClick={() => setViewingId(r.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"><Eye size={14} /></button>
                        <RowActions items={[
                          { label: 'Assign training', icon: GraduationCap, onClick: () => setTrainingIds([r.id]) },
                          { label: 'Reopen', icon: RotateCcw, onClick: () => reopenMany([r.id]) },
                          { label: 'Delete', icon: Trash2, onClick: () => setDeleting(r), danger: true },
                        ]} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
              <label className="flex items-center gap-1.5 text-[12px] text-slate-500">Rows per page
                <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none">
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <div className="flex items-center gap-1">
                <span className="mr-2 text-[12px] text-slate-500 tabular-nums">{start + 1}–{Math.min(start + pageSize, total)} of {total}</span>
                <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="inline-flex h-8 items-center rounded-md border border-slate-200 px-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Prev</button>
                <span className="px-2 text-[12px] text-slate-600 tabular-nums">Page {safePage} of {pages}</span>
                <button type="button" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)} className="inline-flex h-8 items-center rounded-md border border-slate-200 px-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
              </div>
            </div>
          </>)}
        </div>
      </div>
      )}

      {viewing && (
        <HosViolationModal
          record={viewing}
          onClose={() => setViewingId(null)}
          onAddNote={(t) => addNote(viewing.id, t)}
          onDispose={(disp) => closeWith([viewing.id], disp)}
          onAssignTraining={() => setTrainingIds([viewing.id])}
          onReopen={() => reopenMany([viewing.id])}
          onVerify={() => verify([viewing.id])}
        />
      )}

      {trainingIds && (
        <TrainingModal
          count={trainingIds.length}
          onClose={() => setTrainingIds(null)}
          onAssign={(name) => { assignTraining(trainingIds, name); setTrainingIds(null); if (trainingIds.length > 1) clearSel(); }}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setDeleting(null)}>
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Trash2 size={18} /></div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-800">Delete this violation?</h3>
                <p className="mt-1 text-[13px] leading-snug text-slate-500">
                  This removes the <span className="font-semibold text-slate-700">{HOS_TYPE_BY_ID[deleting.typeId]?.label ?? 'violation'}</span> for <span className="font-semibold text-slate-700">{deleting.driverName}</span>. This can't be undone.
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setDeleting(null)} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={confirmDelete} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-rose-700"><Trash2 size={15} /> Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
