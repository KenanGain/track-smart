import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
    ChevronLeft, AlertTriangle, ShieldCheck, Pencil, Trash2, FileText, Camera, Video, Eye, X, Sparkles, Download,
    Building2, User, Car, Users, Shield, Cloud, MapPin, Truck, Wrench, Activity as ActivityIcon,
    Boxes, Gauge, Clock, Search, ChevronsUpDown, Mail, Send, Paperclip, MessageSquare, Inbox, CornerUpLeft, Smartphone, Upload, Signature, MoreVertical, Check, ExternalLink, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { tagColor } from '@/pages/compliance/safety-tags.data';
import { TagField } from '@/components/ui/TagField';
import { AccidentDocDocument } from './AccidentDocDocument';
import { AccidentReportViewer } from './AccidentReportViewer';
import { DocumentTemplateBuilder } from '@/pages/hiring-process/DocumentTemplateBuilder';
import { type DocFile } from '@/pages/hiring-process/document-templates.data';
import { accidentReportFileName } from './accident-report';
import { ACCIDENT_TYPES, RISK_TYPE_TONE, type AccidentRiskType } from '@/data/accident-types.data';
import {
    ACCIDENT_STATUS_META, SOURCE_META, ACTIVITY_ROLE_META, CASE_STATUS_META, ALERT_META,
    type AccidentRecord, type AccidentFile, type AccidentActivity, type AccidentCase, type CaseMessage, type CaseAttachment,
} from '@/data/accident-records.data';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDateTime(dt?: string): string {
    if (!dt) return '—';
    const [d, t] = dt.split('T');
    const [y, m, day] = (d || '').split('-');
    if (!y) return dt;
    return `${MONTHS[Number(m) - 1] ?? m} ${Number(day)}, ${y}${t ? ` · ${t}` : ''}`;
}
function typeLabel(id: string): string {
    return ACCIDENT_TYPES.find(t => t.id === id)?.displayName ?? '';
}
function typesOf(r: AccidentRecord): string {
    const ids = r.accidentTypeIds?.length ? r.accidentTypeIds : (r.accidentTypeId ? [r.accidentTypeId] : []);
    return ids.map(typeLabel).filter(Boolean).join(', ');
}
const yesNo = (v?: boolean) => (v ? 'Yes' : 'No');
const composed = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(', ');
const has = (...vals: unknown[]) => vals.some(v => v !== undefined && v !== null && v !== '' && v !== false && !(Array.isArray(v) && v.length === 0));

// ── Small read-only building blocks ──────────────────────────────
function InfoCard({ title, icon: Icon, right, children }: { title: string; icon: LucideIcon; right?: ReactNode; children: ReactNode }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
                <Icon size={15} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">{title}</h3>
                {right && <div className="ml-auto">{right}</div>}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}
function Field({ label, value, wide }: { label: string; value?: ReactNode; wide?: boolean }) {
    const empty = value === undefined || value === null || value === '' || value === false;
    return (
        <div className={wide ? 'col-span-2 sm:col-span-3' : ''}>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-0.5 text-[13px] text-slate-800">{empty ? <span className="text-slate-300">—</span> : value}</dd>
        </div>
    );
}
function Grid({ children }: { children: ReactNode }) {
    return <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">{children}</dl>;
}
function ChipList({ items }: { items?: string[] }) {
    if (!items || items.length === 0) return <span className="text-slate-300">—</span>;
    return (
        <div className="flex flex-wrap gap-1.5">
            {items.map(x => <span key={x} className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">{x}</span>)}
        </div>
    );
}
/** Classify a file by extension into a coloured type badge. */
function fileKind(name: string): { label: string; tone: string } {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return { label: 'Image', tone: 'border-blue-200 bg-blue-50 text-blue-700' };
    if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) return { label: 'Video', tone: 'border-violet-200 bg-violet-50 text-violet-700' };
    if (ext === 'pdf') return { label: 'PDF', tone: 'border-rose-200 bg-rose-50 text-rose-700' };
    return { label: 'Document', tone: 'border-slate-200 bg-slate-100 text-slate-600' };
}

/** Coloured tag chips (reuses the shared document-tag palette), truncated past 3. */
function TagChips({ tags }: { tags?: string[] }) {
    if (!tags || tags.length === 0) return <span className="text-[13px] text-slate-300">—</span>;
    return (
        <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map(t => <span key={t} className={cn('inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold', tagColor(t))}>{t}</span>)}
            {tags.length > 3 && <span className="text-[10px] font-semibold text-slate-400">+{tags.length - 3}</span>}
        </div>
    );
}

let __afSeq = 0;
const newFileId = () => `af-${++__afSeq}-${(Math.random() * 1e6 | 0).toString(36)}`;

type DocGroupDef = { label: string; icon: LucideIcon; files?: AccidentFile[]; onChange?: (files: AccidentFile[]) => void; uploader?: string };
type DocRow = { group: string; icon: LucideIcon; file: AccidentFile; kind: { label: string; tone: string }; files: AccidentFile[]; onChange?: (files: AccidentFile[]) => void; uploader?: string; uploadedAt?: string };
type DocSortCol = 'group' | 'file' | 'type' | 'uploaded';
const DOC_PAGE_SIZES = [10, 25, 50];
const fmtSize = (b?: number) => (b == null ? '—' : b < 1024 ? `${b} B` : `${(b / 1024).toFixed(0)} KB`);

/** "Aug 14, 2026, 01:52 PM" (12-hour) — used by the Uploaded-by cell to match the compliance list. */
function fmt12h(dt?: string): string {
    if (!dt) return '—';
    const [d, t] = dt.split('T');
    const [y, m, day] = (d || '').split('-');
    if (!y) return dt;
    const datePart = `${MONTHS[Number(m) - 1] ?? m} ${Number(day)}, ${y}`;
    if (!t) return datePart;
    const [hr, mm] = t.split(':');
    let hh = Number(hr);
    const ap = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    return `${datePart}, ${String(hh).padStart(2, '0')}:${mm ?? '00'} ${ap}`;
}
const UP_COLORS = ['bg-rose-500', 'bg-pink-500', 'bg-fuchsia-500', 'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-sky-500', 'bg-teal-500', 'bg-emerald-500', 'bg-amber-500', 'bg-orange-500'];
function upInitials(name: string): string {
    const p = name.trim().split(/\s+/).filter(Boolean);
    return p.length ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() : '—';
}
function upColor(name: string): string {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return UP_COLORS[h % UP_COLORS.length];
}
/** Avatar + name + timestamp cell (image-3 "Uploaded by" style). */
function UploadedByCell({ name, at }: { name?: string; at?: string }) {
    if (!name) return <span className="text-[12px] text-slate-400">{at ? fmt12h(at) : '—'}</span>;
    return (
        <div className="flex items-center gap-2">
            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white', upColor(name))}>{upInitials(name)}</span>
            <div className="min-w-0 leading-tight">
                <div className="truncate text-[12px] font-semibold text-slate-700" title={name}>{name}</div>
                {at && <div className="whitespace-nowrap text-[11px] text-slate-400">{fmt12h(at)}</div>}
            </div>
        </div>
    );
}

export type RowAction = { label: string; icon: LucideIcon; onClick: () => void; danger?: boolean; hidden?: boolean };
/** Compact three-dot actions menu for a list row. Renders the menu at a fixed position
 *  (anchored to the trigger) so it never gets clipped by the table's horizontal scroll. */
export function RowActionsMenu({ items }: { items: RowAction[] }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const visible = items.filter(i => !i.hidden);
    const toggle = () => {
        if (open) { setOpen(false); return; }
        const r = btnRef.current?.getBoundingClientRect();
        if (r) setPos({ top: Math.min(r.bottom + 4, window.innerHeight - visible.length * 40 - 12), left: Math.max(8, r.right - 184) });
        setOpen(true);
    };
    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        window.addEventListener('pointerdown', close);
        return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); window.removeEventListener('pointerdown', close); };
    }, [open]);
    return (
        <>
            <button ref={btnRef} type="button" title="Actions" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); toggle(); }}
                className={cn('inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors', open ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700')}>
                <MoreVertical size={15} />
            </button>
            {open && pos && createPortal(
                <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: 184, zIndex: 80 }} onPointerDown={e => e.stopPropagation()}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    {visible.map((it, i) => (
                        <button key={i} type="button" onClick={() => { setOpen(false); it.onClick(); }}
                            className={cn('flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium hover:bg-slate-50', it.danger ? 'text-rose-600' : 'text-slate-700')}>
                            <it.icon size={14} className={it.danger ? 'text-rose-500' : 'text-slate-400'} /> {it.label}
                        </button>
                    ))}
                </div>,
                document.body,
            )}
        </>
    );
}

/** Shared list-view section — the same shell as the compliance "Documents & records":
 *  header + Show-history toggle, a search / type-filter toolbar, a sortable table
 *  (desktop) / cards (mobile) of every uploaded file, and a pagination footer. */
function DocListSection({ title, groups, onSeedSample, defaultAt, signable, driverName, onSendToAdjuster, record, accountId }: { title: string; groups: DocGroupDef[]; onSeedSample?: () => void; defaultAt?: string; signable?: boolean; driverName?: string; onSendToAdjuster?: (file: AccidentFile, group: string) => void; record?: AccidentRecord; accountId?: string }) {
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'Image' | 'Video' | 'PDF' | 'Document'>('all');
    const [sort, setSort] = useState<{ col: DocSortCol; dir: 'asc' | 'desc' } | null>(null);
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState<{ row: DocRow; mode: 'view' | 'edit' } | null>(null);
    const [editNote, setEditNote] = useState('');
    const [editTags, setEditTags] = useState<string[]>([]);
    // Real generated document preview + PDF download for the View modal.
    const docRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState(false);
    const downloadDoc = async () => {
        const el = docRef.current; if (!el) return;
        setDownloading(true);
        try {
            const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
            const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
            const pageW = pdf.internal.pageSize.getWidth(), pageH = pdf.internal.pageSize.getHeight();
            const imgH = (canvas.height * pageW) / canvas.width;
            let heightLeft = imgH, position = 0;
            const img = canvas.toDataURL('image/png');
            pdf.addImage(img, 'PNG', 0, position, pageW, imgH); heightLeft -= pageH;
            while (heightLeft > 0) { position -= pageH; pdf.addPage(); pdf.addImage(img, 'PNG', 0, position, pageW, imgH); heightLeft -= pageH; }
            pdf.save(modal?.row.file.fileName || 'document.pdf');
        } finally { setDownloading(false); }
    };
    // Signature request — open the real document builder (full page) with the generated PDF; on save
    // the driver-signed copy is saved alongside the original.
    const [sigRow, setSigRow] = useState<DocRow | null>(null);
    const [sigDoc, setSigDoc] = useState<DocFile | null>(null);
    const genRef = useRef<HTMLDivElement>(null);
    const isSigned = (f: AccidentFile) => (f.tags ?? []).includes('Signed by driver');
    const openSign = (row: DocRow) => { setSigDoc(null); setSigRow(row); };
    const closeSign = () => { setSigRow(null); setSigDoc(null); };
    // Render the generated document off-screen, then rasterize it to a real PDF for the builder.
    useEffect(() => {
        if (!sigRow || sigDoc) return;
        let cancelled = false;
        const build = async () => {
            await new Promise(res => setTimeout(res, 80));
            const el = genRef.current; if (!el || cancelled) return;
            const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
            const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
            const pageW = pdf.internal.pageSize.getWidth(), pageH = pdf.internal.pageSize.getHeight();
            const imgH = (canvas.height * pageW) / canvas.width;
            let heightLeft = imgH, position = 0;
            const img = canvas.toDataURL('image/png');
            pdf.addImage(img, 'PNG', 0, position, pageW, imgH); heightLeft -= pageH;
            while (heightLeft > 0) { position -= pageH; pdf.addPage(); pdf.addImage(img, 'PNG', 0, position, pageW, imgH); heightLeft -= pageH; }
            if (cancelled) return;
            setSigDoc({ id: `sig-${sigRow.file.id}`, fileName: sigRow.file.fileName, pdfDataUrl: pdf.output('datauristring'), pageCount: pdf.getNumberOfPages() });
        };
        build();
        return () => { cancelled = true; };
    }, [sigRow, sigDoc]);
    const finishSign = (row: DocRow, sigFields: number) => {
        const m = row.file.fileName.match(/^(.*?)(\.[^.]+)?$/);
        const base = m?.[1] || row.file.fileName;
        const ext = m?.[2] || '.pdf';
        const signer = driverName || 'Driver';
        const signed: AccidentFile = {
            id: newFileId(), fileName: `${base}-signed${ext}`, fileSize: (row.file.fileSize ?? 240) + 48,
            tags: [...(row.file.tags ?? []), 'Signed by driver'],
            uploadedBy: signer, uploadedAt: nowStampLocal(),
            note: `Signed by ${signer}${sigFields ? ` — ${sigFields} signature field${sigFields !== 1 ? 's' : ''}` : ''}.`,
        };
        row.onChange?.([...row.files, signed]);
    };

    const allRows: DocRow[] = groups.flatMap(g => (g.files ?? []).map(f => ({
        group: g.label, icon: g.icon, file: f, kind: fileKind(f.fileName), files: g.files ?? [], onChange: g.onChange,
        uploader: f.uploadedBy ?? g.uploader, uploadedAt: f.uploadedAt ?? defaultAt,
    })));

    const openView = (row: DocRow) => setModal({ row, mode: 'view' });
    const openEdit = (row: DocRow) => { setEditNote(row.file.note ?? ''); setEditTags(row.file.tags ?? []); setModal({ row, mode: 'edit' }); };
    const saveEdit = () => { if (!modal) return; modal.row.onChange?.(modal.row.files.map(f => (f.id === modal.row.file.id ? { ...f, note: editNote, tags: editTags } : f))); setModal(null); };
    const removeRow = (row: DocRow) => row.onChange?.(row.files.filter(f => f.id !== row.file.id));

    const q = search.trim().toLowerCase();
    let rows = allRows.filter(r => {
        if (typeFilter !== 'all' && r.kind.label !== typeFilter) return false;
        if (q && !`${r.group} ${r.file.fileName} ${r.file.note ?? ''} ${(r.file.tags ?? []).join(' ')} ${r.uploader ?? ''}`.toLowerCase().includes(q)) return false;
        return true;
    });
    if (sort) {
        const val = (r: typeof allRows[number]) => sort.col === 'group' ? r.group : sort.col === 'file' ? r.file.fileName
            : sort.col === 'type' ? r.kind.label : sort.col === 'uploaded' ? `${r.uploader ?? ''} ${r.uploadedAt ?? ''}` : '';
        rows = [...rows].sort((a, b) => val(a).localeCompare(val(b), undefined, { numeric: true, sensitivity: 'base' }) * (sort.dir === 'desc' ? -1 : 1));
    }
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, pages);
    const startIdx = (safePage - 1) * pageSize;
    const pageRows = rows.slice(startIdx, startIdx + pageSize);

    useEffect(() => { setPage(1); }, [search, typeFilter, pageSize]);
    const toggleSort = (col: DocSortCol) => setSort(s => (s?.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));
    const Th = ({ col, label, className }: { col?: DocSortCol; label: string; className?: string }) => (
        <th className={cn('px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500', className)}>
            {col ? (
                <button type="button" onClick={() => toggleSort(col)} className="inline-flex items-center gap-1 hover:text-slate-700">
                    {label}<ChevronsUpDown size={11} className={sort?.col === col ? 'text-blue-500' : 'text-slate-300'} />
                </button>
            ) : label}
        </th>
    );

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Header — title + Sample data */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
                <h3 className="text-[13px] font-bold text-slate-700">{title}</h3>
                {onSeedSample && (
                    <button type="button" onClick={onSeedSample} title="Populate this section with sample files"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-[12px] font-semibold text-violet-700 hover:bg-violet-100">
                        <Sparkles size={14} /> Sample data
                    </button>
                )}
            </div>

            {allRows.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center px-5 py-14 text-center">
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FileText size={20} /></div>
                    <p className="text-sm font-semibold text-slate-700">No documents captured yet</p>
                    <p className="mt-1 text-[13px] text-slate-500">Files uploaded on this accident appear here.</p>
                    {onSeedSample && (
                        <button type="button" onClick={onSeedSample} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100">
                            <Sparkles size={15} /> Load sample data
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Toolbar — search + type filter */}
                    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
                        <div className="relative min-w-[200px] max-w-sm flex-1">
                            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents, files…"
                                className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
                            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 focus:outline-none">
                            <option value="all">All types</option>
                            <option value="Image">Image</option>
                            <option value="Video">Video</option>
                            <option value="PDF">PDF</option>
                            <option value="Document">Document</option>
                        </select>
                    </div>

                    {pageRows.length === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center px-5 py-12 text-center text-sm text-slate-500">No documents match your search / filters.</div>
                    ) : (
                        <>
                            {/* Scrollable rows region — fills the panel so the card height is uniform across tabs */}
                            <div className="min-h-0 flex-1 overflow-y-auto">
                            {/* Desktop table — horizontally scrollable; sticky Action column */}
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full min-w-max">
                                    <thead className="border-b border-slate-200 bg-slate-50/50">
                                        <tr>
                                            <Th col="group" label="Document" className="min-w-[160px] pl-5" />
                                            <Th col="file" label="File" className="min-w-[210px]" />
                                            <Th col="type" label="Type" className="min-w-[90px]" />
                                            <th className="min-w-[170px] px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Tags</th>
                                            <Th col="uploaded" label="Uploaded by" className="min-w-[180px]" />
                                            <th className="sticky right-0 z-[2] min-w-[96px] border-l border-slate-100 bg-slate-50/50 px-4 py-2.5 pr-5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageRows.map((r, i) => (
                                            <tr key={r.file.id + i} className="group border-b border-slate-100 align-middle last:border-0 hover:bg-slate-50/50">
                                                <td className="px-4 py-3 pl-5"><span className="flex items-center gap-2 text-[13px] font-medium text-slate-700"><r.icon size={14} className="shrink-0 text-slate-400" /><span className="truncate" title={r.group}>{r.group}</span></span></td>
                                                <td className="px-4 py-3"><span className="flex items-center gap-2 text-[13px] text-slate-700"><FileText size={13} className="shrink-0 text-emerald-600" /><span className="max-w-[240px] truncate" title={r.file.fileName}>{r.file.fileName}</span></span></td>
                                                <td className="px-4 py-3"><span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', r.kind.tone)}>{r.kind.label}</span></td>
                                                <td className="px-4 py-3"><TagChips tags={r.file.tags} /></td>
                                                <td className="px-4 py-3"><UploadedByCell name={r.uploader} at={r.uploadedAt} /></td>
                                                <td className="sticky right-0 z-[1] border-l border-slate-100 bg-white px-4 py-3 pr-5 group-hover:bg-slate-50">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button type="button" title="View" onClick={() => openView(r)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"><Eye size={14} /></button>
                                                        <RowActionsMenu items={[
                                                            { label: 'Request driver signature', icon: Signature, onClick: () => openSign(r), hidden: !(signable && r.onChange && !isSigned(r.file)) },
                                                            { label: 'Send to adjuster', icon: Send, onClick: () => onSendToAdjuster?.(r.file, r.group), hidden: !onSendToAdjuster },
                                                            { label: 'Edit details', icon: Pencil, onClick: () => openEdit(r), hidden: !r.onChange },
                                                            { label: 'Delete', icon: Trash2, onClick: () => removeRow(r), danger: true, hidden: !r.onChange },
                                                        ]} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile cards */}
                            <ul className="divide-y divide-slate-100 md:hidden">
                                {pageRows.map((r, i) => (
                                    <li key={r.file.id + i} className="space-y-2 px-4 py-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><r.icon size={12} className="shrink-0 text-slate-400" />{r.group}</p>
                                                <p className="truncate text-[13px] text-slate-700" title={r.file.fileName}>{r.file.fileName}</p>
                                                <p className="mt-0.5 text-[11px] text-slate-400">{fmtSize(r.file.fileSize)}</p>
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                                                <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', r.kind.tone)}>{r.kind.label}</span>
                                                <div className="flex shrink-0 items-center gap-1.5">
                                                    <button type="button" title="View" onClick={() => openView(r)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"><Eye size={13} /></button>
                                                    <RowActionsMenu items={[
                                                        { label: 'Request driver signature', icon: Signature, onClick: () => openSign(r), hidden: !(signable && r.onChange && !isSigned(r.file)) },
                                                        { label: 'Send to adjuster', icon: Send, onClick: () => onSendToAdjuster?.(r.file, r.group), hidden: !onSendToAdjuster },
                                                        { label: 'Edit details', icon: Pencil, onClick: () => openEdit(r), hidden: !r.onChange },
                                                        { label: 'Delete', icon: Trash2, onClick: () => removeRow(r), danger: true, hidden: !r.onChange },
                                                    ]} />
                                                </div>
                                            </div>
                                        </div>
                                        {(r.file.tags?.length || r.file.note) && (
                                            <div className="space-y-1">
                                                <TagChips tags={r.file.tags} />
                                                {r.file.note && <p className="text-[12px] text-slate-600">{r.file.note}</p>}
                                            </div>
                                        )}
                                        <div className="border-t border-slate-100 pt-2"><UploadedByCell name={r.uploader} at={r.uploadedAt} /></div>
                                    </li>
                                ))}
                            </ul>
                            </div>

                            {/* Pagination footer */}
                            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
                                <label className="flex items-center gap-1.5 text-[12px] text-slate-500">Rows per page
                                    <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none">
                                        {DOC_PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </label>
                                <div className="flex items-center gap-1">
                                    <span className="mr-2 text-[12px] text-slate-500 tabular-nums">{startIdx + 1}–{Math.min(startIdx + pageSize, total)} of {total}</span>
                                    <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="inline-flex h-8 items-center rounded-md border border-slate-200 px-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Prev</button>
                                    <span className="px-2 text-[12px] text-slate-600 tabular-nums">Page {safePage} of {pages}</span>
                                    <button type="button" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)} className="inline-flex h-8 items-center rounded-md border border-slate-200 px-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {modal && (() => {
                const showDoc = modal.mode === 'view' && !!record && modal.row.kind.label !== 'Image' && modal.row.kind.label !== 'Video';
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setModal(null)}>
                        <div className={cn('flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl', showDoc ? 'max-w-3xl' : 'max-w-lg')} onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800"><modal.row.icon size={15} className="text-blue-600" /> {modal.mode === 'edit' ? 'Edit document' : modal.row.group}</h4>
                                <button type="button" onClick={() => setModal(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={16} /></button>
                            </div>
                            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                                {showDoc ? (
                                    <>
                                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-3">
                                            <div ref={docRef} className="mx-auto max-w-[720px] bg-white shadow-sm"><AccidentDocDocument record={record!} group={modal.row.group} fileName={modal.row.file.fileName} /></div>
                                        </div>
                                        {(modal.row.file.tags?.length || modal.row.file.note) && (
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tags</p><div className="mt-1"><TagChips tags={modal.row.file.tags} /></div></div>
                                                {modal.row.file.note && <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Note</p><p className="mt-1 text-[13px] text-slate-700">{modal.row.file.note}</p></div>}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                                            <span className={cn('flex h-12 w-12 items-center justify-center rounded-xl border', modal.row.kind.tone)}>
                                                {modal.row.kind.label === 'Image' ? <Camera size={22} /> : modal.row.kind.label === 'Video' ? <Video size={22} /> : <FileText size={22} />}
                                            </span>
                                            <p className="text-sm font-semibold text-slate-700">{modal.row.file.fileName}</p>
                                            <p className="text-[12px] text-slate-400">{modal.row.kind.label} · {fmtSize(modal.row.file.fileSize)}</p>
                                            <p className="text-[11px] text-slate-400">Preview isn’t available for this file type in the prototype.</p>
                                        </div>
                                        {modal.mode === 'view' ? (
                                            <>
                                                <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tags</p><div className="mt-1"><TagChips tags={modal.row.file.tags} /></div></div>
                                                <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Note</p><p className="mt-1 text-[13px] text-slate-700">{modal.row.file.note || <span className="text-slate-300">—</span>}</p></div>
                                            </>
                                        ) : (
                                            <>
                                                <div><label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Note</label><input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Add a note…" /></div>
                                                <TagField value={editTags} onChange={setEditTags} label="Tags" />
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
                                {showDoc ? (
                                    <button type="button" onClick={downloadDoc} disabled={downloading} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><Download size={14} /> {downloading ? 'Generating…' : 'Download PDF'}</button>
                                ) : (
                                    <button type="button" disabled title="Preview not available for this file type" className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-400"><Download size={14} /> Download</button>
                                )}
                                <div className="flex items-center gap-2">
                                    {modal.mode === 'view' ? (
                                        <>
                                            <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Close</button>
                                            {modal.row.onChange && <button type="button" onClick={() => openEdit(modal.row)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"><Pencil size={14} /> Edit</button>}
                                        </>
                                    ) : (
                                        <>
                                            <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                                            <button type="button" onClick={saveEdit} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Save</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Off-screen render of the real document, rasterized to a PDF for the builder. */}
            {sigRow && record && !sigDoc && (
                <>
                    <div ref={genRef} style={{ position: 'fixed', left: -100000, top: 0, width: 760, background: '#ffffff' }}>
                        <AccidentDocDocument record={record} group={sigRow.group} fileName={sigRow.file.fileName} />
                    </div>
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/80">
                        <div className="flex flex-col items-center gap-3 text-slate-600">
                            <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-violet-600" />
                            <p className="text-sm font-semibold">Preparing document for signature…</p>
                        </div>
                    </div>
                </>
            )}

            {/* Full-page signature builder (the onboarding-documents module), pre-loaded with the document. */}
            {sigRow && sigDoc && (
                <div className="fixed inset-0 z-[60] overflow-y-auto bg-white">
                    <DocumentTemplateBuilder
                        templateId="new"
                        initialDocuments={[sigDoc]}
                        initialName={`Signature — ${sigRow.file.fileName}`}
                        saveLabel="Send for signature"
                        carrierId={accountId}
                        onBack={closeSign}
                        onSave={tpl => { finishSign(sigRow, tpl.fields.filter(f => f.type === 'signature' || f.type === 'initials').length); }}
                    />
                </div>
            )}
        </div>
    );
}

type TabId = 'overview' | 'documents' | 'evidence' | 'case' | 'activity';

export function AccidentDetailPage({ record, onBack, onEdit, onUpdate, onDelete, accountId }: {
    record: AccidentRecord;
    onBack: () => void;
    onEdit: () => void;
    onUpdate?: (r: AccidentRecord) => void;
    onDelete?: (id: string) => void;
    accountId?: string;
}) {
    const [tab, setTab] = useState<TabId>('overview');
    const [showReport, setShowReport] = useState(false);
    const st = ACCIDENT_STATUS_META[record.status];
    const src = SOURCE_META[record.source];
    const title = typesOf(record) || 'Accident report';

    // Derive activity if none was stored (older records) from the reported/verified stamps.
    const activity = useMemo<AccidentActivity[]>(() => {
        if (record.activity && record.activity.length) return [...record.activity].sort((a, b) => a.at.localeCompare(b.at));
        const list: AccidentActivity[] = [{
            id: 'derived-report', at: record.dateTime || record.reportedAt, by: record.reportedBy,
            role: record.source === 'driver-app' ? 'driver' : 'office',
            action: record.source === 'driver-app' ? 'Reported' : 'Created',
            detail: record.source === 'driver-app' ? 'Submitted from the mobile app.' : 'Entered from the office.',
        }];
        if (record.verifiedBy && record.verifiedAt) list.push({ id: 'derived-verify', at: record.verifiedAt, by: record.verifiedBy, role: 'manager', action: 'Verified' });
        return list;
    }, [record]);

    const docCount = (record.driverStatementFiles?.length ?? 0) + (record.policeReportFiles?.length ?? 0)
        + (record.citationFiles?.length ?? 0) + (record.repairFiles?.length ?? 0) + (record.towingInvoiceFiles?.length ?? 0)
        + (record.elogFiles?.length ?? 0) + (record.ledgerFiles?.length ?? 0) + (record.claimDocsFiles?.length ?? 0) + (record.additionalDocsFiles?.length ?? 0)
        + (record.witnesses ?? []).reduce((n, w) => n + (w.statementFiles?.length ?? 0), 0)
        + (record.otherVehicles ?? []).reduce((n, v) => n + (v.coiFiles?.length ?? 0), 0);
    const evidenceCount = (record.photoFiles?.length ?? 0) + (record.videoFiles?.length ?? 0)
        + (record.vehicleDamageFiles?.length ?? 0) + (record.dashcamFiles?.length ?? 0);

    const TABS: { id: TabId; label: string; count?: number }[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'documents', label: 'Documents', count: docCount },
        { id: 'evidence', label: 'Evidence', count: evidenceCount },
        { id: 'case', label: 'Case', count: record.case?.messages.length || undefined },
        { id: 'activity', label: 'Activity', count: activity.length },
    ];

    // Compact key facts for the fixed header strip — driver / unit / date / type already show in the
    // title line above, and everything is in the Overview tab, so keep this short to give the tab
    // panels below their vertical room.
    const summaryRows: { label: string; value: ReactNode }[] = [
        { label: 'Location', value: record.location || '—' },
        { label: 'Severity', value: record.severity ? <span className={cn('inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold', RISK_TYPE_TONE[record.severity as AccidentRiskType])}>{record.severity}</span> : '—' },
        { label: 'Preventability', value: record.preventable || '—' },
        { label: 'Claim #', value: record.claimNumber || '—' },
        { label: 'Reported', value: `${record.reportedBy} · ${record.reportedAt}` },
        { label: 'Verified', value: record.verifiedBy ? `${record.verifiedBy} · ${record.verifiedAt}` : '—' },
    ];

    // Full-screen themed report view (theme tabs + Print + Download PDF), covering the accident
    // up to the Claim section — includes photos + attached-document metadata + tags.
    if (showReport) {
        return <AccidentReportViewer record={record} onBack={() => setShowReport(false)} accountId={accountId} />;
    }

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-50">
            {/* Fixed top section — back link, summary card, tabs (stays while the tab body scrolls). */}
            <div className="shrink-0 border-b border-slate-200/70 bg-slate-50 px-4 pt-4 sm:px-8 sm:pt-6">
                <div className="mx-auto max-w-[1600px] space-y-4">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
                    <ChevronLeft size={16} /> Back to list
                </button>

                {/* ── Summary header card ── */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><AlertTriangle size={20} /></span>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-bold text-slate-900">{title}</h1>
                                    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', st.tone)}><span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}</span>
                                    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold', src.tone)}>{src.label}</span>
                                    {record.injuries && <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">Injury</span>}
                                </div>
                                <p className="mt-1 text-sm text-slate-500">{record.driverName || '—'} · {record.unitId || '—'} · {fmtDateTime(record.dateTime)}</p>
                            </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-1">
                            {record.status !== 'verified' && (
                                <Button size="sm" onClick={onEdit} className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-700">
                                    <ShieldCheck className="h-4 w-4" /> Review &amp; verify
                                </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => setShowReport(true)}>
                                <FileText className="h-4 w-4" /> Report / PDF
                            </Button>
                            <Button variant="outline" size="sm" onClick={onEdit}>
                                <Pencil className="h-4 w-4" /> Edit
                            </Button>
                            {onDelete && (
                                <Button variant="outline" size="sm" onClick={() => { onDelete(record.id); onBack(); }} className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                                    <Trash2 className="h-4 w-4" /> Delete
                                </Button>
                            )}
                        </div>
                    </div>
                    {/* Key facts — compact wrapping strip (keeps the fixed header short so the tab panels fill height) */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-t border-slate-100 px-5 py-2.5">
                        {summaryRows.map((r, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5 text-[12px]">
                                <span className="text-slate-400">{r.label}</span>
                                <span className="font-semibold text-slate-800">{r.value}</span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* ── Alert banner (notification raised against this accident) — dismissable ── */}
                {record.alert && (
                    <div className={cn('flex items-start gap-2.5 rounded-xl border px-4 py-3', ALERT_META[record.alert.level].tone)}>
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-bold">{record.alert.label || ALERT_META[record.alert.level].label} alert</p>
                            <p className="text-[13px] leading-snug opacity-90">{record.alert.message}</p>
                        </div>
                        {record.alert.at && <span className="mt-0.5 shrink-0 text-[11px] font-medium opacity-70">{fmtDateTime(record.alert.at)}</span>}
                        {onUpdate && (
                            <button type="button" onClick={() => onUpdate({ ...record, alert: undefined })} title="Dismiss / turn off this alert"
                                className="-mr-1 -mt-0.5 shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:bg-black/5 hover:opacity-100"><X size={15} /></button>
                        )}
                    </div>
                )}

                {/* ── Tabs ── */}
                <div className="-mb-px flex items-center gap-1 overflow-x-auto">
                    {TABS.map(t => {
                        const on = tab === t.id;
                        return (
                            <button key={t.id} type="button" onClick={() => setTab(t.id)}
                                className={cn('inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                                    on ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800')}>
                                {t.label}
                                {t.count !== undefined && <span className={cn('inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums', on ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/70 text-slate-600')}>{t.count}</span>}
                            </button>
                        );
                    })}
                </div>
                </div>
            </div>

            {/* Scrollable tab body — the top section above stays put. Flex column so each tab's
                panel can fill a uniform height (Documents / Evidence / Case / Activity all match). */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pt-5 pb-6 sm:px-8">
                <div className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col">
                    {tab === 'overview' && <OverviewTab record={record} />}
                    {tab === 'documents' && <DocumentsTab record={record} onUpdate={onUpdate} accountId={accountId} />}
                    {tab === 'evidence' && <EvidenceTab record={record} onUpdate={onUpdate} />}
                    {tab === 'case' && <CaseTab record={record} onUpdate={onUpdate} onEdit={onEdit} />}
                    {tab === 'activity' && <ActivityTab activity={activity} />}
                </div>
            </div>
        </div>
    );
}

// ── Overview ─────────────────────────────────────────────────────
function OverviewTab({ record: r }: { record: AccidentRecord }) {
    return (
        <div className="columns-1 gap-5 xl:columns-2 [&>*]:mb-5 [&>*]:break-inside-avoid">
            <InfoCard title="Owner information" icon={Building2}>
                <Grid>
                    <Field label="Name" value={r.ownerName} />
                    <Field label="Phone" value={r.ownerPhone} />
                    <Field label="Policy number" value={r.policyNumber} />
                    <Field label="Address" value={composed(r.ownerStreet, r.ownerCity, composed(r.ownerState, r.ownerZip), r.ownerCountry)} wide />
                    <Field label="NSC / CVOR number" value={r.nscCvor} />
                    <Field label="DOT number" value={r.dotNumber} />
                </Grid>
            </InfoCard>

            <InfoCard title="Driver information" icon={User}>
                <Grid>
                    <Field label="Name" value={r.driverName} />
                    <Field label="Phone" value={r.driverPhone} />
                    <Field label="Licence number" value={r.licenceNumber} />
                    <Field label="Address" value={composed(r.driverStreet, r.driverCity, composed(r.driverState, r.driverZip), r.driverCountry)} wide />
                    <Field label="Licence expiry" value={r.licenceExpiry} />
                    <Field label="Province of issue" value={r.licenceProvince} />
                </Grid>
            </InfoCard>

            <InfoCard title="Vehicle & trailer involved" icon={Truck}>
                <Grid>
                    <Field label="Vehicle unit" value={r.unitId} />
                    <Field label="Vehicle VIN" value={r.vehicleVin} />
                    <Field label="Vehicle plate" value={composed(r.vehiclePlate, r.vehicleJurisdiction)} />
                    <Field label="Trailer unit" value={r.trailerUnit} />
                    <Field label="Trailer VIN" value={r.trailerVin} />
                    <Field label="Trailer plate" value={composed(r.trailerPlate, r.trailerJurisdiction)} />
                </Grid>
            </InfoCard>

            <InfoCard title="Accident & collision" icon={FileText}>
                <div className="space-y-4">
                    <Field label="What happened" value={r.description} wide />
                    <Grid>
                        <Field label="Direction of travel" value={r.directionOfTravel} />
                        <Field label="Speed prior" value={r.travelSpeed ? `${r.travelSpeed} ${r.travelSpeedUnit ?? 'km/h'}` : ''} />
                        <Field label="Headlights on" value={r.travelSpeed || r.directionOfTravel ? yesNo(r.headlightsOn) : ''} />
                        <Field label="Lane (1 = shoulder)" value={r.laneNumber} />
                        <Field label="Lanes wide" value={r.lanesWide} />
                        <Field label="Landmarks" value={r.landmarks} />
                        <Field label="Warning signals" value={r.warningSignals ? `Yes — ${r.warningSignalDesc || 'given'}` : ''} wide />
                    </Grid>
                </div>
            </InfoCard>

            <InfoCard title="Collision severity" icon={AlertTriangle}>
                <Grid>
                    <Field label="Fatalities" value={r.numFatalities} />
                    <Field label="Injuries" value={r.numInjuries} />
                    <Field label="Vehicles in collision" value={r.vehiclesInCollision} />
                    <Field label="Vehicles towed" value={r.numVehiclesTowed} />
                    {Number(r.numInjuries) > 0 && <Field label="Injury details" value={r.injuryNotes} wide />}
                </Grid>
            </InfoCard>

            {Number(r.numVehiclesTowed) > 0 && (
                <InfoCard title="Towing" icon={Truck}>
                    <Grid>
                        <Field label="Towing company" value={r.towingCompany} />
                        <Field label="Towing bill" value={r.towingBill ? `${r.towingBill} ${r.towingBillCurrency ?? 'USD'}` : ''} />
                        <Field label="Contact" value={r.towingContact} />
                        <Field label="Phone" value={r.towingPhone} />
                        <Field label="Email" value={r.towingEmail} />
                        <Field label="Address" value={r.towingAddress} wide />
                    </Grid>
                </InfoCard>
            )}

            <InfoCard title="Commodity / cargo" icon={Boxes}>
                <Grid>
                    <Field label="Commodity damaged" value={yesNo(r.commodityDamaged)} />
                    <Field label="Description" value={r.commodityDescription} />
                    <Field label="Quantity" value={r.commodityQty} />
                    <Field label="Estimated value" value={r.commodityValue ? `${r.commodityValue} ${r.commodityValueCurrency ?? 'USD'}` : ''} />
                    <Field label="Loss" value={r.commodityLoss} />
                    <Field label="HAZMAT" value={yesNo(r.hazmatSpill)} />
                </Grid>
            </InfoCard>

            {r.hazmatSpill && (
                <InfoCard title="HAZMAT details" icon={AlertTriangle}>
                    <Grid>
                        <Field label="HazMat class" value={r.hazmatClass} />
                        <Field label="UN / NA number" value={r.unNaNumber} />
                        <Field label="Quantity released" value={r.quantityReleased} />
                        <Field label="Estimated value" value={r.hazmatValue ? `${r.hazmatValue} ${r.hazmatValueCurrency ?? 'USD'}` : ''} />
                        <Field label="Placarded" value={yesNo(r.placarded)} />
                    </Grid>
                </InfoCard>
            )}

            {has(r.repairVendor, r.repairStatus, r.estimatedRepair, r.totalRepairAmount) && (
                <InfoCard title="Repair" icon={Wrench}>
                    <Grid>
                        <Field label="Repair vendor" value={r.repairVendor} />
                        <Field label="Repair status" value={r.repairStatus} />
                        <Field label="Estimated repair" value={r.estimatedRepair ? `${r.estimatedRepair} ${r.repairCurrency ?? 'USD'}` : ''} />
                        <Field label="Total repair amount" value={r.totalRepairAmount ? `${r.totalRepairAmount} ${r.repairCurrency ?? 'USD'}` : ''} />
                    </Grid>
                </InfoCard>
            )}

            {has(r.odometerAfter, r.hrsDrivingAtCrash, r.hrsOnDutyAtCrash, r.lastDutyStatus, r.lastDvirStatus) && (
                <InfoCard title="At the time of the crash" icon={Gauge}>
                    <Grid>
                        <Field label="Odometer after crash" value={r.odometerAfter} />
                        <Field label="Hours driving at crash" value={r.hrsDrivingAtCrash} />
                        <Field label="Hours on duty at crash" value={r.hrsOnDutyAtCrash} />
                        <Field label="Last duty status" value={r.lastDutyStatus} />
                        <Field label="Last DVIR status" value={r.lastDvirStatus} />
                    </Grid>
                </InfoCard>
            )}

            {has(r.roadType, r.postedSpeed, r.vehicleSpeed, r.roadCondsList, r.trafficControlsList, r.trafficCondsList, r.weatherList, r.visibilityList) && (
                <InfoCard title="Road & environment" icon={Cloud}>
                    <div className="space-y-4">
                        <Grid>
                            <Field label="Road type" value={r.roadType} />
                            <Field label="Posted speed" value={r.postedSpeed} />
                            <Field label="Vehicle speed" value={r.vehicleSpeed} />
                        </Grid>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div><dt className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Road conditions</dt><ChipList items={r.roadCondsList} /></div>
                            <div><dt className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Traffic controls</dt><ChipList items={r.trafficControlsList} /></div>
                            <div><dt className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Traffic conditions</dt><ChipList items={r.trafficCondsList} /></div>
                            <div><dt className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Weather</dt><ChipList items={r.weatherList} /></div>
                            <div><dt className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Visibility</dt><ChipList items={r.visibilityList} /></div>
                        </div>
                    </div>
                </InfoCard>
            )}

            <InfoCard title="Location" icon={MapPin}>
                <Grid>
                    <Field label="Description" value={r.location} wide />
                    <Field label="Street address" value={r.accStreet} />
                    <Field label="City" value={r.accCity} />
                    <Field label="State / province" value={r.accState} />
                    <Field label="Country" value={r.accCountry} />
                    <Field label="Zip / pin" value={r.accZip} />
                    <Field label="Location type" value={r.locationType} />
                </Grid>
            </InfoCard>

            {(r.otherVehicles?.length ?? 0) > 0 && (
                <InfoCard title="Other vehicles" icon={Car} right={<span className="text-[11px] font-semibold text-slate-400">{r.otherVehicles!.length}</span>}>
                    <div className="space-y-4">
                        {r.otherVehicles!.map((v, i) => (
                            <div key={v.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                                <p className="mb-3 text-sm font-bold text-slate-700">Vehicle {i + 1}</p>
                                <Grid>
                                    <Field label="Year / make / model" value={composed(v.year, v.make, v.model)} />
                                    <Field label="Colour" value={v.colour} />
                                    <Field label="Plate" value={composed(v.plate, v.plateJurisdiction)} />
                                    <Field label="VIN" value={v.vehicleVin} />
                                    <Field label="Driver" value={v.driverName} />
                                    <Field label="Driver phone" value={v.driverPhone} />
                                    <Field label="Licence" value={composed(v.licenceNumber, v.licenceProvince)} />
                                    <Field label="Owner / employer" value={v.ownerName} />
                                    <Field label="Persons in vehicle" value={v.personsInVehicle} />
                                    <Field label="Injured" value={v.injured ? composed('Yes', v.injuredDriver ? 'driver' : undefined, v.injuredPassenger ? 'passenger' : undefined) : 'No'} />
                                    <Field label="Insurance" value={composed(v.insuranceCompany, v.policyNumber)} />
                                    <Field label="Action / movement" value={<ChipList items={[...(v.actions ?? []), v.actionsOther].filter(Boolean) as string[]} />} wide />
                                </Grid>
                            </div>
                        ))}
                    </div>
                </InfoCard>
            )}

            {(r.witnesses?.length ?? 0) > 0 && (
                <InfoCard title="Witnesses" icon={Users} right={<span className="text-[11px] font-semibold text-slate-400">{r.witnesses!.length}</span>}>
                    <div className="space-y-4">
                        {r.witnesses!.map((w, i) => (
                            <div key={w.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                                <p className="mb-3 text-sm font-bold text-slate-700">Witness {i + 1}</p>
                                <Grid>
                                    <Field label="Name" value={w.name} />
                                    <Field label="Phone" value={w.phone} />
                                    <Field label="Prov. / state" value={w.province} />
                                    <Field label="Address" value={w.address} wide />
                                    <Field label="Saw the accident" value={yesNo(w.sawAccident)} />
                                    <Field label="Where they were" value={w.whereWhen} wide />
                                    <Field label="Probable cause" value={w.cause} wide />
                                </Grid>
                            </div>
                        ))}
                    </div>
                </InfoCard>
            )}

            {r.policePresent && (
                <InfoCard title="Police report" icon={Shield}>
                    <Grid>
                        <Field label="Report number" value={r.policeReport} />
                        <Field label="Agency" value={r.policeAgency} />
                        <Field label="Agency phone" value={r.policeAgencyPhone} />
                        <Field label="Officer 1" value={composed(r.officer1Name, r.officer1Badge && `#${r.officer1Badge}`)} />
                        <Field label="Officer 2" value={composed(r.officer2Name, r.officer2Badge && `#${r.officer2Badge}`)} />
                        <Field label="Citation issued" value={yesNo(r.citationIssued)} />
                        {r.citationIssued && <Field label="Citation / ticket number" value={r.citationNumber} />}
                        <Field label="Anyone arrested" value={r.arrested ? composed('Yes', r.arrestedName) : 'No'} />
                        <Field label="Note" value={r.policeNote} wide />
                    </Grid>
                </InfoCard>
            )}

            {has(r.claimNumber, r.claimStatus, r.insuranceCarrier, r.insurancePolicyNumber, r.adjusterName, r.adjusterPhone, r.adjusterEmail, r.tpaAdmin, r.amountPaid, r.cashReserve, r.totalIncurred, r.adjusterNote) && (
                <InfoCard title="Claim" icon={FileText}>
                    <Grid>
                        <Field label="Claim #" value={r.claimNumber} />
                        <Field label="Claim status" value={r.claimStatus} />
                        <Field label="Insurance carrier" value={r.insuranceCarrier} />
                        <Field label="Policy #" value={r.insurancePolicyNumber} />
                        <Field label="Adjuster name" value={r.adjusterName} />
                        <Field label="Adjuster phone" value={r.adjusterPhone} />
                        <Field label="Adjuster email" value={r.adjusterEmail} />
                        <Field label="TPA / third-party admin" value={r.tpaAdmin} />
                        <Field label="Total loss" value={yesNo(r.totalLoss)} />
                        <Field label="Subrogation" value={yesNo(r.subrogation)} />
                        <Field label="Amount paid" value={r.amountPaid ? `${r.amountPaid} ${r.claimCurrency ?? 'USD'}` : ''} />
                        <Field label="Cash reserve" value={r.cashReserve ? `${r.cashReserve} ${r.claimCurrency ?? 'USD'}` : ''} />
                        <Field label="Total incurred" value={r.totalIncurred ? `${r.totalIncurred} ${r.claimCurrency ?? 'USD'}` : ''} />
                        <Field label="Adjuster note" value={r.adjusterNote} wide />
                    </Grid>
                </InfoCard>
            )}

            <InfoCard title="Internal Review" icon={ShieldCheck}>
                <Grid>
                    <Field label="Accident type(s)" value={typesOf(r) || undefined} wide />
                    <Field label="Severity" value={r.severity} />
                    <Field label="Risk points" value={r.points === '' || r.points === undefined ? '' : String(r.points)} />
                    <Field label="Preventability" value={r.preventable} />
                    <Field label="Third party" value={r.thirdParty} />
                    <Field label="Internal notes" value={r.internalNotes || r.managerNotes} wide />
                    <Field label="Verified by" value={r.verifiedBy ? `${r.verifiedBy} · ${r.verifiedAt}` : ''} />
                </Grid>
            </InfoCard>
        </div>
    );
}

const sampleFile = (name: string, tags: string[], note?: string): AccidentFile => ({ id: newFileId(), fileName: name, fileSize: 320 + name.length * 11, tags, note });

/** Forward a document / evidence file to the adjuster — posts it into the Case thread and logs an
 *  Activity entry (one atomic update). Shared by the Documents and Evidence tabs. */
function makeSendToAdjuster(r: AccidentRecord, onUpdate?: (rec: AccidentRecord) => void) {
    if (!onUpdate) return undefined;
    return (file: AccidentFile, group: string) => {
        const me = r.verifiedBy || r.reportedBy || 'Office';
        const at = nowStampLocal();
        const adjusterName = r.case?.adjusterName || r.adjusterName || '';
        const adjusterEmail = r.case?.adjusterEmail || r.adjusterEmail || '';
        const signed = (file.tags ?? []).includes('Signed by driver');
        const msg: CaseMessage = { id: newFileId(), kind: 'send', from: 'carrier', by: me, at, subject: `${signed ? 'Signed document' : 'Document'} — ${file.fileName}`, body: `Sharing ${signed ? 'the signed ' : ''}“${group}” with you.`, attachments: [{ name: file.fileName, group }] };
        const cur = r.case ?? { status: 'not_started' as const, adjusterName, adjusterEmail, messages: [] };
        const nextCase: AccidentCase = { ...cur, adjusterName: cur.adjusterName || adjusterName, adjusterEmail: cur.adjusterEmail || adjusterEmail, status: 'sent', messages: [...cur.messages, msg] };
        const activity: AccidentActivity[] = [...(r.activity ?? []), { id: `send-${msg.id}`, at, by: me, role: 'office', action: `Sent ${signed ? 'signed document' : 'document'} to adjuster`, detail: `${group} — ${file.fileName}` }];
        onUpdate({ ...r, case: nextCase, activity });
    };
}

// ── Documents ────────────────────────────────────────────────────
function DocumentsTab({ record: r, onUpdate, accountId }: { record: AccidentRecord; onUpdate?: (rec: AccidentRecord) => void; accountId?: string }) {
    const office = r.reportedBy || 'Dispatch (office)';
    const driver = r.driverName || r.reportedBy || 'Driver';
    const claims = r.claimedBy || r.adjusterName || 'Claims dept';
    const groups: DocGroupDef[] = [
        { label: 'Driver statement', icon: FileText, uploader: driver, files: r.driverStatementFiles, onChange: onUpdate ? files => onUpdate({ ...r, driverStatementFiles: files }) : undefined },
        { label: 'Police report', icon: Shield, uploader: office, files: r.policeReportFiles, onChange: onUpdate ? files => onUpdate({ ...r, policeReportFiles: files }) : undefined },
        { label: 'Citation / ticket', icon: FileText, uploader: office, files: r.citationFiles, onChange: onUpdate ? files => onUpdate({ ...r, citationFiles: files }) : undefined },
        { label: 'Towing invoice', icon: Truck, uploader: office, files: r.towingInvoiceFiles, onChange: onUpdate ? files => onUpdate({ ...r, towingInvoiceFiles: files }) : undefined },
        { label: 'Repairs document', icon: Wrench, uploader: office, files: r.repairFiles, onChange: onUpdate ? files => onUpdate({ ...r, repairFiles: files }) : undefined },
        { label: 'E-log', icon: FileText, uploader: office, files: r.elogFiles, onChange: onUpdate ? files => onUpdate({ ...r, elogFiles: files }) : undefined },
        { label: 'Claim ledger', icon: FileText, uploader: claims, files: r.ledgerFiles, onChange: onUpdate ? files => onUpdate({ ...r, ledgerFiles: files }) : undefined },
        { label: 'Claim documents', icon: FileText, uploader: claims, files: r.claimDocsFiles, onChange: onUpdate ? files => onUpdate({ ...r, claimDocsFiles: files }) : undefined },
        { label: 'Additional documents', icon: FileText, uploader: office, files: r.additionalDocsFiles, onChange: onUpdate ? files => onUpdate({ ...r, additionalDocsFiles: files }) : undefined },
        ...(r.witnesses ?? []).filter(w => (w.statementFiles?.length ?? 0) > 0).map((w, i) => ({
            label: `Witness statement — ${w.name || `Witness ${i + 1}`}`, icon: Users, uploader: w.name || `Witness ${i + 1}`, files: w.statementFiles,
            onChange: onUpdate ? (files: AccidentFile[]) => onUpdate({ ...r, witnesses: (r.witnesses ?? []).map(x => (x.id === w.id ? { ...x, statementFiles: files } : x)) }) : undefined,
        })),
        ...(r.otherVehicles ?? []).filter(v => (v.coiFiles?.length ?? 0) > 0).map((v, i) => ({
            label: `COI — Other vehicle ${i + 1}`, icon: FileText, uploader: v.insuranceCompany || office, files: v.coiFiles,
            onChange: onUpdate ? (files: AccidentFile[]) => onUpdate({ ...r, otherVehicles: (r.otherVehicles ?? []).map(x => (x.id === v.id ? { ...x, coiFiles: files } : x)) }) : undefined,
        })),
    ];
    const onSeedSample = onUpdate ? () => onUpdate({
        ...r,
        driverStatementFiles: r.driverStatementFiles?.length ? r.driverStatementFiles : [sampleFile('driver-statement.pdf', ['Signed', 'Primary'], 'Sample driver statement.')],
        policeReportFiles: r.policeReportFiles?.length ? r.policeReportFiles : [sampleFile('police-report.pdf', ['Verified'], 'Sample police report.')],
        citationFiles: r.citationFiles?.length ? r.citationFiles : [sampleFile('citation-ticket.pdf', ['Original'])],
        repairFiles: r.repairFiles?.length ? r.repairFiles : [sampleFile('repair-estimate.pdf', ['Primary'])],
    }) : undefined;
    return <DocListSection title="Documents & records" groups={groups} onSeedSample={onSeedSample} defaultAt={r.dateTime || r.reportedAt} signable driverName={driver} onSendToAdjuster={makeSendToAdjuster(r, onUpdate)} record={r} accountId={accountId} />;
}

// ── Evidence ─────────────────────────────────────────────────────
function EvidenceTab({ record: r, onUpdate }: { record: AccidentRecord; onUpdate?: (rec: AccidentRecord) => void }) {
    const driver = r.driverName || r.reportedBy || 'Driver';
    const groups: DocGroupDef[] = [
        { label: 'Vehicle damage pictures', icon: Camera, uploader: driver, files: r.vehicleDamageFiles, onChange: onUpdate ? files => onUpdate({ ...r, vehicleDamageFiles: files }) : undefined },
        { label: 'Evidence pictures', icon: Camera, uploader: driver, files: r.photoFiles, onChange: onUpdate ? files => onUpdate({ ...r, photoFiles: files }) : undefined },
        { label: 'Video', icon: Video, uploader: driver, files: r.videoFiles, onChange: onUpdate ? files => onUpdate({ ...r, videoFiles: files }) : undefined },
        { label: 'Dashcam video', icon: Video, uploader: driver, files: r.dashcamFiles, onChange: onUpdate ? files => onUpdate({ ...r, dashcamFiles: files }) : undefined },
    ];
    const onSeedSample = onUpdate ? () => onUpdate({
        ...r,
        vehicleDamageFiles: r.vehicleDamageFiles?.length ? r.vehicleDamageFiles : [sampleFile('front-damage.jpg', ['Vehicle damaged', 'Vehicle - Front']), sampleFile('left-side.jpg', ['Vehicle - Left'])],
        photoFiles: r.photoFiles?.length ? r.photoFiles : [sampleFile('scene-front.jpg', ['Primary'])],
        videoFiles: r.videoFiles?.length ? r.videoFiles : [sampleFile('scene-video.mp4', ['Original'])],
        dashcamFiles: r.dashcamFiles?.length ? r.dashcamFiles : [sampleFile('dashcam.mp4', ['Verified'], 'Forward dashcam clip.')],
    }) : undefined;
    return <DocListSection title="Evidence" groups={groups} onSeedSample={onSeedSample} defaultAt={r.dateTime || r.reportedAt} record={r} onSendToAdjuster={makeSendToAdjuster(r, onUpdate)} />;
}

// ── Case communication (ticket) ──────────────────────────────────
/** Everything shareable with the adjuster — the accident package up to the Claim section
 *  (documents + evidence + claim files). Excludes the internal Verification / Review docs. */
function buildShareable(r: AccidentRecord): CaseAttachment[] {
    const out: CaseAttachment[] = [];
    const add = (group: string, files?: AccidentFile[]) => (files ?? []).forEach(f => out.push({ name: f.fileName, group }));
    add('Driver statement', r.driverStatementFiles);
    add('Vehicle damage pictures', r.vehicleDamageFiles);
    add('Evidence pictures', r.photoFiles);
    add('Video', r.videoFiles);
    add('Dashcam video', r.dashcamFiles);
    add('Repairs document', r.repairFiles);
    add('Towing invoice', r.towingInvoiceFiles);
    add('E-log', r.elogFiles);
    add('Police report', r.policeReportFiles);
    add('Citation / ticket', r.citationFiles);
    (r.witnesses ?? []).forEach((w, i) => add(`Witness — ${w.name || `Witness ${i + 1}`}`, w.statementFiles));
    (r.otherVehicles ?? []).forEach((v, i) => add(`COI — Other vehicle ${i + 1}`, v.coiFiles));
    add('Claim ledger', r.ledgerFiles);
    add('Claim documents', r.claimDocsFiles);
    return out;
}
const nowStampLocal = () => {
    const n = new Date(); const p = (x: number) => String(x).padStart(2, '0');
    return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}T${p(n.getHours())}:${p(n.getMinutes())}`;
};
const CASE_KIND_META: Record<CaseMessage['kind'], { label: string; icon: LucideIcon; tone: string }> = {
    send: { label: 'Sent package', icon: Send, tone: 'text-blue-700' },
    response: { label: 'Responded', icon: CornerUpLeft, tone: 'text-violet-700' },
    request: { label: 'Requested documents', icon: Inbox, tone: 'text-amber-700' },
    note: { label: 'Note', icon: MessageSquare, tone: 'text-slate-600' },
};

function CaseBubble({ m }: { m: CaseMessage }) {
    const meta = CASE_KIND_META[m.kind];
    const mine = m.from === 'carrier';
    return (
        <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
            <div className={cn('w-full max-w-2xl rounded-2xl border p-4 shadow-sm', mine ? 'border-blue-100 bg-blue-50/50' : 'border-amber-100 bg-amber-50/40')}>
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className={cn('inline-flex items-center gap-1 text-[12px] font-bold', meta.tone)}><meta.icon size={13} /> {meta.label}</span>
                    <span className="text-[12px] font-semibold text-slate-700">{m.by}</span>
                    <span className={cn('inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase', mine ? 'border-blue-200 bg-white text-blue-600' : 'border-amber-200 bg-white text-amber-700')}>{mine ? 'You · carrier' : 'Adjuster'}</span>
                    <span className="ml-auto flex items-center gap-1 text-[11px] text-slate-400"><Clock size={11} /> {fmtDateTime(m.at)}</span>
                </div>
                {m.subject && <p className="text-[13px] font-bold text-slate-800">{m.subject}</p>}
                {m.body && <p className="mt-0.5 whitespace-pre-line text-[13px] text-slate-600">{m.body}</p>}
                {m.requestedItems && m.requestedItems.length > 0 && (
                    <ul className="mt-2 space-y-1">
                        {m.requestedItems.map((it, i) => <li key={i} className="flex items-start gap-2 text-[13px] text-slate-700"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />{it}</li>)}
                    </ul>
                )}
                {m.attachments && m.attachments.length > 0 && (
                    <div className="mt-3 border-t border-slate-200/70 pt-2">
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{m.attachments.length} attachment{m.attachments.length > 1 ? 's' : ''}</p>
                        <div className="flex flex-wrap gap-1.5">
                            {m.attachments.map((a, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">
                                    <Paperclip size={11} className="text-slate-400" /> <span className="max-w-[180px] truncate" title={`${a.group ? a.group + ' · ' : ''}${a.name}`}>{a.name}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/** Send-to-adjuster composer — modelled on the hiring "Ask driver for more data" request modal:
 *  Send to (email) + Send via (Email / In-app) + a grouped "Items to send" checklist with a
 *  selected-count / Clear-all control + Subject + Message + a footer count. */
function MailComposeModal({ toName, toEmail, subject, body, attachments, requestedItems, mode, claimFormName, onSend, onClose, onRequestLink, onClaimLink }: {
    toName: string; toEmail: string; subject: string; body: string; attachments: CaseAttachment[];
    requestedItems?: string[]; mode: 'send' | 'respond'; claimFormName?: string;
    onSend: (email: string, via: 'email' | 'inapp', subject: string, body: string, attachments: CaseAttachment[]) => void; onClose: () => void;
    onRequestLink?: () => void; onClaimLink?: () => void;
}) {
    const [email, setEmail] = useState(toEmail);
    const [via, setVia] = useState<'email' | 'inapp'>('email');
    const [subj, setSubj] = useState(subject);
    const [text, setText] = useState(body);
    const [view, setView] = useState<'compose' | 'preview'>('compose');
    const [checked, setChecked] = useState<Set<number>>(() => new Set(attachments.map((_, i) => i)));
    const toggle = (i: number) => setChecked(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
    const selected = attachments.filter((_, i) => checked.has(i));
    // Ordered groups (preserve first-seen order).
    const groupOrder: string[] = [];
    const groups: Record<string, number[]> = {};
    attachments.forEach((a, i) => { const g = a.group || 'Other'; if (!groups[g]) { groups[g] = []; groupOrder.push(g); } groups[g].push(i); });
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
            <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
                    <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white"><Send size={16} /></span>
                        <div>
                            <h4 className="text-base font-bold text-slate-900">Send to adjuster</h4>
                            <p className="mt-0.5 text-[13px] text-slate-500">{mode === 'respond' ? `Reply to ${toName || 'the adjuster'} with the requested documents.` : `Send ${toName || 'the adjuster'} the accident report with documents & evidence.`}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
                </div>
                {/* Compose / Preview toggle — keeps the modal short; the preview lives behind a button */}
                <div className="flex items-center gap-1 border-b border-slate-100 bg-slate-50/70 px-6 py-2.5">
                    <button type="button" onClick={() => setView('compose')} className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors', view === 'compose' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700')}><Pencil size={14} /> Compose</button>
                    <button type="button" onClick={() => setView('preview')} className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors', view === 'preview' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700')}><Eye size={14} /> Preview email</button>
                    <span className="ml-auto text-[12px] font-semibold text-slate-400">{selected.length} of {attachments.length} attached</span>
                </div>
                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {view === 'compose' ? (
                        /* Two columns — recipient & message on the left, the item list fills a taller block on the right */
                        <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2 lg:items-stretch">
                            {/* Left — recipient, subject & message */}
                            <div className="flex flex-col gap-5">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Send to</label>
                                        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com"
                                            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Send via</label>
                                        <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-1">
                                            <button type="button" onClick={() => setVia('email')} className={cn('inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors', via === 'email' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800')}><Mail size={14} /> Email</button>
                                            <button type="button" onClick={() => setVia('inapp')} className={cn('inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors', via === 'inapp' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800')}><Smartphone size={14} /> In-app</button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Subject</label>
                                    <input value={subj} onChange={e => setSubj(e.target.value)}
                                        className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                                <div className="flex flex-1 flex-col">
                                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Message</label>
                                    <textarea value={text} onChange={e => setText(e.target.value)}
                                        className="min-h-[150px] w-full flex-1 resize-y rounded-lg border border-slate-300 p-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                            </div>

                            {/* Right — items to send (one scrollable block that fills the column) */}
                            <div className="flex min-h-0 flex-col">
                                <div className="mb-2 flex items-center justify-between">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Items to send</label>
                                    <div className="flex items-center gap-3 text-[12px]">
                                        <span className="font-semibold text-slate-500">{selected.length} selected</span>
                                        {attachments.length > 0 && <button type="button" onClick={() => setChecked(selected.length ? new Set() : new Set(attachments.map((_, i) => i)))} className="font-semibold text-blue-600 hover:text-blue-700">{selected.length ? 'Clear all' : 'Select all'}</button>}
                                    </div>
                                </div>
                                {requestedItems && requestedItems.length > 0 && (
                                    <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">Adjuster requested</p>
                                        <ul className="space-y-0.5">{requestedItems.map((it, i) => <li key={i} className="text-[12px] text-amber-800">• {it}</li>)}</ul>
                                    </div>
                                )}
                                {attachments.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-[12px] text-slate-400">No documents or evidence uploaded yet — add files on the accident, then send.</div>
                                ) : (
                                    <div className="min-h-[240px] flex-1 space-y-3 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-slate-50/40 p-3 lg:max-h-[52vh]">
                                        {groupOrder.map(g => (
                                            <div key={g}>
                                                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{g}</p>
                                                <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
                                                    {groups[g].map(i => (
                                                        <label key={i} className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50">
                                                            <input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                                                            <FileText size={14} className="shrink-0 text-emerald-600" />
                                                            <span className="truncate">{attachments[i].name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Email preview — exactly what the adjuster sees, including the action links (readable single column) */
                        <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-slate-200">
                            <div className="space-y-0.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[12px]">
                                <p><span className="font-semibold text-slate-600">To:</span> <span className="text-slate-500">{email || 'adjuster@insurer.com'}</span></p>
                                <p><span className="font-semibold text-slate-600">Subject:</span> <span className="text-slate-500">{subj || '—'}</span></p>
                                <p><span className="font-semibold text-slate-600">Via:</span> <span className="text-slate-500">{via === 'email' ? 'Email' : 'In-app message'}</span></p>
                            </div>
                            <div className="space-y-3 bg-white px-4 py-4">
                                <p className="whitespace-pre-line text-[13px] leading-relaxed text-slate-700">{text}</p>

                                {/* Links inside the email — the adjuster acts on the file straight from here */}
                                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Links in this email</p>
                                    {onClaimLink && (
                                        <button type="button" onClick={onClaimLink} className="flex w-full items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-left text-[12px] font-semibold text-blue-700 transition-colors hover:bg-blue-100">
                                            <FileText size={15} className="shrink-0" />
                                            <span className="min-w-0 flex-1">Open the accident form — only the claim section is editable
                                                <span className="block truncate text-[11px] font-normal text-blue-600/80">{claimFormName || 'accident-form.pdf'}</span>
                                            </span>
                                            <ExternalLink size={13} className="shrink-0 text-blue-400" />
                                        </button>
                                    )}
                                    {onRequestLink && (
                                        <button type="button" onClick={onRequestLink} className="flex w-full items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-[12px] font-semibold text-amber-700 transition-colors hover:bg-amber-100">
                                            <Inbox size={15} className="shrink-0" />
                                            <span className="min-w-0 flex-1">Request documents you still need
                                                <span className="block truncate text-[11px] font-normal text-amber-600/80">Opens the document-request form</span>
                                            </span>
                                            <ExternalLink size={13} className="shrink-0 text-amber-400" />
                                        </button>
                                    )}
                                    <p className="text-[10px] text-slate-400">In this preview you can click a link to open the form the adjuster would fill.</p>
                                </div>

                                {selected.length > 0 && (
                                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{selected.length} attachment{selected.length !== 1 ? 's' : ''}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selected.map((a, i) => (
                                                <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">
                                                    <Paperclip size={11} className="text-slate-400" /><span className="max-w-[180px] truncate" title={a.name}>{a.name}</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                {/* Footer */}
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-6 py-4">
                    <span className="text-[12px] text-slate-400">{selected.length} item{selected.length !== 1 ? 's' : ''} · {via === 'email' ? 'Email' : 'In-app'}</span>
                    <div className="flex items-center gap-2">
                        {view === 'compose'
                            ? <button type="button" onClick={() => setView('preview')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"><Eye size={15} /> Preview</button>
                            : <button type="button" onClick={() => setView('compose')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"><Pencil size={15} /> Edit</button>}
                        <button type="button" onClick={() => onSend(email, via, subj, text, selected)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"><Send size={15} /> {mode === 'respond' ? 'Send response' : 'Send to adjuster'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** ── Requestable documents, typed by kind ──────────────────────────
 *  Each requestable item carries a type (Document/PDF, Image, Video). The type decides the
 *  chip we show it under AND, when we upload the file back, which bucket on the accident it
 *  files into by default (documents → Additional documents, images → Evidence pictures,
 *  videos → Video). */
type ReqType = 'document' | 'image' | 'video';
type FileBucket = 'claimDocsFiles' | 'photoFiles' | 'videoFiles' | 'vehicleDamageFiles';
const BUCKET_META: Record<FileBucket, string> = {
    claimDocsFiles: 'Additional documents',
    photoFiles: 'Evidence pictures',
    videoFiles: 'Video',
    vehicleDamageFiles: 'Vehicle damage pictures',
};
const REQ_TYPE_META: Record<ReqType, { label: string; icon: LucideIcon; tone: string; bucket: FileBucket }> = {
    document: { label: 'Documents / PDF', icon: FileText, tone: 'border-rose-200 bg-rose-50 text-rose-700', bucket: 'claimDocsFiles' },
    image: { label: 'Images / photos', icon: Camera, tone: 'border-blue-200 bg-blue-50 text-blue-700', bucket: 'photoFiles' },
    video: { label: 'Videos', icon: Video, tone: 'border-violet-200 bg-violet-50 text-violet-700', bucket: 'videoFiles' },
};
const REQ_TYPE_ORDER: ReqType[] = ['document', 'image', 'video'];
interface RequestableDoc { label: string; type: ReqType; }
const REQUESTABLE: RequestableDoc[] = [
    { label: 'Signed driver statement (all pages)', type: 'document' },
    { label: 'Repair estimate / invoice', type: 'document' },
    { label: 'Police report / exchange of information', type: 'document' },
    { label: 'Third-party certificate of insurance (COI)', type: 'document' },
    { label: 'Medical records or injury report', type: 'document' },
    { label: 'Witness statements', type: 'document' },
    { label: 'Additional vehicle-damage photos', type: 'image' },
    { label: 'Scene / intersection photos', type: 'image' },
    { label: 'Dashcam / video footage', type: 'video' },
    { label: 'CCTV / third-party video', type: 'video' },
];
const reqTypeOf = (label: string): ReqType => REQUESTABLE.find(d => d.label === label)?.type ?? 'document';
const bucketOf = (label: string): FileBucket => REQ_TYPE_META[reqTypeOf(label)].bucket;

/** The form the adjuster opens from the link inside our email — items grouped by type, ticked,
 *  and submitted. Submitting posts their request back into the case thread. In the prototype we
 *  can open it ourselves from the email preview to see exactly what they'd fill. */
function AdjusterRequestForm({ adjusterName, adjusterEmail, claimNumber, driverName, onSubmit, onClose }: {
    adjusterName: string; adjusterEmail: string; claimNumber?: string; driverName?: string;
    onSubmit: (items: string[], message: string) => void; onClose: () => void;
}) {
    const [checked, setChecked] = useState<Set<string>>(new Set());
    const [other, setOther] = useState('');
    const [message, setMessage] = useState('Thanks for the file. To progress the claim please send the following:');
    const toggle = (d: string) => setChecked(s => { const n = new Set(s); n.has(d) ? n.delete(d) : n.add(d); return n; });
    const items = [...REQUESTABLE.filter(d => checked.has(d.label)).map(d => d.label), ...other.split('\n').map(s => s.trim()).filter(Boolean)];
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
            <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
                {/* Header — reads like the external portal the adjuster lands on from the email link */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-amber-50/60 px-6 py-4">
                    <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white"><Inbox size={16} /></span>
                        <div>
                            <h4 className="text-base font-bold text-slate-900">Request documents</h4>
                            <p className="mt-0.5 text-[13px] text-slate-500">Adjuster form — opened from the link in the email. Tick what you still need to process this claim.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                    <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px]">
                        <div><p className="font-semibold uppercase tracking-wide text-slate-400">Accident</p><p className="truncate text-slate-700">{driverName || '—'}</p></div>
                        <div><p className="font-semibold uppercase tracking-wide text-slate-400">Claim</p><p className="truncate text-slate-700">{claimNumber || '—'}</p></div>
                        <div><p className="font-semibold uppercase tracking-wide text-slate-400">Adjuster</p><p className="truncate text-slate-700" title={adjusterEmail}>{adjusterName || 'Adjuster'}</p></div>
                    </div>
                    {REQ_TYPE_ORDER.map(t => {
                        const meta = REQ_TYPE_META[t];
                        const docs = REQUESTABLE.filter(d => d.type === t);
                        return (
                            <div key={t}>
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <span className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold', meta.tone)}><meta.icon size={11} /> {meta.label}</span>
                                    <span className="text-[11px] text-slate-400">files into “{BUCKET_META[meta.bucket]}”</span>
                                </div>
                                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                    {docs.map(d => (
                                        <label key={d.label} className={cn('flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] transition-colors hover:bg-slate-50', checked.has(d.label) ? 'border-amber-300 bg-amber-50/60 text-slate-800' : 'border-slate-200 text-slate-700')}>
                                            <input type="checkbox" checked={checked.has(d.label)} onChange={() => toggle(d.label)} className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500/30" />
                                            <span className="min-w-0 flex-1">{d.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Other documents <span className="font-normal text-slate-400">(one per line)</span></label>
                            <textarea value={other} onChange={e => setOther(e.target.value)} rows={2} placeholder="Anything else you need…" className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Message</label>
                            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
                    <span className="text-[12px] text-slate-400">{items.length} item{items.length !== 1 ? 's' : ''} selected</span>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                        <button type="button" onClick={() => items.length && onSubmit(items, message)} disabled={!items.length} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"><Send size={15} /> Submit request</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Our side — upload the files the adjuster requested. Each requested item defaults to a
 *  destination bucket on the accident (Additional documents / Evidence pictures / Video),
 *  editable per row; on send the files are filed there and a response goes to the thread. */
interface FulfillRow { item: string; bucket: FileBucket; files: AccidentFile[]; }
function FulfillRequestModal({ items, uploader, onSend, onClose }: {
    items: string[]; uploader: string;
    onSend: (rows: FulfillRow[], message: string) => void; onClose: () => void;
}) {
    const [rows, setRows] = useState<FulfillRow[]>(() => items.map(it => ({ item: it, bucket: bucketOf(it), files: [] })));
    const [message, setMessage] = useState('Hi, please find the requested documents attached.');
    const addFiles = (idx: number, fl: FileList | null) => {
        if (!fl || !fl.length) return;
        const add: AccidentFile[] = [...fl].map(file => ({ id: newFileId(), fileName: file.name, fileSize: file.size, uploadedBy: uploader, uploadedAt: nowStampLocal(), tags: [] }));
        setRows(rs => rs.map((r, i) => i === idx ? { ...r, files: [...r.files, ...add] } : r));
    };
    const removeFile = (idx: number, fid: string) => setRows(rs => rs.map((r, i) => i === idx ? { ...r, files: r.files.filter(f => f.id !== fid) } : r));
    const setBucket = (idx: number, bucket: FileBucket) => setRows(rs => rs.map((r, i) => i === idx ? { ...r, bucket } : r));
    const total = rows.reduce((n, r) => n + r.files.length, 0);
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
            <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
                    <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white"><Upload size={16} /></span>
                        <div>
                            <h4 className="text-base font-bold text-slate-900">Upload requested documents</h4>
                            <p className="mt-0.5 text-[13px] text-slate-500">Attach the files the adjuster asked for — they file into the accident automatically.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
                    {rows.length === 0 && <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-[13px] text-slate-400">No outstanding request to fulfil.</p>}
                    {rows.map((row, idx) => {
                        const meta = REQ_TYPE_META[reqTypeOf(row.item)];
                        return (
                            <div key={idx} className="rounded-xl border border-slate-200 p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold', meta.tone)}><meta.icon size={11} /></span>
                                    <span className="min-w-0 flex-1 text-[13px] font-semibold text-slate-800">{row.item}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] text-slate-400">Files into</span>
                                        <select value={row.bucket} onChange={e => setBucket(idx, e.target.value as FileBucket)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[12px] text-slate-700 focus:border-blue-400 focus:outline-none">
                                            {(Object.keys(BUCKET_META) as FileBucket[]).map(b => <option key={b} value={b}>{BUCKET_META[b]}</option>)}
                                        </select>
                                    </div>
                                </div>
                                {row.files.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {row.files.map(f => (
                                            <div key={f.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[12px] text-slate-600">
                                                <Paperclip size={12} className="shrink-0 text-slate-400" />
                                                <span className="min-w-0 flex-1 truncate" title={f.fileName}>{f.fileName}</span>
                                                <button type="button" onClick={() => removeFile(idx, f.id)} className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"><X size={13} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-600">
                                    <Upload size={13} /> Upload file
                                    <input type="file" multiple className="hidden" onChange={e => { addFiles(idx, e.target.files); e.target.value = ''; }} />
                                </label>
                            </div>
                        );
                    })}
                    <div>
                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Message</label>
                        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
                    <span className="text-[12px] text-slate-400">{total} file{total !== 1 ? 's' : ''} to upload</span>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                        <button type="button" onClick={() => total && onSend(rows, message)} disabled={!total} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><Send size={15} /> Send response</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CaseTab({ record: r, onUpdate, onEdit }: { record: AccidentRecord; onUpdate?: (rec: AccidentRecord) => void; onEdit: () => void }) {
    const c: AccidentCase = r.case ?? { status: 'not_started', adjusterName: r.adjusterName, adjusterEmail: r.adjusterEmail, messages: [] };
    const status = CASE_STATUS_META[c.status];
    const adjusterName = c.adjusterName || r.adjusterName || '';
    const adjusterEmail = c.adjusterEmail || r.adjusterEmail || '';
    // The package = the accident-report PDF (up to Claim) + an unedited accident form where ONLY the
    // Claim section is editable (the adjuster fills it), + the individual documents & evidence.
    const claimFormName = `accident-form-${(r.driverName || 'driver').toLowerCase().replace(/\s+/g, '-')}.pdf`;
    const shareable = useMemo(() => [
        { name: accidentReportFileName(r), group: 'Accident report (PDF)' } as CaseAttachment,
        { name: claimFormName, group: 'Accident form — claim section editable' } as CaseAttachment,
        ...buildShareable(r),
    ], [r, claimFormName]);
    const me = r.verifiedBy || 'Office';
    const acc = typesOf(r) || 'Accident report';
    const [compose, setCompose] = useState<null | { mode: 'send' | 'respond'; requested?: string[] }>(null);
    const lastRequest = [...c.messages].reverse().find(m => m.kind === 'request');
    const readOnly = !onUpdate;

    const push = (msg: CaseMessage, statusAfter: AccidentCase['status'], action: string, detail?: string) => {
        if (!onUpdate) return;
        const cur = r.case ?? { status: 'not_started' as const, adjusterName, adjusterEmail, messages: [] };
        const nextCase: AccidentCase = { ...cur, adjusterName: cur.adjusterName || adjusterName, adjusterEmail: cur.adjusterEmail || adjusterEmail, status: statusAfter, messages: [...cur.messages, msg] };
        const activity: AccidentActivity[] = [...(r.activity ?? []), { id: `case-${msg.id}`, at: msg.at, by: msg.by, role: msg.from === 'adjuster' ? 'adjuster' : 'office', action, detail }];
        onUpdate({ ...r, case: nextCase, activity });
    };
    const doSend = (mode: 'send' | 'respond', email: string, via: 'email' | 'inapp', subject: string, body: string, attachments: CaseAttachment[]) => {
        if (!onUpdate) return;
        const at = nowStampLocal();
        const msg: CaseMessage = { id: newFileId(), kind: mode === 'respond' ? 'response' : 'send', from: 'carrier', by: me, at, subject, body, attachments };
        const cur = r.case ?? { status: 'not_started' as const, adjusterName, adjusterEmail, messages: [] };
        const nextCase: AccidentCase = { ...cur, adjusterName: cur.adjusterName || adjusterName, adjusterEmail: email || cur.adjusterEmail || adjusterEmail, status: mode === 'respond' ? 'responded' : 'sent', messages: [...cur.messages, msg] };
        const activity: AccidentActivity[] = [...(r.activity ?? []), { id: `case-${msg.id}`, at, by: me, role: 'office', action: mode === 'respond' ? 'Responded to adjuster' : 'Sent case to adjuster', detail: `${attachments.length} item(s) via ${via === 'email' ? 'Email' : 'In-app'} — “${subject}”` }];
        onUpdate({ ...r, case: nextCase, activity });
        setCompose(null);
    };
    // The adjuster's request form (opened from the email link) — submitting posts their request into the thread.
    const [requestForm, setRequestForm] = useState(false);
    const submitAdjusterRequest = (items: string[], message: string) => {
        const msg: CaseMessage = { id: newFileId(), kind: 'request', from: 'adjuster', by: adjusterName || 'Adjuster', at: nowStampLocal(), body: message, requestedItems: items };
        push(msg, 'info_requested', 'Adjuster requested documents', items.join(' · '));
        setRequestForm(false);
    };
    // Adjuster uploads a document to us — it files into our Additional documents automatically.
    const adjusterSendsDoc = () => {
        if (!onUpdate) return;
        const at = nowStampLocal();
        const file: AccidentFile = { id: newFileId(), fileName: 'adjuster-coverage-letter.pdf', fileSize: 280, tags: ['From adjuster'], uploadedBy: adjusterName || 'Adjuster', uploadedAt: at, note: `Provided by ${adjusterName || 'the adjuster'} via the case.` };
        const next: AccidentRecord = { ...r, additionalDocsFiles: [...(r.additionalDocsFiles ?? []), file] };
        const msg: CaseMessage = { id: newFileId(), kind: 'response', from: 'adjuster', by: adjusterName || 'Adjuster', at, body: 'Sharing a document for your file — saved under Additional documents.', attachments: [{ name: file.fileName, group: 'Additional documents' }] };
        const cur = next.case ?? { status: 'not_started' as const, adjusterName, adjusterEmail, messages: [] };
        const nextCase: AccidentCase = { ...cur, adjusterName: cur.adjusterName || adjusterName, adjusterEmail: cur.adjusterEmail || adjusterEmail, status: 'responded', messages: [...cur.messages, msg] };
        const activity: AccidentActivity[] = [...(next.activity ?? []), { id: `case-${msg.id}`, at, by: adjusterName || 'Adjuster', role: 'adjuster', action: 'Adjuster sent a document', detail: `${file.fileName} → Additional documents` }];
        onUpdate({ ...next, case: nextCase, activity });
    };
    // Adjuster fills the claim on the form we sent (only the claim section is editable).
    const [claimForm, setClaimForm] = useState(false);
    const submitClaim = (patch: Partial<AccidentRecord>) => {
        if (!onUpdate) return;
        const at = nowStampLocal();
        const by = (patch.adjusterName as string) || adjusterName || 'Adjuster';
        const next: AccidentRecord = { ...r, ...patch };
        const msg: CaseMessage = { id: newFileId(), kind: 'response', from: 'adjuster', by, at, subject: 'Claim completed', body: `Claim details filled${patch.claimNumber ? ` — ${patch.claimNumber}` : ''}. The rest of the accident form was read-only.`, attachments: [{ name: claimFormName, group: 'Accident form — claim section' }] };
        const cur = next.case ?? { status: 'not_started' as const, adjusterName, adjusterEmail, messages: [] };
        const nextCase: AccidentCase = { ...cur, adjusterName: patch.adjusterName || cur.adjusterName || adjusterName, adjusterEmail: patch.adjusterEmail || cur.adjusterEmail || adjusterEmail, status: 'responded', messages: [...cur.messages, msg] };
        const activity: AccidentActivity[] = [...(next.activity ?? []), { id: `case-${msg.id}`, at, by, role: 'adjuster', action: 'Adjuster filled the claim', detail: patch.claimNumber ? `Claim ${patch.claimNumber}` : 'Claim section updated' }];
        onUpdate({ ...next, case: nextCase, activity });
        setClaimForm(false);
    };
    // Our upload form — attach the requested files; they file into the accident buckets + go back to the adjuster.
    const [fulfill, setFulfill] = useState(false);
    const fulfillRequest = (rows: FulfillRow[], message: string) => {
        if (!onUpdate) return;
        const withFiles = rows.filter(row => row.files.length);
        const allFiles = withFiles.flatMap(row => row.files);
        if (!allFiles.length) return;
        // Append each row's files to its chosen destination bucket on the accident.
        let next: AccidentRecord = { ...r };
        const byBucket = new Map<FileBucket, AccidentFile[]>();
        withFiles.forEach(row => { const cur = byBucket.get(row.bucket) ?? []; cur.push(...row.files); byBucket.set(row.bucket, cur); });
        byBucket.forEach((files, bucket) => {
            const existing = (next as unknown as Record<string, AccidentFile[] | undefined>)[bucket] ?? [];
            next = { ...next, [bucket]: [...existing, ...files] };
        });
        const attachments: CaseAttachment[] = withFiles.flatMap(row => row.files.map(f => ({ name: f.fileName, group: BUCKET_META[row.bucket] })));
        const at = nowStampLocal();
        const msg: CaseMessage = { id: newFileId(), kind: 'response', from: 'carrier', by: me, at, body: message, attachments };
        const cur = next.case ?? { status: 'not_started' as const, adjusterName, adjusterEmail, messages: [] };
        const nextCase: AccidentCase = { ...cur, adjusterName: cur.adjusterName || adjusterName, adjusterEmail: cur.adjusterEmail || adjusterEmail, status: 'responded', messages: [...cur.messages, msg] };
        const activity: AccidentActivity[] = [...(next.activity ?? []), { id: `case-${msg.id}`, at, by: me, role: 'office', action: 'Responded with documents', detail: `${allFiles.length} file(s) uploaded — ${withFiles.map(x => x.item).join(', ')}` }];
        onUpdate({ ...next, case: nextCase, activity });
        setFulfill(false);
    };
    // Quick chat message (no attachments) — the full package still goes through the composer modal.
    const [draft, setDraft] = useState('');
    const sendNote = () => {
        const text = draft.trim();
        if (!onUpdate || !text) return;
        const msg: CaseMessage = { id: newFileId(), kind: 'note', from: 'carrier', by: me, at: nowStampLocal(), body: text };
        push(msg, c.status, 'Sent a message', text);
        setDraft('');
    };
    // Upload & attach a document into the chat (drop-box modal).
    const [attachOpen, setAttachOpen] = useState(false);
    const doAttach = (fileName: string, docName: string, message: string) => {
        if (!onUpdate) return;
        const label = docName.trim() || fileName;
        const msg: CaseMessage = { id: newFileId(), kind: 'send', from: 'carrier', by: me, at: nowStampLocal(), subject: label, body: message.trim() || `Attached ${label}.`, attachments: [{ name: fileName, group: label }] };
        push(msg, c.status, 'Attached a document', `${label} · ${fileName}`);
        setAttachOpen(false);
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {/* Chat window — actions on top, scrollable thread, composer at the bottom */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
                    <div className="flex items-center gap-2">
                        <MessageSquare size={15} className="text-blue-600" />
                        <h3 className="text-sm font-bold text-slate-800">Case communication</h3>
                        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', status.tone)}><span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />{status.label}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {!readOnly && <>
                            {c.status === 'info_requested' && (
                                <button type="button" onClick={() => setFulfill(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-blue-700"><Upload size={14} /> Upload requested docs</button>
                            )}
                            <button type="button" onClick={() => setCompose({ mode: 'send' })} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"><Mail size={14} /> {c.messages.length ? 'Send package' : 'Send to adjuster'}</button>
                            <button type="button" onClick={() => setClaimForm(true)} title="Open the claim form the adjuster fills (only the claim section is editable)" className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] font-semibold text-amber-700 hover:bg-amber-100"><FileText size={14} /> Adjuster fills claim</button>
                            <button type="button" onClick={adjusterSendsDoc} title="Simulate the adjuster uploading a document (files into Additional documents)" className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] font-semibold text-amber-700 hover:bg-amber-100"><Upload size={14} /> Adjuster sends doc</button>
                            <button type="button" onClick={() => setRequestForm(true)} title="Open the form the adjuster fills to request documents" className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] font-semibold text-amber-700 hover:bg-amber-100"><Inbox size={14} /> Adjuster requests docs</button>
                        </>}
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-3 border-b border-slate-100 px-5 py-3 sm:grid-cols-3">
                    <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Adjuster</p><p className="text-[13px] font-medium text-slate-800">{adjusterName || <span className="text-slate-300">—</span>}</p></div>
                    <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Adjuster email</p><p className="text-[13px] font-medium text-slate-800">{adjusterEmail || <span className="text-slate-300">—</span>}</p></div>
                    <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Claim number</p><p className="text-[13px] font-medium text-slate-800">{r.claimNumber || <span className="text-slate-300">—</span>}</p></div>
                </div>
                {!adjusterEmail && !readOnly && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-amber-50 px-5 py-2 text-[12px] text-amber-700">
                        <span>No adjuster email on file — add it in the Claim section for a complete case.</span>
                        <button type="button" onClick={onEdit} className="shrink-0 font-semibold underline hover:no-underline">Edit claim</button>
                    </div>
                )}

                {/* Thread — fills the panel so the Case tab matches the other tabs' height */}
                <div className="min-h-[220px] flex-1 space-y-4 overflow-y-auto bg-slate-50 px-5 py-5">
                    {c.messages.length === 0 ? (
                        <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600"><MessageSquare size={22} /></div>
                            <p className="text-sm font-semibold text-slate-700">No messages yet</p>
                            <p className="mx-auto mt-1 max-w-sm text-[13px] text-slate-500">Send the accident package to the adjuster to start the conversation — or type a message below.</p>
                        </div>
                    ) : c.messages.map(m => <CaseBubble key={m.id} m={m} />)}
                </div>

                {/* Composer */}
                {!readOnly && (
                    <div className="flex items-center gap-2 border-t border-slate-100 bg-white px-4 py-3">
                        <button type="button" onClick={() => setAttachOpen(true)} title="Attach a document" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"><Paperclip size={16} /></button>
                        <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendNote(); } }} placeholder="Write a message to the adjuster…" className="h-10 flex-1 rounded-full border border-slate-300 bg-slate-50 px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        <button type="button" onClick={sendNote} disabled={!draft.trim()} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><Send size={16} /></button>
                    </div>
                )}
            </div>

            {compose && (
                <MailComposeModal
                    toName={adjusterName} toEmail={adjusterEmail}
                    subject={compose.mode === 'respond' ? `Re: Requested documents — ${acc}` : `Accident report — ${acc} (${r.driverName || 'driver'})`}
                    body={compose.mode === 'respond'
                        ? `Hi ${adjusterName || 'there'},\n\nPlease find the requested documents attached.\n\nThanks,\n${me}`
                        : `Hi ${adjusterName || 'there'},\n\nPlease find attached our accident report for ${r.driverName || 'our driver'} (unit ${r.unitId || '—'}) on ${fmtDateTime(r.dateTime)} at ${r.location || 'the location noted'}, along with the supporting documents and evidence.\n\nRegards,\n${me}`}
                    attachments={shareable} requestedItems={compose.requested} mode={compose.mode}
                    claimFormName={claimFormName}
                    onSend={(email, via, subject, body, attachments) => doSend(compose.mode, email, via, subject, body, attachments)}
                    onClose={() => setCompose(null)}
                    onRequestLink={() => { setCompose(null); setRequestForm(true); }}
                    onClaimLink={() => { setCompose(null); setClaimForm(true); }}
                />
            )}
            {requestForm && (
                <AdjusterRequestForm
                    adjusterName={adjusterName} adjusterEmail={adjusterEmail} claimNumber={r.claimNumber} driverName={r.driverName}
                    onSubmit={submitAdjusterRequest}
                    onClose={() => setRequestForm(false)}
                />
            )}
            {fulfill && (
                <FulfillRequestModal
                    items={lastRequest?.requestedItems ?? []} uploader={me}
                    onSend={fulfillRequest}
                    onClose={() => setFulfill(false)}
                />
            )}
            {attachOpen && <ChatAttachModal onSend={doAttach} onClose={() => setAttachOpen(false)} />}
            {claimForm && <ClaimFormModal record={r} onSubmit={submitClaim} onClose={() => setClaimForm(false)} />}
        </div>
    );
}

/** The claim form the adjuster fills — the accident details are read-only; only the Claim section
 *  is editable. Submitting writes the claim fields back to the record. */
function ClaimFormModal({ record: r, onSubmit, onClose }: { record: AccidentRecord; onSubmit: (patch: Partial<AccidentRecord>) => void; onClose: () => void }) {
    const [f, setF] = useState({
        claimNumber: r.claimNumber ?? '', claimStatus: r.claimStatus ?? '', insuranceCarrier: r.insuranceCarrier ?? '',
        insurancePolicyNumber: r.insurancePolicyNumber ?? '', adjusterName: r.adjusterName ?? '', adjusterPhone: r.adjusterPhone ?? '',
        adjusterEmail: r.adjusterEmail ?? '', amountPaid: r.amountPaid ?? '', cashReserve: r.cashReserve ?? '', totalIncurred: r.totalIncurred ?? '',
        totalLoss: !!r.totalLoss, subrogation: !!r.subrogation, adjusterNote: r.adjusterNote ?? '',
    });
    const set = (k: keyof typeof f, v: string | boolean) => setF(s => ({ ...s, [k]: v }));
    const Fld = ({ label, k, ph }: { label: string; k: keyof typeof f; ph?: string }) => (
        <div><label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
            <input value={f[k] as string} onChange={e => set(k, e.target.value)} placeholder={ph} className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20" /></div>
    );
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-amber-50/60 px-6 py-4">
                    <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white"><FileText size={16} /></span>
                        <div><h4 className="text-base font-bold text-slate-900">Accident form — Claim section</h4><p className="mt-0.5 text-[13px] text-slate-500">The accident details are read-only. The adjuster completes the claim section only.</p></div>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
                </div>
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    {/* Read-only accident summary */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400"><Shield size={12} /> Accident (read-only)</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px] sm:grid-cols-3">
                            <div><span className="text-slate-400">Driver</span><p className="text-slate-700">{r.driverName || '—'}</p></div>
                            <div><span className="text-slate-400">Unit</span><p className="text-slate-700">{r.unitId || '—'}</p></div>
                            <div><span className="text-slate-400">Date</span><p className="text-slate-700">{fmtDateTime(r.dateTime)}</p></div>
                            <div className="col-span-2 sm:col-span-3"><span className="text-slate-400">Location</span><p className="text-slate-700">{r.location || '—'}</p></div>
                        </div>
                    </div>
                    {/* Editable claim section */}
                    <div>
                        <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-600"><FileText size={12} /> Claim — editable</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Fld label="Claim number" k="claimNumber" ph="CLM-…" />
                            <Fld label="Claim status" k="claimStatus" ph="Open / Reserved / Closed" />
                            <Fld label="Insurance carrier" k="insuranceCarrier" />
                            <Fld label="Policy number" k="insurancePolicyNumber" />
                            <Fld label="Adjuster name" k="adjusterName" />
                            <Fld label="Adjuster phone" k="adjusterPhone" />
                            <Fld label="Adjuster email" k="adjusterEmail" />
                            <Fld label="Amount paid" k="amountPaid" ph="$" />
                            <Fld label="Cash reserve" k="cashReserve" ph="$" />
                            <Fld label="Total incurred" k="totalIncurred" ph="$" />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 text-[13px] text-slate-700"><input type="checkbox" checked={f.totalLoss} onChange={e => set('totalLoss', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500/30" /> Total loss</label>
                            <label className="flex items-center gap-2 text-[13px] text-slate-700"><input type="checkbox" checked={f.subrogation} onChange={e => set('subrogation', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500/30" /> Subrogation</label>
                        </div>
                        <div className="mt-3"><label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Adjuster note</label>
                            <textarea value={f.adjusterNote} onChange={e => set('adjusterNote', e.target.value)} rows={2} className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20" /></div>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={() => onSubmit({
                        claimNumber: f.claimNumber, claimStatus: f.claimStatus, insuranceCarrier: f.insuranceCarrier, insurancePolicyNumber: f.insurancePolicyNumber,
                        adjusterName: f.adjusterName, adjusterPhone: f.adjusterPhone, adjusterEmail: f.adjusterEmail, amountPaid: f.amountPaid, cashReserve: f.cashReserve,
                        totalIncurred: f.totalIncurred, totalLoss: f.totalLoss, subrogation: f.subrogation, adjusterNote: f.adjusterNote,
                    })} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600"><Check size={15} /> Save claim</button>
                </div>
            </div>
        </div>
    );
}

/** Upload a document and name it — attaches it to the case chat as a message (drop-box style). */
function ChatAttachModal({ onSend, onClose }: { onSend: (fileName: string, docName: string, message: string) => void; onClose: () => void }) {
    const [fileName, setFileName] = useState('');
    const [docName, setDocName] = useState('');
    const [message, setMessage] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const pick = (fl: FileList | null) => { const f = fl?.[0]; if (!f) return; setFileName(f.name); setDocName(d => d.trim() ? d : f.name.replace(/\.[^.]+$/, '')); };
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
                    <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white"><Upload size={16} /></span>
                        <div><h4 className="text-base font-bold text-slate-900">Attach a document</h4><p className="mt-0.5 text-[13px] text-slate-500">Upload a file and name it — it's attached to this case message.</p></div>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
                </div>
                <div className="space-y-4 px-6 py-5">
                    <label onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files); }}
                        className={cn('flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors', dragOver ? 'border-blue-400 bg-blue-50/60' : 'border-slate-300 bg-slate-50 hover:border-blue-300')}>
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm"><Upload size={20} /></span>
                        {fileName ? <p className="max-w-full truncate text-[13px] font-semibold text-slate-700" title={fileName}>{fileName}</p> : <><p className="text-sm font-semibold text-slate-700">Drop a file here</p><p className="text-[12px] text-slate-500">or click to browse</p></>}
                        <input type="file" className="hidden" onChange={e => { pick(e.target.files); e.target.value = ''; }} />
                    </label>
                    <div><label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Document name</label><input value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. Repair estimate" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
                    <div><label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Message <span className="font-normal text-slate-400">(optional)</span></label><textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} placeholder="Add a note…" className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={() => fileName && onSend(fileName, docName, message)} disabled={!fileName} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><Send size={15} /> Attach &amp; send</button>
                </div>
            </div>
        </div>
    );
}

// ── Activity ─────────────────────────────────────────────────────
/** Pick an icon for an activity entry from its action text (covers report / verify /
 *  update / claim / case-communication events). */
function activityIcon(action: string): LucideIcon {
    const a = action.toLowerCase();
    if (a.includes('verif')) return ShieldCheck;
    if (a.includes('respond')) return CornerUpLeft;
    if (a.includes('sent')) return Send;
    if (a.includes('request')) return Inbox;
    if (a.includes('claim')) return FileText;
    if (a.includes('updat')) return Pencil;
    if (a.includes('report') || a.includes('creat')) return AlertTriangle;
    return ActivityIcon;
}
function ActivityTab({ activity }: { activity: AccidentActivity[] }) {
    if (activity.length === 0) {
        return <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">No activity recorded yet.</div>;
    }
    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-5 py-3">
                <ActivityIcon size={15} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Activity — report, review, claim &amp; adjuster case</h3>
            </div>
            {/* Scroll on the wrapper, not the <ol> — the timeline dots use negative left offsets and
                would be clipped if overflow lived on the <ol> itself. */}
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <ol className="relative space-y-5 border-l border-slate-200 pl-8">
                {activity.map(a => {
                    const role = ACTIVITY_ROLE_META[a.role];
                    const Icon = activityIcon(a.action);
                    return (
                        <li key={a.id} className="relative">
                            <span className={cn('absolute -left-[41px] top-0 flex h-6 w-6 items-center justify-center rounded-full text-white ring-4 ring-white', role.ring)}><Icon size={12} /></span>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-slate-800">{a.action}</span>
                                <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold', role.tone)}>{role.label}</span>
                                <span className="flex items-center gap-1 text-[12px] text-slate-400"><Clock size={11} /> {fmtDateTime(a.at)}</span>
                            </div>
                            <p className="mt-0.5 text-[13px] text-slate-600">
                                <span className="font-medium text-slate-700">{a.by}</span>{a.detail ? ` — ${a.detail}` : ''}
                            </p>
                        </li>
                    );
                })}
            </ol>
            </div>
        </div>
    );
}
