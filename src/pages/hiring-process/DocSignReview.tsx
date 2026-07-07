import { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ChevronLeft, Check, PenLine, CheckCircle2, FileText, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { fieldMeta, type DocField, type DocFile, type DocTemplate } from "./document-templates.data";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const PAGE_W = 720;

function dataUrlToBytes(dataUrl: string): Uint8Array {
    const b64 = dataUrl.split(",")[1] ?? "";
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

function usePdfDoc(file: DocFile | null) {
    const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
    const src = file?.pdfUrl ?? file?.pdfDataUrl ?? null;
    useEffect(() => {
        if (!file || !src) { setDoc(null); return; }
        let cancelled = false;
        const task = pdfjsLib.getDocument(file.pdfUrl ? { url: file.pdfUrl } : { data: dataUrlToBytes(file.pdfDataUrl!) });
        task.promise.then((d) => { if (!cancelled) setDoc(d); }).catch(() => { /* invalid pdf */ });
        return () => { cancelled = true; task.destroy(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);
    return doc;
}

// A field the driver must complete (or a company signature already applied).
function FieldBox({ f, checked, onToggle }: { f: DocField; checked: boolean; onToggle: () => void }) {
    if (f.stampDataUrl) return (
        <div className="absolute rounded border border-blue-300 bg-blue-50/40" style={{ left: `${f.xPct}%`, top: `${f.yPct}%`, width: `${f.wPct}%`, height: `${f.hPct}%` }}>
            <img src={f.stampDataUrl} alt="Signature" className="h-full w-full object-contain" />
        </div>
    );
    const sig = f.type === "signature" || f.type === "initials";
    return (
        <button type="button" onClick={onToggle}
            className={cn("absolute flex items-center justify-center gap-1 rounded border-2 border-dashed px-1 text-[10px] font-semibold transition",
                checked ? "border-emerald-400 bg-emerald-50/80 text-emerald-700" : sig ? "border-blue-400 bg-blue-50/70 text-blue-700 hover:bg-blue-100/70" : "border-amber-400 bg-amber-50/70 text-amber-800 hover:bg-amber-100/70")}
            style={{ left: `${f.xPct}%`, top: `${f.yPct}%`, width: `${f.wPct}%`, height: `${f.hPct}%` }}
            title={`${fieldMeta(f.type).label}${f.required ? " · required" : ""}`}>
            {checked ? <Check className="h-3 w-3" /> : sig ? <PenLine className="h-3 w-3" /> : null}
            <span className="truncate">{f.label || fieldMeta(f.type).label}</span>
        </button>
    );
}

function ReviewPage({ doc, index, fields, checked, onToggle }: { doc: PDFDocumentProxy; index: number; fields: DocField[]; checked: Set<string>; onToggle: (id: string) => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [h, setH] = useState(PAGE_W * 1.294);
    useEffect(() => {
        let cancelled = false;
        let task: { promise: Promise<void>; cancel: () => void } | null = null;
        (async () => {
            const page = await doc.getPage(index + 1);
            if (cancelled) return;
            const base = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({ scale: PAGE_W / base.width });
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            canvas.width = viewport.width; canvas.height = viewport.height;
            setH(viewport.height);
            task = page.render({ canvasContext: ctx, viewport });
            try { await task.promise; } catch { /* cancelled */ }
        })();
        return () => { cancelled = true; task?.cancel?.(); };
    }, [doc, index]);
    return (
        <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" style={{ width: PAGE_W, height: h }}>
            <canvas ref={canvasRef} className="block h-full w-full" />
            <div className="pointer-events-none absolute left-2 top-2 rounded bg-slate-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">Page {index + 1}</div>
            {fields.map((f) => <FieldBox key={f.id} f={f} checked={checked.has(f.id)} onToggle={() => onToggle(f.id)} />)}
        </div>
    );
}

function DocPagesReview({ file, fields, checked, onToggle }: { file: DocFile; fields: DocField[]; checked: Set<string>; onToggle: (id: string) => void }) {
    const doc = usePdfDoc(file);
    if (!doc) return <div className="py-16 text-center text-sm text-slate-400">Rendering {file.fileName}…</div>;
    return (
        <div className="flex flex-col items-center gap-4">
            {Array.from({ length: file.pageCount }, (_, i) => (
                <ReviewPage key={i} doc={doc} index={i} fields={fields.filter((f) => f.docId === file.id && f.page === i)} checked={checked} onToggle={onToggle} />
            ))}
        </div>
    );
}

/**
 * DocSignReview — a read-only, full-screen review of a document template's PDF
 * with its placed fields overlaid. The reviewer walks the "field check" list on
 * the right, ticking each field they've verified. Company signatures already
 * applied to the template render as the signature image.
 */
export function DocSignReview({ template, driverName, onBack }: { template: DocTemplate; driverName?: string; onBack: () => void }) {
    // Fields the driver fills vs company signatures already applied to the template.
    const driverFields = useMemo(() => template.fields.filter((f) => !f.stampDataUrl), [template]);
    const companyStamps = useMemo(() => template.fields.filter((f) => f.stampDataUrl), [template]);
    const stamps = companyStamps.length;
    const [checked, setChecked] = useState<Set<string>>(new Set());
    const toggle = (id: string) => setChecked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const allChecked = driverFields.length > 0 && driverFields.every((f) => checked.has(f.id));
    const pageLabel = (f: DocField) => {
        let n = 0;
        for (const d of template.documents) { if (d.id === f.docId) { return n + f.page + 1; } n += d.pageCount; }
        return f.page + 1;
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* App bar */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <div className="flex min-w-0 items-center gap-3">
                    <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Back</button>
                    <div className="ml-1 min-w-0">
                        <h1 className="flex items-center gap-2 truncate text-sm font-bold text-slate-900">
                            <FileText className="h-4 w-4 shrink-0 text-blue-500" /> {template.name}
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-600">Document review</span>
                        </h1>
                        <p className="truncate text-xs text-slate-500">{template.documents.length} document{template.documents.length === 1 ? "" : "s"} · {driverFields.length} field{driverFields.length === 1 ? "" : "s"} to sign{stamps > 0 ? ` · ${stamps} signed by company` : ""}{driverName ? ` · ${driverName}` : ""}</p>
                    </div>
                </div>
                <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", allChecked ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>{checked.size}/{driverFields.length} checked</span>
            </div>

            <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-6 lg:flex-row lg:items-start">
                {/* PDF pages */}
                <div className="flex-1">
                    <div className="flex flex-col items-center gap-8">
                        {template.documents.length === 0 && <p className="py-16 text-sm text-slate-400">This template has no PDF.</p>}
                        {template.documents.map((d) => (
                            <div key={d.id} className="w-full">
                                <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">{d.fileName}</p>
                                <DocPagesReview file={d} fields={driverFields.concat(template.fields.filter((f) => f.stampDataUrl))} checked={checked} onToggle={toggle} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Field check panel */}
                <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-20 lg:w-[340px]">
                    {/* Company signatures already applied */}
                    {companyStamps.length > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <h3 className="mb-3 text-sm font-bold text-slate-800">Applied signatures</h3>
                            <div className="space-y-1.5">
                                {companyStamps.map((f) => (
                                    <div key={f.id} className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
                                        <span className="flex h-8 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-white"><img src={f.stampDataUrl} alt="signature" className="h-full w-full object-contain" /></span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-semibold text-slate-800">{f.label || "Company signature"}</p>
                                            <p className="truncate text-[11px] text-emerald-600">Signed · page {pageLabel(f)}</p>
                                        </div>
                                        <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-800">Fields to check</h3>
                            <button type="button" onClick={() => setChecked(allChecked ? new Set() : new Set(driverFields.map((f) => f.id)))} className="text-xs font-semibold text-blue-600 hover:text-blue-700">{allChecked ? "Clear all" : "Check all"}</button>
                        </div>
                        {driverFields.length === 0 ? (
                            <p className="py-2 text-sm text-slate-400">No driver fields on this document.</p>
                        ) : (
                            <div className="space-y-1.5">
                                {driverFields.map((f) => {
                                    const on = checked.has(f.id);
                                    const isSig = f.type === "signature" || f.type === "initials";
                                    return (
                                        <button key={f.id} type="button" onClick={() => toggle(f.id)}
                                            className={cn("flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition", on ? "border-emerald-300 bg-emerald-50/70" : "border-slate-200 hover:bg-slate-50")}>
                                            <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", on ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300")}>{on && <Check className="h-3 w-3" />}</span>
                                            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", isSig ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500")}>{isSig ? <PenLine className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}</span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-[13px] font-semibold text-slate-800">{f.label || fieldMeta(f.type).label}</p>
                                                <p className="flex items-center gap-1.5 truncate text-[11px] text-slate-400">
                                                    <span className={cn("rounded px-1 py-0.5 text-[9px] font-bold uppercase", isSig ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500")}>{isSig ? "Sign" : fieldMeta(f.type).label}</span>
                                                    page {pageLabel(f)}{f.required ? " · required" : ""}
                                                </p>
                                            </div>
                                            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", on ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>{on ? (isSig ? "Signed" : "Verified") : "Pending"}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        {allChecked && <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> All fields checked.</p>}
                        <Button className="mt-4 w-full" onClick={onBack}><Check className="h-4 w-4" /> Done reviewing</Button>
                    </div>
                </aside>
            </div>
        </div>
    );
}
