import {
  FilePlus2, Download, Database, Pencil, Trash2, Upload, Share2, Eye, ShieldCheck,
  CheckCircle2, StickyNote, TriangleAlert, UserPlus, Send, Reply, Inbox, GraduationCap,
  FileWarning, BellRing, Megaphone, UserX, Ban, RotateCcw, Flag, FileText, Video,
  MessageSquare, PenLine, ThumbsUp, type LucideIcon,
} from 'lucide-react';

/**
 * Shared activity-timeline vocabulary. Every surface that shows an audit trail
 * (Tickets, Default Accidents, HOS violations, Telematics & Video events) maps
 * its events onto these kinds so the timeline icons, labels and colors stay
 * consistent. Covers the full lifecycle the user cares about: who created it,
 * received it, viewed it, changed it, uploaded/attached a document or video,
 * shared it, reviewed / verified it, what action was taken, and deletions.
 */
export type ActivityKind =
  | 'created' | 'received' | 'recorded' | 'updated' | 'deleted' | 'uploaded'
  | 'shared' | 'viewed' | 'verified' | 'reviewed' | 'note' | 'reported'
  | 'assigned' | 'sent' | 'responded' | 'requested' | 'training' | 'warning'
  | 'alert' | 'notice' | 'terminated' | 'false' | 'reopened' | 'status'
  | 'document' | 'video' | 'message' | 'signed' | 'approved';

export interface ActivityKindMeta {
  /** Default title when the entry supplies none. */
  label: string;
  icon: LucideIcon;
  /** Tailwind background class for the icon circle. */
  dot: string;
}

export const ACTIVITY_KIND_META: Record<ActivityKind, ActivityKindMeta> = {
  created:    { label: 'Created in system',   icon: FilePlus2,     dot: 'bg-blue-500' },
  received:   { label: 'Received from source', icon: Download,      dot: 'bg-slate-400' },
  recorded:   { label: 'Recorded in system',  icon: Database,      dot: 'bg-slate-500' },
  updated:    { label: 'Updated',             icon: Pencil,        dot: 'bg-amber-500' },
  deleted:    { label: 'Deleted',             icon: Trash2,        dot: 'bg-rose-500' },
  uploaded:   { label: 'File uploaded',       icon: Upload,        dot: 'bg-sky-500' },
  shared:     { label: 'Shared',              icon: Share2,        dot: 'bg-indigo-500' },
  viewed:     { label: 'Viewed',              icon: Eye,           dot: 'bg-slate-400' },
  verified:   { label: 'Verified',            icon: ShieldCheck,   dot: 'bg-emerald-500' },
  reviewed:   { label: 'Reviewed',            icon: CheckCircle2,  dot: 'bg-blue-500' },
  note:       { label: 'Note added',          icon: StickyNote,    dot: 'bg-slate-500' },
  reported:   { label: 'Reported',            icon: TriangleAlert, dot: 'bg-violet-500' },
  assigned:   { label: 'Assigned',            icon: UserPlus,      dot: 'bg-violet-500' },
  sent:       { label: 'Sent',                icon: Send,          dot: 'bg-blue-500' },
  responded:  { label: 'Responded',           icon: Reply,         dot: 'bg-teal-500' },
  requested:  { label: 'Documents requested', icon: Inbox,         dot: 'bg-orange-500' },
  training:   { label: 'Training assigned',   icon: GraduationCap, dot: 'bg-violet-500' },
  warning:    { label: 'Warning letter issued', icon: FileWarning, dot: 'bg-amber-500' },
  alert:      { label: 'Safety alert sent',   icon: BellRing,      dot: 'bg-orange-500' },
  notice:     { label: 'Driver notice sent',  icon: Megaphone,     dot: 'bg-blue-500' },
  terminated: { label: 'Driver terminated',   icon: UserX,         dot: 'bg-red-500' },
  false:      { label: 'Dismissed as false',  icon: Ban,           dot: 'bg-slate-500' },
  reopened:   { label: 'Reopened for review', icon: RotateCcw,     dot: 'bg-rose-500' },
  status:     { label: 'Status changed',      icon: Flag,          dot: 'bg-emerald-500' },
  document:   { label: 'Document added',      icon: FileText,      dot: 'bg-sky-500' },
  video:      { label: 'Video attached',      icon: Video,         dot: 'bg-fuchsia-500' },
  message:    { label: 'Message',             icon: MessageSquare, dot: 'bg-cyan-500' },
  signed:     { label: 'Signed',              icon: PenLine,       dot: 'bg-teal-500' },
  approved:   { label: 'Approved',            icon: ThumbsUp,      dot: 'bg-emerald-500' },
};

const FALLBACK: ActivityKindMeta = { label: 'Activity', icon: CheckCircle2, dot: 'bg-slate-400' };

/** Look up meta for any kind string, with a safe fallback. */
export function activityMeta(kind: string): ActivityKindMeta {
  return ACTIVITY_KIND_META[kind as ActivityKind] ?? FALLBACK;
}

/** Role / source badge tones for timeline entries (Office, Driver, Adjuster…). */
export const ACTIVITY_BADGE_TONE: Record<string, string> = {
  System: 'bg-slate-100 text-slate-600',
  Source: 'bg-slate-100 text-slate-600',
  Office: 'bg-blue-50 text-blue-700',
  Driver: 'bg-violet-50 text-violet-700',
  Manager: 'bg-emerald-50 text-emerald-700',
  Reviewer: 'bg-blue-50 text-blue-700',
  Adjuster: 'bg-orange-50 text-orange-700',
  Camera: 'bg-fuchsia-50 text-fuchsia-700',
};
