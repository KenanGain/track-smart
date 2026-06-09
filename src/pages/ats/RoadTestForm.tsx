import { useMemo, useState } from 'react';
import {
    ArrowLeft, Save, Download, Check, X, UploadCloud, FileText, ClipboardCheck,
    ListChecks, Award, Eye, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompanyBranding } from './company-branding.data';
import { generateApplicationFormPdf } from './generateApplicationFormPdf';
import { PDF_TEMPLATES } from './ApplicationFormPrint';
import { SignaturePad } from './SignaturePad';
import type { ApplicationFormDef, FormField } from './application-forms.data';
import type { FieldValue } from './CustomFormWizard';

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
export function RoadTestForm({ appForm, onClose }: { appForm: ApplicationFormDef; onClose: () => void }) {
    const [branding] = useCompanyBranding();
    const [values, setValues] = useState<Record<string, unknown>>({});
    const [downloading, setDownloading] = useState(false);
    const [pdfMenu, setPdfMenu] = useState(false);
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
    // (rather than starting a new card) — e.g. the C-TPAT block is one document
    // with the §391.33 Equivalent that precedes it.
    const MERGE_INTO_PREVIOUS = useMemo(() => new Set(['f-ats-rt-ctpat-head']), []);

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
    const finalScore = scored.reduce((n, s) => n + secScore(s), 0);
    const maxScore = scored.length * 5;
    const passMark = Math.ceil(maxScore * 0.8);
    const passed = maxScore > 0 && finalScore >= passMark;

    const evalItemsTotal = scored.reduce((n, s) => n + checklistsOf(s).reduce((a, f) => a + f.options.length, 0), 0);
    const evalItemsChecked = scored.reduce((n, s) => n + checklistsOf(s).reduce((a, f) => a + arr(f.id).length, 0), 0);
    const pct = maxScore > 0 ? Math.round((finalScore / maxScore) * 100) : 0;

    const makePdf = async (variant: string, mode: 'download' | 'view') => {
        setPdfMenu(false);
        if (downloading) return;
        setDownloading(true);
        try { await generateApplicationFormPdf({ form: appForm, branding, values: values as Record<string, FieldValue>, variant: variant as never, mode }); }
        finally { setDownloading(false); }
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
        for (const sec of sections) {
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

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-100">
            {/* ── App bar ─────────────────────────────────────────────── */}
            <header className="z-20 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700" title="Back">
                            <ArrowLeft size={16} />
                        </button>
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm" style={{ backgroundColor: accent }}>
                            {branding.logoDataUrl ? <img src={branding.logoDataUrl} alt="" className="max-h-7 max-w-7 object-contain" /> : <ClipboardCheck size={19} />}
                        </span>
                        <div className="leading-tight">
                            <h1 className="text-[17px] font-bold text-slate-900">Road Test Evaluation</h1>
                            <p className="text-[11px] text-slate-500">FMCSA §391.31 · {branding.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onClose} className="hidden h-9 rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 sm:block">Cancel</button>
                        <button type="button" disabled={downloading} onClick={() => makePdf('standard', 'view')}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60" title="Open a PDF preview in a new tab">
                            <Eye size={14} /> {downloading ? 'Preparing…' : 'View PDF'}
                        </button>
                        <div className="relative">
                            <button type="button" disabled={downloading} onClick={() => setPdfMenu(o => !o)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                                <Download size={14} /> {downloading ? 'Preparing…' : 'PDF'} <ChevronDown size={13} className="text-slate-400" />
                            </button>
                            {pdfMenu && (
                                <div className="absolute right-0 z-30 mt-1 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                    <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">PDF template</p>
                                    {PDF_TEMPLATES.map(t => (
                                        <div key={t.id} className="px-3 py-2 hover:bg-slate-50">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <span className="block text-[13px] font-semibold text-slate-800">{t.label}</span>
                                                    <span className="block text-[11px] text-slate-500">{t.description}</span>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    <button type="button" onClick={() => makePdf(t.id, 'view')} title="View in new tab"
                                                        className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-white hover:text-blue-700"><Eye size={14} /></button>
                                                    <button type="button" onClick={() => makePdf(t.id, 'download')} title="Download"
                                                        className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-white hover:text-blue-700"><Download size={14} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button type="button" onClick={() => { window.alert('Road test record saved.'); onClose(); }}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-bold text-white shadow-sm" style={{ backgroundColor: accent }}>
                            <Save size={14} /> Submit
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Sticky score bar ────────────────────────────────────── */}
            <div className="z-10 border-b border-slate-200 bg-white/95 px-6 py-2.5 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center gap-4">
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
                                <span className="ml-2 text-slate-400">{evalItemsChecked}/{evalItemsTotal} items checked</span>
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
            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-6xl space-y-5 px-6 py-6">
                    {/* Hero: title + rating scale (+ driver details only if any are pre-heading) */}
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="px-6 py-5">
                            <h2 className="text-center text-xl font-bold tracking-tight text-slate-900">ROAD TEST EVALUATION</h2>
                            <p className="mx-auto mt-1 max-w-2xl text-center text-[12px] leading-relaxed text-slate-500">
                                Score each section out of 5. A minimum total of <span className="font-semibold text-slate-700">12 / 15</span> is required to pass.
                            </p>
                            {/* Rating scale pills */}
                            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-5">
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
                            <div className="border-t border-slate-100 px-6 py-5">
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
                </div>
            </div>
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
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
            <div className="flex min-w-0 items-start gap-2.5">
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

export default RoadTestForm;
