import { useMemo, useRef, useState } from 'react';
import {
    ArrowLeft, Save, Download, Check, X, UploadCloud, FileText, ClipboardCheck,
    ListChecks, Award, Eye, ChevronLeft, Printer, Sparkles, CreditCard, FileCheck2,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { cn } from '@/lib/utils';
import { useCompanyBranding } from './company-branding.data';
import type { CompanyBranding } from './company-branding.data';
import { generateApplicationFormPdf } from './generateApplicationFormPdf';
import { PDF_TEMPLATES } from './ApplicationFormPrint';
import { SignaturePad } from './SignaturePad';
import { FileDropZone } from '@/components/compliance/FileDropZone';
import { ComplianceUploadModal } from '@/components/compliance/ComplianceUploadModal';
import type { UploadedDocument } from '@/types/key-numbers.types';
import type { ApplicationFormDef, FormField } from './application-forms.data';
import type { FieldValue } from './CustomFormWizard';
import { usePrefill } from '../hiring-process/application-prefill';

const CERT_FRAME = '#33337a'; // navy/indigo certificate frame (matches the branded certificate module)

// The three §391.33 fulfilment methods (moved above the certification, drive what's shown).
const METHOD_META: Record<string, { Icon: typeof Award; blurb: string }> = {
    'Road test conducted (§391.31)': { Icon: Award, blurb: 'Conduct the test and issue the §391.31 Certification of Road Test below.' },
    'License accepted as equivalent': { Icon: CreditCard, blurb: 'Accept a valid CDL as the equivalent — select the licence on file or upload a copy (§391.33(a)(1)).' },
    'Prior certificate accepted as equivalent': { Icon: FileCheck2, blurb: 'Accept a prior road-test certificate from the last 3 years — upload a copy (§391.33(a)(2)).' },
};

/** Performance rating scale shown at the top of the evaluation. */
const RATING_SCALE = [
    { n: 1, label: 'Needs Improvement', desc: 'Requires full assistance · minimal progress' },
    { n: 2, label: 'Fair', desc: 'Some ability with instructor assistance · slow progress' },
    { n: 3, label: 'Good', desc: 'Able with very little assistance · good progress' },
    { n: 4, label: 'Very Good', desc: 'No assistance required · independent' },
    { n: 5, label: 'Excellent', desc: 'Exceeds expectations · confident and skilled' },
];

const SCALE_TONE = ['', 'bg-rose-50 text-rose-600 border-rose-200', 'bg-amber-50 text-amber-600 border-amber-200', 'bg-sky-50 text-sky-600 border-sky-200', 'bg-blue-50 text-blue-600 border-blue-200', 'bg-emerald-50 text-emerald-600 border-emerald-200'];

const splitHeading = (label: string) => {
    const m = label.match(/^(Part\s*\d+)\s*[—-]\s*(.*)$/i);
    return m ? { num: m[1].replace(/Part\s*/i, ''), title: m[2] } : { num: '', title: label };
};

/**
 * Road Test Evaluation — a dedicated, paper-faithful renderer for the FMCSA
 * §391.31 Record of Road Test (id `form-ats-road-test`), with the 1–5 rating
 * scale, live per-section scores, and a Final Score / pass mark. Reads from the
 * shared form definition so Download PDF / Submit reuse the same values.
 */
type SubmitDoc = { label: string; fileName?: string; kind: string };
export function RoadTestForm({ appForm, onClose, onSubmit, onSaveValues, initialValues, embedded, reviewerNote }: { appForm: ApplicationFormDef; onClose: () => void; onSubmit?: (info?: { method?: string; docs?: SubmitDoc[]; values?: Record<string, unknown> }) => void; onSaveValues?: (values: Record<string, unknown>) => void; initialValues?: Record<string, unknown>; embedded?: boolean; reviewerNote?: { examiner: string; driver: string } }) {
    const [branding] = useCompanyBranding();
    const pf = usePrefill();   // driver's application data (licences) when opened from the hiring process
    const [values, setValues] = useState<Record<string, unknown>>(initialValues ?? {});
    const [downloading, setDownloading] = useState(false);
    const [preview, setPreview] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [pdfVariant, setPdfVariant] = useState<string>(PDF_TEMPLATES[0]?.id ?? 'standard');
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const certRef = useRef<HTMLDivElement>(null);
    const [certDownloading, setCertDownloading] = useState(false);
    const [licUploadOpen, setLicUploadOpen] = useState(false);
    const accent = branding.accentColor;

    const set = (id: string, v: unknown) => setValues((s) => ({ ...s, [id]: v }));
    const str = (id: string) => (typeof values[id] === 'string' ? (values[id] as string) : '');
    const arr = (id: string) => (Array.isArray(values[id]) ? (values[id] as string[]) : []);
    const toggle = (id: string, opt: string) => {
        const cur = arr(id);
        set(id, cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt]);
    };
    // Satisfactory (✓) lives in values[id]; unsatisfactory (✗) in values[id__x]. Mutually exclusive.
    const xKey = (id: string) => `${id}__x`;
    const xArr = (id: string) => (Array.isArray(values[xKey(id)]) ? (values[xKey(id)] as string[]) : []);
    const stateOf = (id: string, opt: string): 'sat' | 'unsat' | null =>
        arr(id).includes(opt) ? 'sat' : xArr(id).includes(opt) ? 'unsat' : null;
    const mark = (id: string, opt: string, state: 'sat' | 'unsat' | null) => {
        const sat = arr(id).filter((x) => x !== opt);
        const unsat = xArr(id).filter((x) => x !== opt);
        if (state === 'sat') sat.push(opt);
        else if (state === 'unsat') unsat.push(opt);
        set(id, sat);
        set(xKey(id), unsat);
    };
    const markAll = (id: string, opts: string[], on: boolean) => {
        set(id, on ? [...opts] : []);
        set(xKey(id), []);
    };

    // Headings whose content folds into the PREVIOUS section as a sub-heading
    // (rather than starting a new card).
    const MERGE_INTO_PREVIOUS = useMemo(() => new Set<string>(), []);

    // Split fields into the pre-heading driver block + one section per heading.
    const { header, sections } = useMemo(() => {
        const header: FormField[] = [];
        const sections: { heading: FormField; fields: FormField[] }[] = [];
        let cur: { heading: FormField; fields: FormField[] } | null = null;
        for (const f of appForm.fields) {
            if (f.type === 'heading') {
                if (cur && MERGE_INTO_PREVIOUS.has(f.id)) { cur.fields.push(f); continue; }
                cur = { heading: f, fields: [] };
                sections.push(cur);
            } else if (cur) cur.fields.push(f);
            else header.push(f);
        }
        return { header, sections };
    }, [appForm.fields, MERGE_INTO_PREVIOUS]);

    const checklistsOf = (sec: { fields: FormField[] }) => sec.fields.filter((f) => f.type === 'checklist' && f.id !== 'f-ats-rt-qualified');

    // Scoring is a MANUAL 1–5 examiner rating per evaluation section (f-ats-rt-ev*-score).
    const scoreFieldOf = (s: { fields: FormField[] }) => s.fields.find((f) => /^f-ats-rt-ev\d-score$/.test(f.id));
    const isEval = (s: { fields: FormField[] }) => !!scoreFieldOf(s);
    const secScore = (s: { fields: FormField[] }) => {
        const sf = scoreFieldOf(s);
        const v = sf ? Number(values[sf.id]) : 0;
        return Number.isFinite(v) ? Math.min(5, Math.max(0, v)) : 0;
    };
    const scored = sections.filter(isEval);
    // Certification + §391.33 equivalent are rendered separately, below a method
    // selector, so the three method options sit ABOVE the certification.
    const certSec = sections.find((s) => s.heading.id === 'f-ats-rt-cert-head');
    const equivSec = sections.find((s) => s.heading.id === 'f-ats-rt-equiv-head');
    const flowSections = sections.filter((s) => s !== certSec && s !== equivSec);
    const finalScore = scored.reduce((n, s) => n + secScore(s), 0);
    const maxScore = scored.length * 5;
    const passMark = Math.ceil(maxScore * 0.8);
    const passed = maxScore > 0 && finalScore >= passMark;

    const evalItemsTotal = scored.reduce((n, s) => n + checklistsOf(s).reduce((a, f) => a + f.options.length, 0), 0);
    const evalItemsChecked = scored.reduce((n, s) => n + checklistsOf(s).reduce((a, f) => a + arr(f.id).length, 0), 0);
    const pct = maxScore > 0 ? Math.round((finalScore / maxScore) * 100) : 0;

    const makePdf = async (variant: string, mode: 'download' | 'view') => {
        if (downloading) return;
        setDownloading(true);
        try { await generateApplicationFormPdf({ form: appForm, branding, values: values as Record<string, FieldValue>, variant: variant as never, mode }); }
        finally { setDownloading(false); }
    };

    // Inline themed PDF preview (matches the other hiring-process forms).
    const openPreview = async (variant: string) => {
        if (downloading) return;
        setDownloading(true);
        try {
            const url = await generateApplicationFormPdf({ form: appForm, branding, values: values as Record<string, FieldValue>, variant: variant as never, mode: 'blob' });
            if (typeof url === 'string') { setPreviewUrl(url); setPdfVariant(variant); setPreview(true); }
        } finally { setDownloading(false); }
    };

    // Export the branded Certificate of Road Test as a print-ready landscape PDF.
    const downloadCertificate = async () => {
        const node = certRef.current;
        if (!node || certDownloading) return;
        setCertDownloading(true);
        try {
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
            const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
            const img = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
            const w = pdf.internal.pageSize.getWidth();
            const h = pdf.internal.pageSize.getHeight();
            pdf.addImage(img, 'JPEG', 0, 0, w, h, undefined, 'FAST');
            const safe = `${str('f-ats-rt-cert-driver') || 'driver'}-road-test`.replace(/[\\/:*?"<>|]+/g, '-');
            pdf.save(`certificate-${safe}.pdf`);
        } finally { setCertDownloading(false); }
    };

    // Summary of what the examiner produced — fed back to the hiring file on submit.
    const buildSubmitInfo = (): { method?: string; docs?: SubmitDoc[]; values?: Record<string, unknown> } => {
        const method = str('f-ats-rt-equiv-method') || equivSec?.fields.find((f) => f.id === 'f-ats-rt-equiv-method')?.options?.[0] || '';
        const docs: SubmitDoc[] = [];
        if (method === 'License accepted as equivalent') {
            const licDocs = (Array.isArray(values['f-ats-rt-lic-docs']) ? values['f-ats-rt-lic-docs'] : []) as UploadedDocument[];
            licDocs.forEach((d) => docs.push({ label: `Licence — ${d.slotLabel ?? 'copy'}`, fileName: d.fileName, kind: 'license' }));
            const sel = str('f-ats-rt-equiv-license');
            if (sel && licDocs.length === 0) docs.push({ label: `Licence on file: ${sel}`, kind: 'license' });
        } else if (method === 'Prior certificate accepted as equivalent') {
            if (str('f-ats-rt-equiv-doc')) docs.push({ label: 'Prior road-test certificate', fileName: str('f-ats-rt-equiv-doc'), kind: 'document' });
        } else {
            docs.push({ label: 'Certificate of Road Test (§391.31)', kind: 'certificate' });
        }
        arr('f-ats-rt-additional-docs').forEach((n) => docs.push({ label: 'Additional document', fileName: n, kind: 'additional' }));
        return { method, docs, values };
    };

    // Closing without submitting saves a draft so the filled form can be viewed/continued.
    const handleClose = () => { if (Object.keys(values).length > 0) onSaveValues?.(values); onClose(); };
    const saveDraft = () => { onSaveValues?.(values); window.alert('Draft saved.'); onClose(); };

    const fillSample = () => {
        const sampleText = (label: string) => {
            const l = label.toLowerCase();
            if (l.includes('name')) return 'Kenan Gain';
            if (l.includes('address')) return '18 Maple Ridge Rd, Springfield, IL 62704';
            if (l.includes('social') || l.includes('ssn')) return '***-**-4471';
            if (l.includes('license')) return 'D1234-5678-90';
            if (l.includes('class')) return 'Class A';
            if (l.includes('state') || l.includes('province')) return 'Illinois';
            if (l.includes('tractor') || l.includes('truck')) return 'Freightliner Cascadia';
            if (l.includes('trailer')) return "53' Dry Van";
            if (l.includes('length')) return '90 minutes';
            if (l.includes('weather')) return 'Clear, dry';
            if (l.includes('miles to')) return 'Springfield Yard';
            if (l.includes('miles')) return 'Terminal A';
            if (l.includes('finish time')) return '10:30';
            if (l.includes('time')) return '09:00';
            if (l.includes('title')) return 'Examiner';
            return 'Sample';
        };
        const next: Record<string, unknown> = {};
        for (const f of appForm.fields) {
            if (/^f-ats-rt-ev\d-score$/.test(f.id)) next[f.id] = 4;
            else if (f.type === 'checklist') next[f.id] = [...(f.options ?? [])];
            else if (f.type === 'select' || f.type === 'radio') next[f.id] = f.options?.[0] ?? '';
            else if (f.type === 'date') next[f.id] = '2026-06-09';
            else if (f.type === 'number') next[f.id] = '4';
            else if (f.type === 'text' || f.type === 'textarea') next[f.id] = sampleText(f.label || '');
        }
        setValues(next);
    };

    // Record-of-Road-Test Parts (pure-checklist, non-scored) go in a bento masonry
    // grid; everything else (group banners, scored evaluation, certification,
    // equivalent) renders full width in document order.
    const isBentoSec = (sec: { heading: FormField; fields: FormField[] }) =>
        sec.fields.length > 0
        && sec.heading.id !== 'f-ats-rt-cert-head'
        && checklistsOf(sec).length > 0
        && !isEval(sec)
        && sec.fields.every((f) => f.type === 'checklist' || ['heading', 'paragraph', 'bullet-list', 'alert'].includes(f.type));

    const blocks: { bento: boolean; secs: typeof sections }[] = [];
    {
        let buf: typeof sections = [];
        const flush = () => { if (buf.length) { blocks.push({ bento: true, secs: buf }); buf = []; } };
        for (const sec of flowSections) {
            if (isBentoSec(sec)) buf.push(sec);
            else { flush(); blocks.push({ bento: false, secs: [sec] }); }
        }
        flush();
    }

    // Compact checklist card used inside the bento grid (Record of Road Test parts).
    const renderBentoCard = (sec: { heading: FormField; fields: FormField[] }) => {
        const { num, title } = splitHeading(sec.heading.label);
        const cls = checklistsOf(sec);
        const total = cls.reduce((a, f) => a + f.options.length, 0);
        const sat = cls.reduce((a, f) => a + arr(f.id).length, 0);
        const unsat = cls.reduce((a, f) => a + xArr(f.id).length, 0);
        const cardPct = total > 0 ? ((sat + unsat) / total) * 100 : 0;
        return (
            <section key={sec.heading.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-2.5">
                            {num && <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[12px] font-bold text-white">{num}</span>}
                            <h3 className="text-[13.5px] font-bold leading-tight text-slate-900">{title}</h3>
                        </div>
                        <span className="flex shrink-0 items-center gap-2 text-[11px] font-bold tabular-nums">
                            <span className="text-emerald-600">✓ {sat}</span>
                            <span className="text-rose-500">✗ {unsat}</span>
                            <span className="text-slate-400">/ {total}</span>
                        </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                        <div className="h-full rounded-full bg-blue-500 transition-all duration-300" style={{ width: `${cardPct}%` }} />
                    </div>
                </div>
                <div className="space-y-3.5 p-4">
                    {cls.map((f) => <Checklist key={f.id} field={f} getState={(o) => stateOf(f.id, o)} onMark={(o, s) => mark(f.id, o, s)} onAll={(on) => markAll(f.id, f.options, on)} />)}
                </div>
            </section>
        );
    };

    // Full-width section (banner, scored evaluation, certification, mixed).
    const renderFull = (sec: { heading: FormField; fields: FormField[] }) => {
        if (sec.fields.length === 0) {
            return (
                <div key={sec.heading.id} className="flex items-center gap-3 pt-2">
                    <span className="h-6 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
                    <div>
                        <h2 className="text-[16px] font-bold tracking-tight text-slate-900">{sec.heading.label}</h2>
                        {sec.heading.instruction && <p className="text-[12px] text-slate-500">{sec.heading.instruction}</p>}
                    </div>
                </div>
            );
        }
        const { num, title } = splitHeading(sec.heading.label);
        const sf = scoreFieldOf(sec);
        const rating = sf ? <RatingStepper value={secScore(sec)} onChange={(v) => set(sf.id, v ? String(v) : '')} /> : undefined;
        if (sec.heading.id === 'f-ats-rt-cert-head') {
            return (
                <section key={sec.heading.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <SectionHeader num={num} title={title} accent={accent} />
                    <CertificationBlock get={str} set={set} />
                </section>
            );
        }
        // Scored evaluation section — manoeuvres render as bento sub-cards.
        if (isEval(sec)) {
            const cls = checklistsOf(sec);
            return (
                <section key={sec.heading.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <SectionHeader num={num} title={title} instruction={sec.heading.instruction} accent={accent} right={rating} />
                    <div className={cn('grid items-start gap-4 p-4',
                        cls.length >= 3 ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
                            : cls.length === 2 ? 'grid-cols-1 lg:grid-cols-2'
                                : 'grid-cols-1')}>
                        {cls.map((f) => (
                            <Checklist key={f.id} field={f} getState={(o) => stateOf(f.id, o)} onMark={(o, s) => mark(f.id, o, s)} onAll={(on) => markAll(f.id, f.options, on)} card />
                        ))}
                    </div>
                </section>
            );
        }
        return (
            <section key={sec.heading.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <SectionHeader num={num} title={title} instruction={sec.heading.instruction} accent={accent} right={rating} />
                <div className="grid grid-cols-1 gap-x-5 gap-y-4 p-5 sm:grid-cols-2">
                    {sec.fields.map((f) => {
                        if (sf && f.id === sf.id) return null; // score field is rendered in the header
                        if (f.type === 'heading') {
                            return (
                                <div key={f.id} className="mt-3 border-t border-slate-200 pt-4 sm:col-span-2">
                                    <h4 className="text-[14px] font-bold text-slate-900">{f.label}</h4>
                                    {f.instruction && <p className="mt-0.5 text-[12px] text-slate-500">{f.instruction}</p>}
                                </div>
                            );
                        }
                        if (f.type === 'checklist') {
                            return (
                                <div key={f.id} className="sm:col-span-2">
                                    {f.id === 'f-ats-rt-qualified'
                                        ? <ChecklistInline field={f} checked={arr(f.id)} onToggle={(o) => toggle(f.id, o)} />
                                        : <Checklist field={f} getState={(o) => stateOf(f.id, o)} onMark={(o, s) => mark(f.id, o, s)} onAll={(on) => markAll(f.id, f.options, on)} />}
                                </div>
                            );
                        }
                        const half = (f.type === 'text' || f.type === 'number' || f.type === 'date') && f.width === 'half';
                        return <Field key={f.id} field={f} value={str(f.id)} onChange={(v) => set(f.id, v)} wide={!half} />;
                    })}
                </div>
            </section>
        );
    };

    // ── Fulfilment (§391.33) — the three method options sit ABOVE the certification
    //    and drive what's shown: issue certificate · accept licence · prior certificate. ──
    const renderFulfilment = () => {
        const methodField = equivSec?.fields.find((f) => f.id === 'f-ats-rt-equiv-method');
        const options = methodField?.options ?? [];
        const docField = equivSec?.fields.find((f) => f.id === 'f-ats-rt-equiv-doc');
        const paras = equivSec?.fields.filter((f) => f.type === 'paragraph') ?? [];
        const method = str('f-ats-rt-equiv-method') || options[0] || '';
        const licenses = pf?.licenses ?? [];
        const selectedLic = str('f-ats-rt-equiv-license');
        const context = (text?: string) => text
            ? <p className="whitespace-pre-line rounded-lg bg-slate-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-slate-500">{text}</p>
            : null;
        const certField = (label: string, id: string, type = 'text') => (
            <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</label>
                <input type={type} value={str(id)} onChange={(e) => set(id, e.target.value)} className={INPUT} />
            </div>
        );
        const docUpload = (id: string) => (
            <FileDropZone compact files={str(id) ? [{ id, fileName: str(id) }] : []}
                onAdd={(list) => { const f = list?.[0]; if (f) set(id, f.name); }} onRemove={() => set(id, '')} />
        );
        const addlDocs = arr('f-ats-rt-additional-docs');
        const licDocs = (Array.isArray(values['f-ats-rt-lic-docs']) ? values['f-ats-rt-lic-docs'] : []) as UploadedDocument[];
        const licDetail = licDocs[0];
        return (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <SectionHeader num="" title="Road Test Fulfilment (§391.33)" instruction="Choose how the §391.31 road-test requirement is satisfied — this drives what you complete below." accent={accent} />
                <div className="space-y-5 p-4 sm:p-5">
                    {/* The three significant method options */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {options.map((opt) => {
                            const m = METHOD_META[opt];
                            const Icon = m?.Icon ?? ClipboardCheck;
                            const active = method === opt;
                            return (
                                <button key={opt} type="button" onClick={() => set('f-ats-rt-equiv-method', opt)}
                                    className={cn('flex flex-col rounded-xl border p-3.5 text-left transition', active ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/20' : 'border-slate-200 bg-white hover:bg-slate-50')}>
                                    <span className="flex items-center gap-2">
                                        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500')}><Icon size={16} /></span>
                                        <span className="flex-1 text-[13px] font-bold leading-tight text-slate-800">{opt}</span>
                                        {active && <Check size={15} className="shrink-0 text-blue-600" />}
                                    </span>
                                    {m?.blurb && <span className="mt-2 text-xs leading-relaxed text-slate-500">{m.blurb}</span>}
                                </button>
                            );
                        })}
                    </div>

                    {/* Issue certificate → branded Certificate of Road Test (watermark + branding) + examiner sign-off */}
                    {method === 'Road test conducted (§391.31)' && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-3">
                                {certField("Driver's name", 'f-ats-rt-cert-driver')}
                                {certField('Date of road test', 'f-ats-rt-cert-date', 'date')}
                                {certField('Approx. miles driven', 'f-ats-rt-approx-miles', 'number')}
                                {certField('Type of power unit', 'f-ats-rt-power-unit')}
                                {certField('Type of trailer(s)', 'f-ats-rt-trailer-type')}
                                {certField('If passenger carrier, type of bus', 'f-ats-rt-bus-type')}
                            </div>

                            {/* Branded certificate preview (watermark + branding) */}
                            <div>
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Certificate preview</p>
                                    <button type="button" disabled={certDownloading} onClick={downloadCertificate}
                                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-bold text-white shadow-sm disabled:opacity-60" style={{ backgroundColor: accent }}>
                                        <Download size={13} /> {certDownloading ? 'Generating…' : 'Download PDF'}
                                    </button>
                                </div>
                                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-200/60 p-3 shadow-inner">
                                    <div className="mx-auto" style={{ width: 960 }}>
                                        <RoadTestCertificate innerRef={certRef} branding={branding}
                                            driver={str('f-ats-rt-cert-driver')} date={str('f-ats-rt-cert-date')} miles={str('f-ats-rt-approx-miles')}
                                            powerUnit={str('f-ats-rt-power-unit')} trailer={str('f-ats-rt-trailer-type')}
                                            examiner={str('f-ats-rt-examiner')} title={str('f-ats-rt-examiner-title')}
                                            examinerDate={str('f-ats-rt-examiner-date') || str('f-ats-rt-cert-date')} sig={str('f-ats-rt-sign')} />
                                    </div>
                                </div>
                                <p className="mt-2 text-[12px] text-slate-400">Logo, company name and address come from your company branding. Download exports a print-ready landscape PDF.</p>
                            </div>
                        </div>
                    )}

                    {/* Licence accepted as equivalent → select from the application OR upload a copy */}
                    {method === 'License accepted as equivalent' && (
                        <div className="space-y-4">
                            {context(paras[0]?.instruction)}
                            {licenses.length > 0 && (
                                <div>
                                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Select the licence on file (from the application)</p>
                                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                        {licenses.map((l, i) => {
                                            const id = l.number || `licence-${i + 1}`;
                                            const on = selectedLic === id;
                                            return (
                                                <button key={id} type="button" onClick={() => set('f-ats-rt-equiv-license', on ? '' : id)}
                                                    className={cn('flex items-start gap-3 rounded-xl border p-3 text-left transition', on ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/20' : 'border-slate-200 bg-white hover:bg-slate-50')}>
                                                    <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', on ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500')}><CreditCard size={16} /></span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-[13px] font-bold text-slate-800">{l.number || `Licence ${i + 1}`}</span>
                                                        <span className="block truncate text-xs text-slate-500">{[l.cls, l.authority, l.exp ? `exp ${l.exp}` : ''].filter(Boolean).join(' · ')}</span>
                                                    </span>
                                                    {on && <Check size={16} className="mt-0.5 shrink-0 text-blue-600" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="my-3 flex items-center gap-3">
                                        <div className="h-px flex-1 bg-slate-200" />
                                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">licence details &amp; copy</span>
                                        <div className="h-px flex-1 bg-slate-200" />
                                    </div>
                                </div>
                            )}
                            {/* Front / back images + issue, expiry, state & country — via the shared compliance upload module */}
                            <div className="rounded-xl border border-slate-200 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Licence copy &amp; details</p>
                                        <p className="text-xs text-slate-500">Front &amp; back images, issue date, expiry date, issuing state and country.</p>
                                    </div>
                                    <button type="button" onClick={() => setLicUploadOpen(true)}
                                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
                                        <UploadCloud size={15} /> {licDocs.length ? 'Edit licence upload' : 'Upload licence'}
                                    </button>
                                </div>
                                {licDocs.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {licDocs.map((d) => (
                                            <div key={d.id} className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-[13px]">
                                                <Check size={14} className="shrink-0 text-emerald-600" />
                                                <span className="min-w-0 truncate font-medium text-slate-800">{d.slotLabel ? `${d.slotLabel}: ` : ''}{d.fileName}</span>
                                            </div>
                                        ))}
                                        {licDetail && (
                                            <p className="text-xs text-slate-500">{[licDetail.issuingState, licDetail.issuingCountry, licDetail.issueDate ? `issued ${licDetail.issueDate}` : '', licDetail.expiryDate ? `expires ${licDetail.expiryDate}` : ''].filter(Boolean).join(' · ')}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                            <ComplianceUploadModal
                                isOpen={licUploadOpen}
                                onClose={() => setLicUploadOpen(false)}
                                title="Driver's Licence — accepted as road-test equivalent (§391.33)"
                                numberOfSlots={2}
                                slotLabels={['Front', 'Back']}
                                issueDateRequired
                                expiryRequired
                                issueStateRequired
                                issueCountryRequired
                                existing={licDocs}
                                onSave={(docs) => set('f-ats-rt-lic-docs', docs)}
                            />
                        </div>
                    )}

                    {/* Prior certificate accepted → upload a supporting document */}
                    {method === 'Prior certificate accepted as equivalent' && (
                        <div className="space-y-4">
                            {context(paras[1]?.instruction)}
                            {docField && (
                                <div>
                                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Prior road-test certificate copy</p>
                                    {docUpload(docField.id)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Additional supporting documents — applies to any method */}
                    <div className="rounded-xl border border-slate-200 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Additional supporting documents (optional)</p>
                        <p className="mb-2 mt-0.5 text-xs text-slate-500">Attach any extra records related to the road test — e.g. medical card, training certificate or a prior-employer letter.</p>
                        <FileDropZone compact multiple
                            files={addlDocs.map((n, i) => ({ id: `add-${i}`, fileName: n }))}
                            onAdd={(list) => { const names = Array.from(list ?? []).map((f) => f.name); if (names.length) set('f-ats-rt-additional-docs', [...addlDocs, ...names]); }}
                            onRemove={(rid) => { const idx = Number(rid.split('-')[1]); set('f-ats-rt-additional-docs', addlDocs.filter((_, i) => i !== idx)); }} />
                    </div>

                    {/* Examiner sign-off — always required to submit, whichever method was chosen */}
                    <div className="rounded-xl border border-slate-300 bg-slate-50/60 p-4" id="examiner-signoff">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Examiner certification &amp; sign-off <span className="text-rose-500">*</span></p>
                        <p className="mb-3 mt-0.5 text-xs text-slate-500">The examiner who conducted the road test signs below. Name and signature are required to submit.</p>
                        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-3">
                            {certField('Examiner name', 'f-ats-rt-examiner')}
                            {certField('Title', 'f-ats-rt-examiner-title')}
                            {certField('Date', 'f-ats-rt-examiner-date', 'date')}
                        </div>
                        <div className="mt-4">
                            <SignaturePad height={96} label="Signature of Examiner" value={str('f-ats-rt-sign') || null} onChange={(v) => set('f-ats-rt-sign', v ?? '')} helper="Draw the signature with your mouse or finger." />
                        </div>
                        <div className="mt-4">
                            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Organization &amp; address of examiner</label>
                            <textarea value={str('f-ats-rt-org')} onChange={(e) => set('f-ats-rt-org', e.target.value)} rows={2} className={cn(INPUT, 'h-auto resize-y py-2.5')} />
                        </div>
                    </div>
                </div>
            </section>
        );
    };

    return (
        <div className={cn(embedded ? "relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white" : "fixed inset-0 z-[60] flex flex-col bg-slate-100")}>
            {/* ── App bar ─────────────────────────────────────────────── */}
            <header className="z-20 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 sm:gap-4">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                        <button type="button" onClick={handleClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700" title="Back">
                            <ArrowLeft size={16} />
                        </button>
                        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm sm:flex" style={{ backgroundColor: accent }}>
                            {branding.logoDataUrl ? <img src={branding.logoDataUrl} alt="" className="max-h-7 max-w-7 object-contain" /> : <ClipboardCheck size={19} />}
                        </span>
                        <div className="min-w-0 leading-tight">
                            <h1 className="truncate text-[15px] font-bold text-slate-900 sm:text-[17px]">Road Test Evaluation</h1>
                            <p className="truncate text-[11px] text-slate-500">FMCSA §391.31 · {branding.name}</p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                        <button type="button" onClick={handleClose} className="hidden h-9 rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 sm:block">Cancel</button>
                        {reviewerNote ? (
                            <button type="button" onClick={saveDraft} title="Save as draft"
                                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 sm:px-3.5">
                                <Save size={14} /> <span className="hidden sm:inline">Save as Draft</span>
                            </button>
                        ) : (
                            <button type="button" onClick={fillSample} title="Fill sample data"
                                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 sm:px-3.5">
                                <Sparkles size={14} /> <span className="hidden sm:inline">Fill sample data</span>
                            </button>
                        )}
                        <button type="button" disabled={downloading} onClick={() => openPreview(pdfVariant)} title="PDF Preview"
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:px-3.5">
                            <Eye size={14} /> <span className="hidden sm:inline">{downloading ? 'Preparing…' : 'PDF Preview'}</span>
                        </button>
                        <button type="button" onClick={() => {
                                if (!str('f-ats-rt-examiner').trim() || !str('f-ats-rt-sign')) {
                                    window.alert('Add the examiner name and signature at the bottom of the form to submit.');
                                    document.getElementById('examiner-signoff')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    return;
                                }
                                onSubmit?.(buildSubmitInfo());
                                window.alert('Road test record saved.');
                                onClose();
                            }}
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-bold text-white shadow-sm sm:px-4" style={{ backgroundColor: accent }}>
                            <Save size={14} /> Submit
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Sticky score bar ────────────────────────────────────── */}
            <div className="z-10 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur sm:px-6">
                <div className="mx-auto flex max-w-6xl items-center gap-3 sm:gap-4">
                    <div className={cn('flex items-baseline gap-1 rounded-lg border px-3 py-1', passed ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50')}>
                        <span className={cn('text-xl font-bold tabular-nums leading-none', passed ? 'text-emerald-600' : 'text-slate-900')}>{finalScore}</span>
                        <span className="text-[13px] font-semibold text-slate-400">/ {maxScore}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-slate-500">
                            <span>Section ratings:{' '}
                                {scored.map((s, i) => (
                                    <span key={i} className="font-bold text-slate-700">{secScore(s) || '–'}{i < scored.length - 1 ? ' · ' : ''}</span>
                                ))}
                                <span className="ml-2 hidden text-slate-400 sm:inline">{evalItemsChecked}/{evalItemsTotal} items checked</span>
                            </span>
                            <span>{pct}% · pass {passMark}/{maxScore}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className={cn('h-full rounded-full transition-all duration-300', passed ? 'bg-emerald-500' : 'bg-blue-500')} style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                    <span className={cn('inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[12px] font-bold', passed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700')}>
                        {passed ? <><Award size={13} /> Pass</> : `Needs ${passMark}+`}
                    </span>
                </div>
            </div>

            {/* ── Body ────────────────────────────────────────────────── */}
            <div className={embedded ? "" : "flex-1 overflow-y-auto"}>
                <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-6">
                    {reviewerNote && (
                        <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-slate-600">
                            <ClipboardCheck className="h-4 w-4 shrink-0 text-blue-500" />
                            <span><span className="font-semibold text-slate-800">{reviewerNote.examiner}</span> opens this Road Test Evaluation for <span className="font-semibold text-slate-800">{reviewerNote.driver}</span> — scores each section, then certifies the result.</span>
                        </div>
                    )}
                    {/* Hero: title + rating scale (+ driver details only if any are pre-heading) */}
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="px-4 py-5 sm:px-6">
                            <h2 className="text-center text-xl font-bold tracking-tight text-slate-900">ROAD TEST EVALUATION</h2>
                            <p className="mx-auto mt-1 max-w-2xl text-center text-[12px] leading-relaxed text-slate-500">
                                Score each section out of 5. A minimum total of <span className="font-semibold text-slate-700">12 / 15</span> is required to pass.
                            </p>
                            {/* Rating scale pills */}
                            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                                {RATING_SCALE.map((r) => (
                                    <div key={r.n} className={cn('rounded-lg border px-2.5 py-2 text-center', SCALE_TONE[r.n])}>
                                        <div className="flex items-center justify-center gap-1.5">
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/70 text-[12px] font-bold">{r.n}</span>
                                            <span className="text-[12px] font-bold">{r.label}</span>
                                        </div>
                                        <p className="mt-1 text-[10px] leading-tight text-slate-500">{r.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {header.length > 0 && (
                            <div className="border-t border-slate-100 px-4 py-5 sm:px-6">
                                <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500"><FileText size={12} /> Driver & Equipment</p>
                                <div className="grid grid-cols-1 gap-x-5 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {header.map((f) => <Field key={f.id} field={f} value={str(f.id)} onChange={(v) => set(f.id, v)} />)}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sections — full-width in document order; Record-of-Road-Test parts
                        in a DYNAMIC bento: parts are distributed round-robin into columns so
                        they read 1·2·3 across the top (4·5·6 next), while each column stacks
                        independently — packing tight with no forced-row gaps or empty columns. */}
                    {blocks.map((blk, bi) => blk.bento ? <BentoGrid key={`bento-${bi}`} secs={blk.secs} render={renderBentoCard} /> : renderFull(blk.secs[0]))}

                    {/* Method selector + certification / equivalent (the three §391.33 options, above the certification) */}
                    {(certSec || equivSec) && renderFulfilment()}
                </div>
            </div>

            {/* ── Inline themed PDF preview ─────────────────────────────── */}
            {preview && previewUrl && (
                <div className="absolute inset-0 z-40 flex flex-col bg-slate-100">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
                        <button type="button" onClick={() => setPreview(false)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
                            <ChevronLeft className="h-4 w-4" /> Edit
                        </button>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                                {PDF_TEMPLATES.map((t) => (
                                    <button key={t.id} type="button" disabled={downloading} onClick={() => openPreview(t.id)}
                                        className={cn('rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60', pdfVariant === t.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white')}>{t.label}</button>
                                ))}
                            </div>
                            <button type="button" onClick={() => iframeRef.current?.contentWindow?.print()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"><Printer size={14} /> Print</button>
                            <button type="button" disabled={downloading} onClick={() => makePdf(pdfVariant, 'download')} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-bold text-white shadow-sm disabled:opacity-60" style={{ backgroundColor: accent }}><Download size={14} /> {downloading ? 'Generating…' : 'Download PDF'}</button>
                        </div>
                    </div>
                    <iframe ref={iframeRef} src={previewUrl} title="Road Test PDF preview" className="flex-1 w-full bg-slate-200" />
                </div>
            )}
        </div>
    );
}

// ── Dynamic bento — round-robin the parts into N columns so they read in order
//    (1·2·3 across the top, then 4·5·6) while each column stacks tight with no gaps. ──
type Sec = { heading: FormField; fields: FormField[] };
function BentoGrid({ secs, render }: { secs: Sec[]; render: (sec: Sec) => React.ReactNode }) {
    const colCount = Math.min(3, secs.length) || 1;
    const cols: Sec[][] = Array.from({ length: colCount }, () => []);
    secs.forEach((sec, i) => cols[i % colCount].push(sec));
    return (
        <div className={cn('grid items-start gap-5',
            colCount >= 3 ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                : colCount === 2 ? 'grid-cols-1 md:grid-cols-2'
                    : 'grid-cols-1')}>
            {cols.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-5">{col.map(render)}</div>
            ))}
        </div>
    );
}

// ── Section header (numbered + optional right slot, e.g. rating stepper) ──────
function SectionHeader({ num, title, instruction, accent, right }: { num: string; title: string; instruction?: string; accent: string; right?: React.ReactNode }) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
                {num && (
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold text-white" style={{ backgroundColor: accent }}>{num}</span>
                )}
                <div className="min-w-0">
                    <h3 className="text-[14px] font-bold leading-tight text-slate-900">{title}</h3>
                    {instruction && <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{instruction}</p>}
                </div>
            </div>
            {right}
        </div>
    );
}

// ── Manual 1–5 rating stepper (examiner score per section) ───────────────────
function RatingStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    return (
        <div className="flex shrink-0 items-center gap-1.5">
            <span className="mr-1 hidden text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:inline">Score</span>
            {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => onChange(value === n ? 0 : n)} title={`Rate ${n} / 5`}
                    className={cn('flex h-7 w-7 items-center justify-center rounded-md border text-[12px] font-bold transition-colors',
                        value === n
                            ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                            : value > n
                                ? 'border-blue-200 bg-blue-50 text-blue-500'
                                : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50')}>
                    {n}
                </button>
            ))}
            <span className="ml-0.5 text-[11px] font-semibold text-slate-400">/ 5</span>
        </div>
    );
}

// ── Certification of Road Test — faithful fill-in passage (§391.33) ──────────
const CERT_BLANK = 'min-w-0 border-0 border-b border-slate-300 bg-transparent px-1 py-0.5 text-[14px] text-slate-900 focus:border-blue-500 focus:outline-none';
const cap = (text: string, key?: string) => <span key={key} className="mt-0.5 block text-center text-[10px] italic text-slate-500">{text}</span>;

function CertificationBlock({ get, set }: { get: (id: string) => string; set: (id: string, v: unknown) => void }) {
    // Plain render helper (NOT a component) so inputs keep focus across keystrokes.
    const blank = (id: string, opts: { type?: string; placeholder?: string; className?: string } = {}) => (
        <input
            type={opts.type ?? 'text'}
            value={get(id)}
            onChange={(e) => set(id, e.target.value)}
            placeholder={opts.placeholder}
            className={cn(CERT_BLANK, opts.className)}
        />
    );

    return (
        <div className="px-6 py-8 sm:px-10">
            <div className="mx-auto max-w-3xl space-y-7 text-slate-800">
                {/* Driver's name */}
                <div className="flex items-baseline gap-3">
                    <span className="shrink-0 text-[14px] font-semibold">Driver's Name</span>
                    {blank('f-ats-rt-cert-driver', { className: 'flex-1' })}
                </div>

                {/* SSN · License · State (captions below) */}
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-[1fr_1.5fr_0.6fr]">
                    <div>{blank('f-ats-rt-cert-ssn', { className: 'w-full' })}{cap('(Social Security Number)')}</div>
                    <div>{blank('f-ats-rt-cert-license', { className: 'w-full' })}{cap("(Operator's or Chauffeur's License Number)")}</div>
                    <div>{blank('f-ats-rt-cert-state', { className: 'w-full' })}{cap('(State)')}</div>
                </div>

                {/* Power unit · Trailer */}
                <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                    <div className="flex items-baseline gap-3"><span className="shrink-0 text-[14px] font-semibold">Type of Power Unit</span>{blank('f-ats-rt-power-unit', { className: 'flex-1' })}</div>
                    <div className="flex items-baseline gap-3"><span className="shrink-0 text-[14px] font-semibold">Type of Trailer(s)</span>{blank('f-ats-rt-trailer-type', { className: 'flex-1' })}</div>
                </div>

                {/* Bus */}
                <div className="flex items-baseline gap-3">
                    <span className="shrink-0 text-[14px] font-semibold">If passenger carrier, type of bus</span>
                    {blank('f-ats-rt-bus-type', { className: 'flex-1' })}
                </div>

                {/* Certification passage with inline blanks */}
                <p className="border-t border-slate-100 pt-6 text-[14.5px] leading-[2.1]">
                    This is to certify that the above-named driver was given a road test under my supervision on{' '}
                    {blank('f-ats-rt-cert-date', { type: 'date', className: 'w-[148px] align-baseline' })}{' '}
                    consisting of approximately{' '}
                    {blank('f-ats-rt-approx-miles', { type: 'number', placeholder: '0', className: 'w-[64px] text-center align-baseline' })}{' '}
                    miles of driving. It is my considered opinion that this driver possesses sufficient driving skill to
                    operate safely the type of commercial motor vehicle listed above.
                </p>

                {/* Signature · Title — aligned on the same baseline like the paper form */}
                <div className="grid grid-cols-1 items-end gap-x-8 gap-y-6 pt-2 sm:grid-cols-2">
                    <SignaturePad height={92} label="Signature of Examiner" value={get('f-ats-rt-sign') || null} onChange={(v) => set('f-ats-rt-sign', v ?? '')} />
                    <div className="pb-1">
                        {blank('f-ats-rt-examiner-title', { className: 'w-full' })}
                        {cap('(Title)')}
                    </div>
                </div>

                {/* Organization & address */}
                <div className="pt-1">
                    <textarea value={get('f-ats-rt-org')} onChange={(e) => set('f-ats-rt-org', e.target.value)} rows={2}
                        className="w-full resize-y border-0 border-b border-slate-300 bg-transparent px-1 py-1 text-[14px] leading-relaxed text-slate-900 focus:border-blue-500 focus:outline-none" />
                    {cap('(Organization and Address of Examiner)')}
                </div>

                {/* Signed-record upload */}
                <label className={cn('flex cursor-pointer items-center gap-2.5 rounded-lg border-2 border-dashed px-4 py-3 text-[13px] transition-colors',
                    get('f-ats-rt-cert') ? 'border-emerald-300 bg-emerald-50/40 text-emerald-700' : 'border-slate-300 bg-slate-50/40 text-slate-500 hover:border-blue-300 hover:text-blue-700')}>
                    {get('f-ats-rt-cert') ? <Check size={15} /> : <UploadCloud size={16} />}
                    <span className="truncate font-medium">{get('f-ats-rt-cert') || 'Upload the signed Record / Certification of Road Test…'}</span>
                    <input type="file" className="hidden" onChange={(e) => set('f-ats-rt-cert', e.target.files?.[0]?.name ?? '')} />
                </label>
            </div>
        </div>
    );
}

// ── Inline multi-select (e.g. "Qualified For") ───────────────────────────────
function ChecklistInline({ field, checked, onToggle }: { field: FormField; checked: string[]; onToggle: (opt: string) => void }) {
    const showLabel = field.label && field.label !== 'Checklist';
    return (
        <div>
            {showLabel && <p className="mb-1.5 text-[12px] font-bold text-slate-700">{field.label}</p>}
            <div className="flex flex-wrap gap-2">
                {field.options.map((o) => {
                    const on = checked.includes(o);
                    return (
                        <button key={o} type="button" onClick={() => onToggle(o)}
                            className={cn('inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors',
                                on ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
                            {on && <Check size={12} strokeWidth={3} />} {o}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ── Checklist with ✓ / ✗ per item ────────────────────────────────────────────
// Understands the road-test data shape: group rows ("1) Start the coupling task:")
// render bold, lettered sub-steps ("a) …") indent, and the field instruction is a
// highlighted criteria note (e.g. the manoeuvre-space rules). Each row can be
// marked Satisfactory (✓ green) or Unsatisfactory (✗ red).
function Checklist({ field, getState, onMark, onAll, card }: {
    field: FormField;
    getState: (opt: string) => 'sat' | 'unsat' | null;
    onMark: (opt: string, state: 'sat' | 'unsat' | null) => void;
    onAll: (on: boolean) => void;
    card?: boolean;
}) {
    const showLabel = field.label && field.label !== 'Checklist';
    const allOn = field.options.length > 0 && field.options.every((o) => getState(o) === 'sat');

    const allBtn = (
        <button type="button" onClick={() => onAll(!allOn)} className="text-[10px] font-bold uppercase tracking-wide text-slate-400 hover:text-blue-600">
            {allOn ? 'Clear' : 'All ✓'}
        </button>
    );

    const items = (
        <ul className="overflow-hidden rounded-lg border border-slate-100">
            {field.options.map((o, i) => {
                const st = getState(o);
                const t = o.trim();
                const isGroup = /:$/.test(t);                 // "1) Start the coupling task:"
                const isSub = /^[a-z]\)/.test(t);             // "a) …", "b) …"
                return (
                    <li key={o} className={cn('flex items-start gap-2 px-3 py-1.5', i > 0 && 'border-t border-slate-50',
                        isSub && 'pl-7', isGroup && 'bg-slate-50/70',
                        st === 'sat' && 'bg-emerald-50/60', st === 'unsat' && 'bg-rose-50/60')}>
                        <span className={cn('flex-1 pt-1 text-[12.5px] leading-snug',
                            isGroup ? 'font-bold text-slate-800' : st ? 'font-medium text-slate-800' : 'text-slate-600')}>{o}</span>
                        <div className="flex shrink-0 gap-1 pt-0.5">
                            <button type="button" title="Satisfactory" onClick={() => onMark(o, st === 'sat' ? null : 'sat')}
                                className={cn('flex h-6 w-6 items-center justify-center rounded-md border transition-colors',
                                    st === 'sat' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-slate-300 hover:border-emerald-400 hover:text-emerald-600')}>
                                <Check size={13} strokeWidth={3} />
                            </button>
                            <button type="button" title="Unsatisfactory" onClick={() => onMark(o, st === 'unsat' ? null : 'unsat')}
                                className={cn('flex h-6 w-6 items-center justify-center rounded-md border transition-colors',
                                    st === 'unsat' ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-300 bg-white text-slate-300 hover:border-rose-400 hover:text-rose-600')}>
                                <X size={13} strokeWidth={3} />
                            </button>
                        </div>
                    </li>
                );
            })}
        </ul>
    );

    const note = field.instruction
        ? <div className="mb-2 rounded-md border-l-2 border-amber-400 bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-800">{field.instruction}</div>
        : null;

    // Card mode — a bordered sub-card with its own header (used for the evaluation manoeuvres).
    if (card) {
        return (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2">
                    <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-slate-800"><ListChecks size={13} className="text-slate-400" /> {showLabel ? field.label : 'Checklist'}</p>
                    {allBtn}
                </div>
                <div className="p-3">{note}{items}</div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
                {showLabel
                    ? <p className="flex items-center gap-1.5 text-[12px] font-bold text-slate-700"><ListChecks size={13} className="text-slate-400" /> {field.label}</p>
                    : <span />}
                {allBtn}
            </div>
            {note}{items}
        </div>
    );
}

// ── Field (input / textarea / date / radio / signature / document) ───────────
const INPUT = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

function Field({ field, value, onChange, wide }: { field: FormField; value: string; onChange: (v: unknown) => void; wide?: boolean }) {
    if (field.type === 'paragraph') {
        return (
            <p className={cn('whitespace-pre-line text-[13px] leading-relaxed text-slate-600', wide && 'sm:col-span-2')}>{field.instruction}</p>
        );
    }
    if (field.type === 'bullet-list') {
        return (
            <div className={cn(wide && 'sm:col-span-2')}>
                {field.label && <p className="mb-1.5 text-[12px] font-bold text-slate-700">{field.label}</p>}
                <ul className="list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-slate-600 marker:text-slate-400">
                    {field.options.map((o, i) => <li key={i}>{o}</li>)}
                </ul>
            </div>
        );
    }
    if (field.type === 'signature') {
        return (
            <div className={cn(wide && 'sm:col-span-2')}>
                <SignaturePad
                    label={field.label || 'Signature'}
                    value={value || null}
                    onChange={(v) => onChange(v ?? '')}
                    helper="Draw the signature with your mouse or finger."
                />
            </div>
        );
    }
    if (field.type === 'document') {
        return (
            <div className={cn(wide && 'sm:col-span-2')}>
                <Label field={field} />
                <label className={cn('flex cursor-pointer items-center gap-2.5 rounded-lg border-2 border-dashed px-4 py-3 text-[13px] transition-colors',
                    value ? 'border-emerald-300 bg-emerald-50/40 text-emerald-700' : 'border-slate-300 bg-slate-50/40 text-slate-500 hover:border-blue-300 hover:text-blue-700')}>
                    {value ? <Check size={15} /> : <UploadCloud size={16} />}
                    <span className="truncate font-medium">{value || 'Upload signed record…'}</span>
                    <input type="file" className="hidden" onChange={(e) => onChange(e.target.files?.[0]?.name ?? '')} />
                </label>
                {field.instruction && <p className="mt-1 text-[11px] text-slate-400">{field.instruction}</p>}
            </div>
        );
    }
    if (field.type === 'radio') {
        return (
            <div className={cn(wide && 'sm:col-span-2')}>
                <Label field={field} />
                <div className="flex flex-wrap gap-2">
                    {field.options.map((o) => {
                        const on = value === o;
                        return (
                            <button key={o} type="button" onClick={() => onChange(o)}
                                className={cn('inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition-colors',
                                    on ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500/20' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
                                {on && <Check size={13} strokeWidth={3} />} {o}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }
    if (field.type === 'textarea') {
        return (
            <div className={cn(wide && 'sm:col-span-2')}>
                <Label field={field} />
                <textarea value={value} rows={3} onChange={(e) => onChange(e.target.value)} className={cn(INPUT, 'h-auto resize-y py-2.5')} />
                {field.instruction && <p className="mt-1 text-[11px] text-slate-400">{field.instruction}</p>}
            </div>
        );
    }
    return (
        <div>
            <Label field={field} />
            <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                value={value} onChange={(e) => onChange(e.target.value)} className={INPUT} />
            {field.instruction && <p className="mt-1 text-[11px] text-slate-400">{field.instruction}</p>}
        </div>
    );
}

function Label({ field }: { field: FormField }) {
    if (!field.label) return null;
    return (
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {field.label}{field.required && <span className="text-rose-500"> *</span>}
        </label>
    );
}

// ── Branded Certificate of Road Test — fixed 960×742 (landscape letter ratio),
//    watermark + company branding, examiner signature / name / date. Mirrors the
//    Module Completion Certificate artwork so the brand styling stays consistent. ──
function RoadTestCertificate({ innerRef, branding, driver, date, miles, powerUnit, trailer, examiner, title, examinerDate, sig }: {
    innerRef: React.Ref<HTMLDivElement>;
    branding: CompanyBranding;
    driver: string; date: string; miles: string; powerUnit: string; trailer: string;
    examiner: string; title: string; examinerDate: string; sig: string;
}) {
    const accent = branding.accentColor || '#2563eb';
    const addressLines = (branding.address || '').split(/\s*·\s*|\n/).filter(Boolean);
    const ver = `rt-${(date || '').replace(/-/g, '') || '00000000'}-${(driver || 'driver').replace(/\s+/g, '').slice(0, 6).toLowerCase()}`;
    return (
        <div ref={innerRef} style={{ width: 960, height: 742 }} className="relative overflow-hidden bg-white">
            {/* Decorative double frame + corner accents */}
            <div className="pointer-events-none absolute inset-3 rounded-sm border-[3px]" style={{ borderColor: CERT_FRAME }} />
            <div className="pointer-events-none absolute inset-[18px] rounded-sm border" style={{ borderColor: accent }} />
            {[['left-3 top-3', 'border-l-[6px] border-t-[6px]'], ['right-3 top-3', 'border-r-[6px] border-t-[6px]'], ['left-3 bottom-3', 'border-l-[6px] border-b-[6px]'], ['right-3 bottom-3', 'border-r-[6px] border-b-[6px]']].map(([pos, b], i) => (
                <span key={i} className={cn('pointer-events-none absolute h-10 w-10 rounded-sm', pos, b)} style={{ borderColor: CERT_FRAME }} />
            ))}

            {/* Background arc watermark */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 960 742" fill="none" preserveAspectRatio="xMidYMid slice">
                <path d="M120 700 C 380 260, 720 180, 980 60" stroke="#eef0f6" strokeWidth="120" fill="none" strokeLinecap="round" />
                <path d="M40 720 C 360 320, 700 240, 1000 120" stroke="#f4f5fa" strokeWidth="90" fill="none" strokeLinecap="round" />
            </svg>

            {/* Logo + address */}
            <div className="absolute left-12 top-11">
                {branding.logoDataUrl
                    ? <img src={branding.logoDataUrl} alt="" crossOrigin="anonymous" className="max-h-14 max-w-[200px] object-contain" />
                    : <div className="text-[26px] font-extrabold leading-none" style={{ color: accent }}>{branding.name}</div>}
                {addressLines.length > 0 && <div className="mt-3 space-y-0.5 text-[12px] leading-snug text-slate-500">{addressLines.map((l, i) => <p key={i}>{l}</p>)}</div>}
            </div>

            {/* Title */}
            <div className="absolute inset-x-0 top-[19%] flex flex-col items-center px-20 text-center">
                <p className="text-[15px] font-semibold uppercase tracking-[0.3em]" style={{ color: accent }}>Certificate of</p>
                <h2 className="mt-1 text-[44px] font-extrabold leading-tight tracking-tight" style={{ color: CERT_FRAME }}>Road Test</h2>
                <p className="mt-1.5 text-[12px] font-semibold uppercase tracking-[0.25em] text-slate-400">FMCSA §391.31 · §391.33</p>
            </div>

            {/* Certification body — big centered name, matching the main certificate */}
            <div className="absolute inset-x-0 top-[38%] flex flex-col items-center px-24 text-center">
                <p className="text-[18px] font-light text-slate-500">This is to certify that</p>
                <h3 className="mt-2 max-w-[780px] text-[40px] font-extrabold leading-tight tracking-tight" style={{ color: CERT_FRAME }}>{driver || '—'}</h3>
                <p className="mx-auto mt-4 max-w-[700px] text-[15px] font-light leading-relaxed text-slate-500">
                    was given a road test under my supervision on <span className="font-semibold text-slate-700">{date || '—'}</span>, consisting of approximately <span className="font-semibold text-slate-700">{miles || '—'}</span> miles of driving — and possesses sufficient driving skill to operate safely the type of commercial motor vehicle listed below.
                </p>
                {(powerUnit || trailer) && (
                    <p className="mt-3 text-[13px] text-slate-500">
                        {powerUnit && <span><span className="font-semibold text-slate-600">Power unit:</span> {powerUnit}</span>}
                        {powerUnit && trailer && <span className="mx-2 text-slate-300">·</span>}
                        {trailer && <span><span className="font-semibold text-slate-600">Trailer(s):</span> {trailer}</span>}
                    </p>
                )}
            </div>

            {/* Examiner signature · name · date — formal certificate sign-off */}
            <div className="absolute inset-x-24 bottom-[13%] flex items-end justify-between gap-16">
                <div className="flex-1">
                    <div className="flex h-14 items-end justify-center">
                        {sig ? <img src={sig} alt="" className="max-h-14 object-contain" /> : null}
                    </div>
                    <div className="border-t-2 pt-1.5 text-center" style={{ borderColor: CERT_FRAME }}>
                        <p className="text-[15px] font-bold text-slate-800">{examiner || 'Examiner'}{title ? `, ${title}` : ''}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Signature of Examiner</p>
                    </div>
                </div>
                <div className="w-56">
                    <div className="flex h-14 items-end justify-center">
                        <span className="text-[16px] font-semibold text-slate-800">{examinerDate || '—'}</span>
                    </div>
                    <div className="border-t-2 pt-1.5 text-center" style={{ borderColor: CERT_FRAME }}>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Date</p>
                    </div>
                </div>
            </div>

            {/* Watermark text */}
            <p className="absolute inset-x-0 bottom-[6.5%] text-center text-[18px] font-semibold italic tracking-wide text-slate-200">Certificate of Road Test</p>

            {/* Footer */}
            <div className="absolute inset-x-12 bottom-6 flex items-end justify-between border-t border-slate-200 pt-2.5 text-[9px] text-slate-400">
                <span className="max-w-[640px] truncate">{[branding.name, branding.address].filter(Boolean).join(' · ')}</span>
                <span className="shrink-0">{ver}{driver ? ` · ${driver}` : ''}</span>
            </div>
        </div>
    );
}

export default RoadTestForm;
