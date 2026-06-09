import { useRef, useState } from 'react';
import {
    ArrowLeft, Plus, Trash2, Download, UploadCloud, Check, Award, GraduationCap, Eye,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { cn } from '@/lib/utils';
import { useCompanyBranding } from './company-branding.data';
import type { ApplicationFormDef } from './application-forms.data';

/** One issued certificate row. */
interface CertEntry {
    id: string;
    recipient: string;
    module: string;
    date: string;
    /** Optional uploaded copy of the recipient's own certificate. */
    fileName: string;
}

const FRAME = '#33337a'; // navy/indigo certificate frame
let _seq = 0;
const newId = () => `cert-${Date.now().toString(36)}-${(_seq++).toString(36)}`;

const newEntry = (): CertEntry => ({ id: newId(), recipient: '', module: '', date: '', fileName: '' });

/**
 * Module Completion Certificate generator. Lets a recruiter issue one or more
 * branded training certificates — pick the recipient, the module/training name
 * and the completion date — preview them live with the company's own logo, name
 * and address (dynamic branding), download each as a print-ready PDF, and attach
 * the recipient's own uploaded certificate. Rendered for `form-ats-training-certificates`.
 */
export function TrainingCertificateForm({ appForm, onClose }: { appForm: ApplicationFormDef; onClose: () => void }) {
    const [branding] = useCompanyBranding();
    const [entries, setEntries] = useState<CertEntry[]>([newEntry()]);
    const [activeId, setActiveId] = useState<string>(entries[0].id);
    const [downloading, setDownloading] = useState<string | null>(null);
    const captureRef = useRef<HTMLDivElement>(null);
    const accent = branding.accentColor || '#2563eb';

    const active = entries.find((e) => e.id === activeId) ?? entries[0];

    const patch = (id: string, p: Partial<CertEntry>) =>
        setEntries((s) => s.map((e) => (e.id === id ? { ...e, ...p } : e)));
    const add = () => {
        const e = newEntry();
        setEntries((s) => [...s, e]);
        setActiveId(e.id);
    };
    const remove = (id: string) =>
        setEntries((s) => {
            const next = s.filter((e) => e.id !== id);
            const safe = next.length ? next : [newEntry()];
            if (id === activeId) setActiveId(safe[0].id);
            return safe;
        });

    const download = async (entry: CertEntry) => {
        const node = captureRef.current;
        if (!node || downloading) return;
        setActiveId(entry.id);
        setDownloading(entry.id);
        try {
            // Wait a frame so the preview reflects the active entry before capture.
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
            const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
            const img = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
            const w = pdf.internal.pageSize.getWidth();
            const h = pdf.internal.pageSize.getHeight();
            pdf.addImage(img, 'JPEG', 0, 0, w, h, undefined, 'FAST');
            const safe = `${entry.recipient || 'recipient'}-${entry.module || 'module'}`.replace(/[\\/:*?"<>|]+/g, '-');
            pdf.save(`certificate-${safe}.pdf`);
        } finally {
            setDownloading(null);
        }
    };

    const downloadAll = async () => {
        for (const e of entries) {
            if (!e.recipient && !e.module) continue;
            // eslint-disable-next-line no-await-in-loop
            await download(e);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-100">
            {/* App bar */}
            <header className="z-20 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700" title="Back">
                            <ArrowLeft size={16} />
                        </button>
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm" style={{ backgroundColor: accent }}>
                            <GraduationCap size={19} />
                        </span>
                        <div className="leading-tight">
                            <h1 className="text-[17px] font-bold text-slate-900">{appForm.displayTitle || 'Module Completion Certificate'}</h1>
                            <p className="text-[11px] text-slate-500">Branded training certificates · {branding.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={downloadAll} disabled={!!downloading}
                            className="hidden h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:inline-flex">
                            <Download size={14} /> Download all
                        </button>
                        <button type="button" onClick={() => download(active)} disabled={!!downloading}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-bold text-white shadow-sm disabled:opacity-60" style={{ backgroundColor: accent }}>
                            <Download size={14} /> {downloading ? 'Preparing…' : 'Download PDF'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Body: builder (left) + live preview (right) */}
            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[360px_1fr]">
                    {/* ── Builder ───────────────────────────────── */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-slate-500"><Award size={13} /> Certificates ({entries.length})</p>
                            <button type="button" onClick={add} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">
                                <Plus size={13} /> Add
                            </button>
                        </div>

                        {entries.map((e, i) => {
                            const on = e.id === activeId;
                            return (
                                <div key={e.id} className={cn('overflow-hidden rounded-xl border bg-white shadow-sm transition-colors', on ? 'border-blue-400 ring-1 ring-blue-400/30' : 'border-slate-200')}>
                                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2">
                                        <button type="button" onClick={() => setActiveId(e.id)} className="flex min-w-0 items-center gap-2 text-left">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white" style={{ backgroundColor: accent }}>{i + 1}</span>
                                            <span className="truncate text-[13px] font-semibold text-slate-700">{e.recipient || 'New recipient'}</span>
                                        </button>
                                        <div className="flex shrink-0 items-center gap-1">
                                            {on && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-600">Previewing</span>}
                                            <button type="button" onClick={() => remove(e.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Remove">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-3 p-3">
                                        <Labeled label="Recipient name">
                                            <input value={e.recipient} onChange={(ev) => patch(e.id, { recipient: ev.target.value })} placeholder="e.g. Amarjeet Rozra" className={INPUT} />
                                        </Labeled>
                                        <Labeled label="Training / module name">
                                            <input value={e.module} onChange={(ev) => patch(e.id, { module: ev.target.value })} placeholder="e.g. Winter Driving" className={INPUT} />
                                        </Labeled>
                                        <Labeled label="Completion date">
                                            <input type="date" value={e.date} onChange={(ev) => patch(e.id, { date: ev.target.value })} className={INPUT} />
                                        </Labeled>
                                        <Labeled label="Upload recipient's certificate (optional)">
                                            <label className={cn('flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed px-3 py-2 text-[12px] transition-colors',
                                                e.fileName ? 'border-emerald-300 bg-emerald-50/40 text-emerald-700' : 'border-slate-300 bg-slate-50/40 text-slate-500 hover:border-blue-300 hover:text-blue-700')}>
                                                {e.fileName ? <Check size={14} /> : <UploadCloud size={15} />}
                                                <span className="truncate font-medium">{e.fileName || 'Upload certificate (PDF / image)…'}</span>
                                                <input type="file" className="hidden" onChange={(ev) => patch(e.id, { fileName: ev.target.files?.[0]?.name ?? '' })} />
                                            </label>
                                        </Labeled>
                                        {!on && (
                                            <button type="button" onClick={() => setActiveId(e.id)} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 hover:text-blue-700">
                                                <Eye size={13} /> Preview this certificate
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Live preview ───────────────────────────── */}
                    <div className="space-y-3">
                        <p className="text-[12px] font-bold uppercase tracking-wide text-slate-500">Live preview</p>
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-200/60 p-4 shadow-inner">
                            <div className="mx-auto" style={{ width: 960 }}>
                                <Certificate
                                    innerRef={captureRef}
                                    entry={active}
                                    logo={branding.logoDataUrl}
                                    name={branding.name}
                                    address={branding.address}
                                    accent={accent}
                                />
                            </div>
                        </div>
                        <p className="text-[12px] text-slate-400">
                            The logo, company name and address come from your company branding and update automatically. Use <span className="font-semibold text-slate-600">Download PDF</span> to export the previewed certificate (landscape, letter).
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

const INPUT = 'h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</label>
            {children}
        </div>
    );
}

/** The branded certificate artwork — fixed 960×742 (landscape letter ratio). */
function Certificate({ innerRef, entry, logo, name, address, accent }: {
    innerRef: React.Ref<HTMLDivElement>;
    entry: CertEntry;
    logo?: string;
    name: string;
    address?: string;
    accent: string;
}) {
    const addressLines = (address || '').split(/\s*·\s*|\n/).filter(Boolean);
    const ver = `ver-${(entry.date || '').replace(/-/g, '') || '00000000'}-${entry.id.slice(-6)}`;
    return (
        <div ref={innerRef} style={{ width: 960, height: 742 }} className="relative overflow-hidden bg-white">
            {/* Decorative double frame */}
            <div className="pointer-events-none absolute inset-3 rounded-sm border-[3px]" style={{ borderColor: FRAME }} />
            <div className="pointer-events-none absolute inset-[18px] rounded-sm border" style={{ borderColor: accent }} />
            {/* Corner accents */}
            {[['left-3 top-3', 'border-l-[6px] border-t-[6px]'], ['right-3 top-3', 'border-r-[6px] border-t-[6px]'], ['left-3 bottom-3', 'border-l-[6px] border-b-[6px]'], ['right-3 bottom-3', 'border-r-[6px] border-b-[6px]']].map(([pos, b], i) => (
                <span key={i} className={cn('pointer-events-none absolute h-10 w-10 rounded-sm', pos, b)} style={{ borderColor: FRAME }} />
            ))}

            {/* Background arc watermark */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 960 742" fill="none" preserveAspectRatio="xMidYMid slice">
                <path d="M120 700 C 380 260, 720 180, 980 60" stroke="#eef0f6" strokeWidth="120" fill="none" strokeLinecap="round" />
                <path d="M40 720 C 360 320, 700 240, 1000 120" stroke="#f4f5fa" strokeWidth="90" fill="none" strokeLinecap="round" />
            </svg>

            {/* Logo + address (top-left) */}
            <div className="absolute left-12 top-11">
                {logo
                    ? <img src={logo} alt="" crossOrigin="anonymous" className="max-h-14 max-w-[200px] object-contain" />
                    : <div className="text-[26px] font-extrabold leading-none" style={{ color: accent }}>{name}</div>}
                {addressLines.length > 0 && (
                    <div className="mt-3 space-y-0.5 text-[12px] leading-snug text-slate-500">
                        {addressLines.map((l, i) => <p key={i}>{l}</p>)}
                    </div>
                )}
            </div>

            {/* Center content */}
            <div className="absolute inset-x-0 top-[30%] flex flex-col items-center px-20 text-center">
                <p className="text-[22px] font-light text-slate-500">This is to certify that</p>
                <h2 className="mt-4 text-[46px] font-extrabold leading-tight tracking-tight" style={{ color: FRAME }}>{entry.recipient || '—'}</h2>
                <p className="mt-5 text-[20px] font-light text-slate-500">has successfully completed</p>
                <h3 className="mt-2 max-w-[760px] text-[32px] font-extrabold leading-tight text-slate-800">{entry.module || '—'}</h3>
                <p className="mt-5 text-[18px] font-light text-slate-500">on {entry.date || '—'}</p>
            </div>

            {/* Watermark */}
            <p className="absolute inset-x-0 bottom-[15%] text-center text-[22px] font-semibold italic tracking-wide text-slate-200">
                Module Completion Certificate
            </p>

            {/* Footer */}
            <div className="absolute inset-x-12 bottom-8 flex items-end justify-between border-t border-slate-200 pt-2.5 text-[9px] text-slate-400">
                <span className="max-w-[640px] truncate">{[name, address].filter(Boolean).join(' · ')}</span>
                <span className="shrink-0">{ver}{entry.recipient ? ` · ${entry.recipient}` : ''}</span>
            </div>
        </div>
    );
}

export default TrainingCertificateForm;
