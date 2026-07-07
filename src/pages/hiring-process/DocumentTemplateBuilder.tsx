import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ChevronLeft, UploadCloud, Trash2, X, FileText, GripVertical, Check, Copy, ZoomIn, ZoomOut, Magnet, Eye, Pencil, Plus, CheckCircle2, PenLine, RefreshCw, LayoutList, MousePointerClick, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignatureCreator } from "./SignatureCreator";
import { FIELD_TYPES, fieldMeta, getDocTemplate, type DocField, type DocFieldType, type DocFile, type DocTemplate } from "./document-templates.data";
import { useCarrierSignature } from "./carrier-signatures.data";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const BASE_PAGE_W = 680;
const GRID = 0.5;
const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5];
const STAMP = "__stamp__";   // dataTransfer marker for a dragged saved signature
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const uid = (p = "df") => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const FIELD_COLOR: Record<DocFieldType, { tag: string; ring: string; grip: string }> = {
    signature: { tag: "border-blue-400 bg-blue-100/85 text-blue-800", ring: "ring-blue-400", grip: "bg-blue-500" },
    initials: { tag: "border-indigo-400 bg-indigo-100/85 text-indigo-800", ring: "ring-indigo-400", grip: "bg-indigo-500" },
    fullName: { tag: "border-violet-400 bg-violet-100/85 text-violet-800", ring: "ring-violet-400", grip: "bg-violet-500" },
    text: { tag: "border-slate-400 bg-slate-100/90 text-slate-700", ring: "ring-slate-400", grip: "bg-slate-500" },
    number: { tag: "border-amber-400 bg-amber-100/85 text-amber-800", ring: "ring-amber-400", grip: "bg-amber-500" },
    phone: { tag: "border-teal-400 bg-teal-100/85 text-teal-800", ring: "ring-teal-400", grip: "bg-teal-500" },
    email: { tag: "border-cyan-400 bg-cyan-100/85 text-cyan-800", ring: "ring-cyan-400", grip: "bg-cyan-500" },
    date: { tag: "border-emerald-400 bg-emerald-100/85 text-emerald-800", ring: "ring-emerald-400", grip: "bg-emerald-500" },
    checkbox: { tag: "border-rose-400 bg-rose-100/85 text-rose-800", ring: "ring-rose-400", grip: "bg-rose-500" },
};

const inputType = (t: DocFieldType) => (t === "number" ? "number" : t === "date" ? "date" : t === "email" ? "email" : t === "phone" ? "tel" : "text");
const isSigType = (t: DocFieldType) => t === "signature" || t === "initials";

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

type Dir = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type DragState =
    | { mode: "move"; rect: DOMRect; ox: number; oy: number; origs: Record<string, { x: number; y: number }> }
    | { mode: "resize"; id: string; handle: Dir; rect: DOMRect; ox: number; oy: number; orig: DocField };

const MIN_W = 3, MIN_H = 2;
// Handle positions around the selection box (matches a design-tool selection).
const HANDLES: { dir: Dir; pos: string; cursor: string }[] = [
    { dir: "nw", pos: "-top-1.5 -left-1.5", cursor: "cursor-nwse-resize" },
    { dir: "n", pos: "-top-1.5 left-1/2 -translate-x-1/2", cursor: "cursor-ns-resize" },
    { dir: "ne", pos: "-top-1.5 -right-1.5", cursor: "cursor-nesw-resize" },
    { dir: "e", pos: "top-1/2 -right-1.5 -translate-y-1/2", cursor: "cursor-ew-resize" },
    { dir: "se", pos: "-bottom-1.5 -right-1.5", cursor: "cursor-nwse-resize" },
    { dir: "s", pos: "-bottom-1.5 left-1/2 -translate-x-1/2", cursor: "cursor-ns-resize" },
    { dir: "sw", pos: "-bottom-1.5 -left-1.5", cursor: "cursor-nesw-resize" },
    { dir: "w", pos: "top-1/2 -left-1.5 -translate-y-1/2", cursor: "cursor-ew-resize" },
];

export function DocumentTemplateBuilder({ templateId, onBack, onSave, startPreview, carrierId }: { templateId: string; onBack: () => void; onSave: (t: DocTemplate) => boolean | void; startPreview?: boolean; carrierId?: string }) {
    const existing = templateId !== "new" ? getDocTemplate(templateId) : undefined;
    const { signature, save: saveSignature } = useCarrierSignature(carrierId);
    const [name, setName] = useState(existing?.name ?? "");
    const [documents, setDocuments] = useState<DocFile[]>(existing?.documents ?? []);
    const [fields, setFields] = useState<DocField[]>(existing?.fields ?? []);
    const [selection, setSelection] = useState<Set<string>>(new Set());
    const [uploadWarn, setUploadWarn] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [snap, setSnap] = useState(true);
    const [preview, setPreview] = useState(!!startPreview && !!existing);
    const [values, setValues] = useState<Record<string, string>>({});   // preview fill/sign values
    const [signFor, setSignFor] = useState<string | null>(null);
    const [editSignature, setEditSignature] = useState(false);          // account-signature modal
    const [stampAfter, setStampAfter] = useState<string | null>(null);  // field to pre-sign after creating a signature
    const [finished, setFinished] = useState(false);
    const [colW, setColW] = useState(BASE_PAGE_W);
    const [flash, setFlash] = useState<{ tone: "warn" | "error"; msg: string } | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    const drag = useRef<DragState | null>(null);
    const marquee = useRef<{ docId: string; page: number; rect: DOMRect; ox: number; oy: number } | null>(null);
    const [marqueeBox, setMarqueeBox] = useState<{ docId: string; page: number; left: number; top: number; w: number; h: number } | null>(null);
    const fieldsRef = useRef(fields); fieldsRef.current = fields;
    const snapRef = useRef(snap); snapRef.current = snap;
    const pageWidth = Math.max(360, Math.round(colW * zoom));                       // editor: fill the column
    const previewWidth = Math.max(360, Math.round(Math.min(760, colW) * zoom));      // preview: normal document size

    const snapv = (v: number) => (snapRef.current ? Math.round(v / GRID) * GRID : v);

    useEffect(() => {
        const onMove = (e: PointerEvent) => {
            const m = marquee.current;
            if (m) {
                const x0 = ((m.ox - m.rect.left) / m.rect.width) * 100;
                const y0 = ((m.oy - m.rect.top) / m.rect.height) * 100;
                const x1 = clamp(((e.clientX - m.rect.left) / m.rect.width) * 100, 0, 100);
                const y1 = clamp(((e.clientY - m.rect.top) / m.rect.height) * 100, 0, 100);
                setMarqueeBox({ docId: m.docId, page: m.page, left: Math.min(x0, x1), top: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) });
                return;
            }
            const d = drag.current;
            if (!d) return;
            const dxPct = ((e.clientX - d.ox) / d.rect.width) * 100;
            const dyPct = ((e.clientY - d.oy) / d.rect.height) * 100;
            if (d.mode === "move") {
                setFields((fs) => fs.map((f) => {
                    const o = d.origs[f.id];
                    return o ? { ...f, xPct: clamp(snapv(o.x + dxPct), 0, 100 - f.wPct), yPct: clamp(snapv(o.y + dyPct), 0, 100 - f.hPct) } : f;
                }));
            } else {
                const h = d.handle;
                let left = d.orig.xPct, top = d.orig.yPct;
                let right = d.orig.xPct + d.orig.wPct, bottom = d.orig.yPct + d.orig.hPct;
                if (h.includes("e")) right = clamp(snapv(right + dxPct), left + MIN_W, 100);
                if (h.includes("w")) left = clamp(snapv(left + dxPct), 0, right - MIN_W);
                if (h.includes("s")) bottom = clamp(snapv(bottom + dyPct), top + MIN_H, 100);
                if (h.includes("n")) top = clamp(snapv(top + dyPct), 0, bottom - MIN_H);
                setFields((fs) => fs.map((f) => (f.id !== d.id ? f : { ...f, xPct: left, yPct: top, wPct: right - left, hPct: bottom - top })));
            }
        };
        const onUp = (e: PointerEvent) => {
            const m = marquee.current;
            if (m) {
                const x0 = ((m.ox - m.rect.left) / m.rect.width) * 100, y0 = ((m.oy - m.rect.top) / m.rect.height) * 100;
                const x1 = ((e.clientX - m.rect.left) / m.rect.width) * 100, y1 = ((e.clientY - m.rect.top) / m.rect.height) * 100;
                const L = Math.min(x0, x1), R = Math.max(x0, x1), T = Math.min(y0, y1), B = Math.max(y0, y1);
                if (R - L > 1 || B - T > 1) {
                    const hits = fieldsRef.current
                        .filter((f) => f.docId === m.docId && f.page === m.page && f.xPct < R && f.xPct + f.wPct > L && f.yPct < B && f.yPct + f.hPct > T)
                        .map((f) => f.id);
                    setSelection(new Set(hits));
                }
                marquee.current = null;
                setMarqueeBox(null);
                return;
            }
            drag.current = null;
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (preview) return;
            const el = document.activeElement;
            if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
            if ((e.key === "Delete" || e.key === "Backspace") && selection.size) { e.preventDefault(); removeSelected(); }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d" && selection.size) { e.preventDefault(); duplicateSelected(); }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a" && fields.length) { e.preventDefault(); selectAll(); }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    // Measure the pages column so pages can fill its width (no dead gap).
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const update = () => setColW(el.clientWidth);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [preview, documents.length]);

    const addDocument = (file: File | undefined) => {
        if (!file) return;
        if (file.type !== "application/pdf") { setUploadWarn("Please choose a PDF file."); return; }
        setUploadWarn(file.size > 4 * 1024 * 1024 ? "Large PDF — it may not persist (prototype uses local storage). Under 3–4 MB is safest." : null);
        const reader = new FileReader();
        reader.onload = async () => {
            const dataUrl = reader.result as string;
            let pageCount = 1;
            try { const d = await pdfjsLib.getDocument({ data: dataUrlToBytes(dataUrl) }).promise; pageCount = d.numPages; d.destroy(); } catch { /* ignore */ }
            setDocuments((ds) => [...ds, { id: uid("doc"), fileName: file.name, pdfDataUrl: dataUrl, pageCount }]);
        };
        reader.readAsDataURL(file);
    };
    const removeDocument = (docId: string) => {
        setDocuments((ds) => ds.filter((d) => d.id !== docId));
        setFields((fs) => fs.filter((f) => f.docId !== docId));
        setSelection(new Set());
    };

    const addField = (type: DocFieldType, docId: string, page: number, xPct: number, yPct: number) => {
        const m = fieldMeta(type);
        const id = uid();
        setFields((f) => [...f, { id, type, docId, page, xPct: clamp(snapv(xPct - m.w / 2), 0, 100 - m.w), yPct: clamp(snapv(yPct - m.h / 2), 0, 100 - m.h), wPct: m.w, hPct: m.h, label: m.label, required: true }]);
        setSelection(new Set([id]));
    };
    // Drop the account's saved signature as an already-applied stamp.
    const addStamp = (docId: string, page: number, xPct: number, yPct: number) => {
        if (!signature) return;
        const m = fieldMeta("signature");
        const id = uid("stamp");
        setFields((f) => [...f, { id, type: "signature", docId, page, xPct: clamp(snapv(xPct - m.w / 2), 0, 100 - m.w), yPct: clamp(snapv(yPct - m.h / 2), 0, 100 - m.h), wPct: m.w, hPct: m.h, label: "Signed", required: false, stampDataUrl: signature }]);
        setSelection(new Set([id]));
    };
    const updateField = (id: string, patch: Partial<DocField>) => setFields((f) => f.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    // A signature block is EITHER pre-signed by you (stamp) OR a request for the driver to sign.
    const setSigning = (id: string, mode: "driver" | "self") => {
        if (mode === "driver") { updateField(id, { stampDataUrl: undefined, required: true }); return; }
        if (signature) updateField(id, { stampDataUrl: signature, required: false });
        else { setStampAfter(id); setEditSignature(true); }   // no signature yet → create one, then stamp
    };
    const removeSelected = () => { setFields((f) => f.filter((x) => !selection.has(x.id))); setSelection(new Set()); };
    const duplicateSelected = () => {
        const add: DocField[] = [];
        const newIds = new Set<string>();
        fieldsRef.current.forEach((f) => {
            if (!selection.has(f.id)) return;
            const nid = uid(); newIds.add(nid);
            add.push({ ...f, id: nid, xPct: clamp(f.xPct + 2, 0, 100 - f.wPct), yPct: clamp(f.yPct + 2, 0, 100 - f.hPct) });
        });
        if (!add.length) return;
        setFields((fs) => [...fs, ...add]);
        setSelection(newIds);
    };

    const onDropAt = (docId: string, page: number, e: React.DragEvent) => {
        e.preventDefault();
        const type = e.dataTransfer.getData("field-type");
        if (!type) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
        const yPct = ((e.clientY - rect.top) / rect.height) * 100;
        if (type === STAMP) addStamp(docId, page, xPct, yPct);
        else addField(type as DocFieldType, docId, page, xPct, yPct);
    };

    const startMove = (e: React.PointerEvent, f: DocField) => {
        e.stopPropagation();
        const wrap = (e.currentTarget as HTMLElement).closest("[data-pagewrap]") as HTMLElement | null;
        if (!wrap) return;
        if (e.shiftKey || e.metaKey || e.ctrlKey) { setSelection((s) => { const n = new Set(s); n.has(f.id) ? n.delete(f.id) : n.add(f.id); return n; }); return; }
        const sel = selection.has(f.id) ? selection : new Set([f.id]);
        if (!selection.has(f.id)) setSelection(sel);
        const origs: Record<string, { x: number; y: number }> = {};
        fieldsRef.current.forEach((x) => { if (sel.has(x.id)) origs[x.id] = { x: x.xPct, y: x.yPct }; });
        drag.current = { mode: "move", rect: wrap.getBoundingClientRect(), ox: e.clientX, oy: e.clientY, origs };
    };
    const startResize = (e: React.PointerEvent, f: DocField, handle: Dir) => {
        e.stopPropagation();
        const wrap = (e.currentTarget as HTMLElement).closest("[data-pagewrap]") as HTMLElement | null;
        if (!wrap) return;
        setSelection(new Set([f.id]));
        drag.current = { mode: "resize", id: f.id, handle, rect: wrap.getBoundingClientRect(), ox: e.clientX, oy: e.clientY, orig: f };
    };
    const startMarquee = (docId: string, page: number, rect: DOMRect, clientX: number, clientY: number) => {
        marquee.current = { docId, page, rect, ox: clientX, oy: clientY };
        setMarqueeBox({ docId, page, left: ((clientX - rect.left) / rect.width) * 100, top: ((clientY - rect.top) / rect.height) * 100, w: 0, h: 0 });
    };
    const duplicateOne = (id: string) => {
        const f = fieldsRef.current.find((x) => x.id === id);
        if (!f) return;
        const nid = uid();
        setFields((fs) => [...fs, { ...f, id: nid, xPct: clamp(f.xPct + 2, 0, 100 - f.wPct), yPct: clamp(f.yPct + 2, 0, 100 - f.hPct) }]);
        setSelection(new Set([nid]));
    };
    const removeOne = (id: string) => { setFields((fs) => fs.filter((x) => x.id !== id)); setSelection((s) => { const n = new Set(s); n.delete(id); return n; }); };
    const selectAll = () => setSelection(new Set(fieldsRef.current.map((f) => f.id)));
    const removeAll = () => {
        if (!fieldsRef.current.length) return;
        if (window.confirm(`Remove all ${fieldsRef.current.length} field${fieldsRef.current.length !== 1 ? "s" : ""} from this template?`)) {
            setFields([]);
            setSelection(new Set());
        }
    };

    const canSave = !!name.trim() && documents.length > 0;
    const save = () => {
        if (!documents.length) { setFlash({ tone: "warn", msg: "Upload at least one PDF before saving." }); return; }
        if (!name.trim()) {
            setFlash({ tone: "warn", msg: "Give your template a name to save it." });
            nameRef.current?.focus();
            return;
        }
        const ok = onSave({ id: existing?.id ?? uid("doctpl"), name: name.trim(), documents, fields, updatedAt: Date.now() });
        if (ok === false) {
            setFlash({ tone: "error", msg: "Couldn't save — the PDF is too large for the browser's local storage. Try a smaller PDF (under ~3 MB)." });
            return;
        }
        onBack();
    };

    const selField = selection.size === 1 ? fields.find((f) => selection.has(f.id)) : undefined;
    const pageTotal = documents.reduce((n, d) => n + d.pageCount, 0);
    const stampCount = fields.filter((f) => f.stampDataUrl).length;
    // Only fields the driver fills count toward "required" completion (stamps are pre-applied).
    const requiredFields = fields.filter((f) => f.required && !f.stampDataUrl);
    const filledRequired = requiredFields.filter((f) => values[f.id]).length;
    const allDone = requiredFields.length > 0 && filledRequired === requiredFields.length;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top bar — wraps on small screens */}
            <div className="sticky top-0 z-20 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <button type="button" onClick={onBack} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Documents</span></button>
                    <span className="hidden h-5 w-px bg-slate-200 sm:block" />
                    <div className="relative min-w-0 flex-1 sm:max-w-xs">
                        <Pencil className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <Input ref={nameRef} value={name} onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setFlash(null); }} placeholder="Name this template…" autoFocus={templateId === "new"}
                            className={cn("h-9 w-full pl-8 font-medium", !name.trim() && "border-amber-300 focus-visible:ring-amber-400")} />
                    </div>
                    {documents.length > 0 && (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                            <FileText className="h-3.5 w-3.5" /> {documents.length} PDF{documents.length !== 1 ? "s" : ""} · {pageTotal} page{pageTotal !== 1 ? "s" : ""} · {fields.length} field{fields.length !== 1 ? "s" : ""}
                        </span>
                    )}

                    <div className="ml-auto flex items-center gap-2">
                        {documents.length > 0 && preview && <span className="hidden items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 sm:inline-flex"><Eye className="h-3.5 w-3.5" /> Fill &amp; sign</span>}
                        {documents.length > 0 && !preview && (
                            <button type="button" onClick={() => setSnap((s) => !s)} title="Snap to grid"
                                className={cn("inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition", snap ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:bg-slate-50")}>
                                <Magnet className="h-4 w-4" /> <span className="hidden sm:inline">Snap</span>
                            </button>
                        )}
                        {documents.length > 0 && (
                            <>
                                <div className="flex items-center gap-0.5 rounded-md border border-slate-200 px-1">
                                    <button type="button" title="Zoom out" onClick={() => setZoom((z) => ZOOMS[Math.max(0, ZOOMS.indexOf(z) - 1)] ?? z)} className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100"><ZoomOut className="h-4 w-4" /></button>
                                    <span className="w-9 text-center text-xs font-semibold text-slate-600">{Math.round(zoom * 100)}%</span>
                                    <button type="button" title="Zoom in" onClick={() => setZoom((z) => ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(z) + 1)] ?? z)} className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100"><ZoomIn className="h-4 w-4" /></button>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => { setPreview((p) => !p); setFinished(false); }}>
                                    {preview ? <><Pencil className="h-4 w-4" /> Edit</> : <><Eye className="h-4 w-4" /> <span className="hidden sm:inline">Preview</span></>}
                                </Button>
                            </>
                        )}
                        {!preview && <Button size="sm" onClick={save} className={cn(!canSave && "opacity-90")} title={canSave ? "" : "Name the template and add at least one document"}><Check className="h-4 w-4" /> <span className="hidden sm:inline">Save template</span><span className="sm:hidden">Save</span></Button>}
                    </div>
                </div>
            </div>

            {flash && (
                <div className={cn("flex items-center gap-2 border-b px-4 py-2.5 text-sm sm:px-6", flash.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-800")}>
                    {flash.tone === "error" ? <X className="h-4 w-4 shrink-0" /> : <Pencil className="h-4 w-4 shrink-0" />}
                    <span className="flex-1">{flash.msg}</span>
                    <button type="button" onClick={() => setFlash(null)} className="shrink-0 rounded p-0.5 hover:bg-black/5"><X className="h-4 w-4" /></button>
                </div>
            )}

            {documents.length === 0 ? (
                <UploadPane onUpload={addDocument} warn={uploadWarn} />
            ) : preview ? (
                /* ── Fill & sign preview (recipient view) ── */
                <div className="px-3 py-6 sm:px-4">
                    <div className="mx-auto mb-4 flex max-w-3xl flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="flex min-w-0 items-center gap-2 text-sm text-blue-800"><Eye className="h-4 w-4 shrink-0 text-blue-500" /> <span className="min-w-0 truncate">Fill &amp; sign — <span className="font-semibold">{name || "this template"}</span>{stampCount > 0 && <span className="text-blue-600"> · your signature is already applied</span>}</span></p>
                        <div className="flex shrink-0 items-center gap-3">
                            <span className="text-sm font-semibold text-blue-800">{filledRequired}/{requiredFields.length} required</span>
                            {finished ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Completed</span>
                            ) : (
                                <Button size="sm" disabled={!allDone} onClick={() => setFinished(true)}><Check className="h-4 w-4" /> Finish</Button>
                            )}
                        </div>
                    </div>
                    <div ref={scrollRef} className="overflow-x-auto">
                        <div className="mx-auto flex flex-col gap-8" style={{ width: previewWidth }}>
                            {documents.map((file, di) => (
                                <div key={file.id}>
                                    <p className="mb-2 truncate text-sm font-semibold text-slate-700">{documents.length > 1 ? `${di + 1}. ` : ""}{file.fileName}</p>
                                    <DocPages file={file} width={previewWidth} onClear={() => { }} onDropAt={() => { }}
                                        renderFields={(page) => fields.filter((f) => f.docId === file.id && f.page === page).map((f) => (
                                            <PreviewField key={f.id} f={f} value={values[f.id]} onChange={(v) => setValues((s) => ({ ...s, [f.id]: v }))} onSign={() => setSignFor(f.id)} />
                                        ))} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* ── Editor ── */
                <div className="grid gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
                    <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                        {/* Step 1 — Your signature (drag onto the document to pre-sign) */}
                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                            <div className="mb-2.5 flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600"><PenLine className="h-3.5 w-3.5" /></span>
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Your signature</p>
                            </div>
                            {signature ? (
                                <div draggable onDragStart={(e) => e.dataTransfer.setData("field-type", STAMP)}
                                    className="group relative flex cursor-grab items-center gap-2 rounded-lg border-2 border-blue-200 bg-blue-50/30 p-2 transition hover:border-blue-300 active:cursor-grabbing">
                                    <GripVertical className="h-3.5 w-3.5 shrink-0 text-blue-300" />
                                    <img src={signature} alt="Your signature" className="h-9 min-w-0 flex-1 object-contain" />
                                    <button type="button" onClick={() => setEditSignature(true)} title="Change signature" className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"><RefreshCw className="h-3.5 w-3.5" /></button>
                                </div>
                            ) : (
                                <button type="button" onClick={() => setEditSignature(true)}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/40 px-3 py-3 text-xs font-semibold text-blue-600 transition hover:bg-blue-50">
                                    <PenLine className="h-4 w-4" /> Add your signature
                                </button>
                            )}
                            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{signature ? "Drag it onto the document to pre-sign it for the driver." : "Create it once, then drag it onto any document to pre-sign."}</p>
                        </div>

                        {/* Step 2 — Fields the driver fills */}
                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                            <div className="mb-1.5 flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-50 text-violet-600"><LayoutList className="h-3.5 w-3.5" /></span>
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Fields</p>
                            </div>
                            <p className="mb-3 text-[11px] leading-relaxed text-slate-400">Drag onto the document — these are what the driver fills in.</p>
                            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                                {FIELD_TYPES.map((f) => (
                                    <div key={f.type} draggable onDragStart={(e) => e.dataTransfer.setData("field-type", f.type)}
                                        className={cn("flex cursor-grab items-center gap-2.5 rounded-lg border border-l-4 border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:cursor-grabbing", FIELD_COLOR[f.type].tag.split(" ")[0])}>
                                        <GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                                        <f.Icon className="h-4 w-4 shrink-0 text-slate-500" />
                                        <span className="truncate">{f.label}</span>
                                    </div>
                                ))}
                            </div>
                            {fields.length > 0 && (
                                <div className="mt-3 flex gap-2">
                                    <button type="button" onClick={selectAll} className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50">Select all ({fields.length})</button>
                                    <button type="button" onClick={removeAll} className="flex-1 rounded-md border border-rose-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-rose-500 transition hover:bg-rose-50">Remove all</button>
                                </div>
                            )}
                            <p className="mt-3 border-t border-slate-100 pt-2.5 text-[11px] leading-relaxed text-slate-400">Drag on the page to select · Shift-click adds · <span className="font-semibold">Ctrl/⌘+A</span> all · <span className="font-semibold">Ctrl/⌘+D</span> duplicate · <span className="font-semibold">Del</span> remove.</p>
                        </div>
                    </aside>

                    <div ref={scrollRef} className="min-w-0 overflow-x-auto">
                        <div className="mx-auto flex flex-col gap-6" style={{ width: pageWidth }}>
                            {fields.length === 0 && (
                                <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-blue-300 bg-blue-50/60 px-4 py-3 text-sm text-blue-800">
                                    <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                                    <span><span className="font-semibold">Start here:</span> drag a field from the left onto the document below — that's what the driver completes. Drag <span className="font-semibold">your signature</span> to pre-sign it yourself.</span>
                                </div>
                            )}
                            {documents.map((file, di) => (
                                <div key={file.id}>
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <p className="flex min-w-0 items-center gap-2 truncate text-sm font-semibold text-slate-700">
                                            <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                                            <span className="truncate">{documents.length > 1 ? `${di + 1}. ` : ""}{file.fileName}</span>
                                            <span className="shrink-0 font-normal text-slate-400">· {file.pageCount} page{file.pageCount !== 1 ? "s" : ""}</span>
                                        </p>
                                        {documents.length > 1 && <button type="button" onClick={() => removeDocument(file.id)} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /> Remove</button>}
                                    </div>
                                    <DocPages file={file} width={pageWidth} onClear={() => setSelection(new Set())} onDropAt={(page, e) => onDropAt(file.id, page, e)}
                                        onMarquee={(page, rect, x, y) => startMarquee(file.id, page, rect, x, y)}
                                        renderFields={(page) => (<>
                                            {fields.filter((f) => f.docId === file.id && f.page === page).map((f) => (
                                                <FieldChip key={f.id} f={f} selected={selection.has(f.id)} single={selection.size === 1}
                                                    onDown={(e) => startMove(e, f)} onResizeDir={(e, dir) => startResize(e, f, dir)}
                                                    onDuplicate={() => duplicateOne(f.id)} onRemove={() => removeOne(f.id)} />
                                            ))}
                                            {marqueeBox && marqueeBox.docId === file.id && marqueeBox.page === page && (
                                                <div className="pointer-events-none absolute z-40 rounded-sm border-2 border-blue-500 bg-blue-500/10"
                                                    style={{ left: `${marqueeBox.left}%`, top: `${marqueeBox.top}%`, width: `${marqueeBox.w}%`, height: `${marqueeBox.h}%` }} />
                                            )}
                                        </>)} />
                                </div>
                            ))}
                            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white py-3.5 text-sm font-semibold text-slate-500 transition hover:border-blue-300 hover:bg-blue-50/40">
                                <Plus className="h-4 w-4" /> Add another document <span className="font-normal text-slate-400">· optional</span>
                                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => addDocument(e.target.files?.[0])} />
                            </label>
                        </div>
                    </div>

                    <aside className="lg:sticky lg:top-20 lg:self-start">
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{selField ? "Field" : selection.size > 1 ? `${selection.size} fields` : "Template"}</p>
                        {selField ? (
                            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                    {(() => { const I = fieldMeta(selField.type).Icon; return <I className="h-4 w-4 text-slate-500" />; })()}
                                    {fieldMeta(selField.type).label}
                                </div>
                                {isSigType(selField.type) ? (
                                    <>
                                        {/* Either pre-sign it, or ask the driver to sign */}
                                        <div>
                                            <p className="mb-1 text-xs font-semibold text-slate-500">Who signs this?</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button type="button" onClick={() => setSigning(selField.id, "driver")}
                                                    className={cn("inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold transition", !selField.stampDataUrl ? "border-amber-400 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-500 hover:bg-slate-50")}>
                                                    <User className="h-3.5 w-3.5" /> Ask driver
                                                </button>
                                                <button type="button" onClick={() => setSigning(selField.id, "self")}
                                                    className={cn("inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold transition", selField.stampDataUrl ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:bg-slate-50")}>
                                                    <PenLine className="h-3.5 w-3.5" /> You sign it
                                                </button>
                                            </div>
                                        </div>
                                        {selField.stampDataUrl ? (
                                            <>
                                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><img src={selField.stampDataUrl} alt="signature" className="mx-auto h-10 object-contain" /></div>
                                                <p className="text-xs text-slate-400">Pre-signed with your signature — the driver receives this already signed.</p>
                                            </>
                                        ) : (
                                            <>
                                                <label className="block text-xs font-semibold text-slate-500">Label
                                                    <Input value={selField.label} onChange={(e) => updateField(selField.id, { label: e.target.value })} className="mt-1 h-9" />
                                                </label>
                                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                                    <input type="checkbox" checked={selField.required} onChange={(e) => updateField(selField.id, { required: e.target.checked })} className="h-4 w-4 rounded border-slate-300" /> Required
                                                </label>
                                                <p className="text-xs text-slate-400">The driver signs this when they open the document.</p>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <label className="block text-xs font-semibold text-slate-500">Label
                                            <Input value={selField.label} onChange={(e) => updateField(selField.id, { label: e.target.value })} className="mt-1 h-9" />
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-slate-700">
                                            <input type="checkbox" checked={selField.required} onChange={(e) => updateField(selField.id, { required: e.target.checked })} className="h-4 w-4 rounded border-slate-300" /> Required
                                        </label>
                                    </>
                                )}
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={duplicateSelected}><Copy className="h-4 w-4" /> Duplicate</Button>
                                    <Button variant="outline" size="sm" className="flex-1 text-rose-500 hover:text-rose-600" onClick={removeSelected}><Trash2 className="h-4 w-4" /> Remove</Button>
                                </div>
                            </div>
                        ) : selection.size > 1 ? (
                            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                                <p className="text-sm text-slate-600">{selection.size} fields selected. Drag any one to move them together.</p>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={duplicateSelected}><Copy className="h-4 w-4" /> Duplicate</Button>
                                    <Button variant="outline" size="sm" className="flex-1 text-rose-500 hover:text-rose-600" onClick={removeSelected}><Trash2 className="h-4 w-4" /> Remove</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                                <p className="text-xs leading-relaxed text-slate-400">Select a field on the document to edit it. Nothing selected — here's your template so far.</p>
                                {/* At-a-glance summary */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                                        <p className="text-lg font-bold leading-none text-slate-800">{fields.length - stampCount}</p>
                                        <p className="mt-1 text-[11px] font-medium text-slate-500">driver fields</p>
                                    </div>
                                    <div className={cn("rounded-lg border px-2.5 py-2", stampCount > 0 ? "border-blue-100 bg-blue-50" : "border-slate-100 bg-slate-50")}>
                                        <p className={cn("text-lg font-bold leading-none", stampCount > 0 ? "text-blue-700" : "text-slate-800")}>{stampCount}</p>
                                        <p className={cn("mt-1 text-[11px] font-medium", stampCount > 0 ? "text-blue-600" : "text-slate-500")}>pre-signed</p>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    {documents.map((d, i) => (
                                        <div key={d.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-xs">
                                            <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                            <span className="truncate text-slate-600">{documents.length > 1 ? `${i + 1}. ` : ""}{d.fileName}</span>
                                            <span className="ml-auto shrink-0 text-slate-400">{fields.filter((f) => f.docId === d.id).length} field{fields.filter((f) => f.docId === d.id).length !== 1 ? "s" : ""}</span>
                                        </div>
                                    ))}
                                </div>
                                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/40 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50">
                                    <Plus className="h-4 w-4" /> Add document
                                    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => addDocument(e.target.files?.[0])} />
                                </label>
                                {!name.trim() && <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] font-medium text-amber-700"><Pencil className="h-3 w-3 shrink-0" /> Name your template up top to enable Save.</p>}
                            </div>
                        )}
                    </aside>
                </div>
            )}

            {signFor && (
                <SignatureCreator
                    label={fields.find((f) => f.id === signFor)?.type === "initials" ? "initials" : "signature"}
                    savedSignature={signature}
                    onClose={() => setSignFor(null)}
                    onApply={(v, save) => { setValues((s) => ({ ...s, [signFor]: v })); if (save) saveSignature(v); setSignFor(null); }}
                />
            )}
            {editSignature && (
                <SignatureCreator
                    title="Your account signature"
                    onClose={() => { setEditSignature(false); setStampAfter(null); }}
                    onApply={(v) => { saveSignature(v); if (stampAfter) { updateField(stampAfter, { stampDataUrl: v, required: false }); setStampAfter(null); } setEditSignature(false); }}
                />
            )}
        </div>
    );
}

// One document's pages (loads its own PDF). renderFields draws overlay fields per page.
function DocPages({ file, width, onDropAt, onClear, renderFields, onMarquee }: { file: DocFile; width: number; onDropAt: (page: number, e: React.DragEvent) => void; onClear: () => void; renderFields: (page: number) => React.ReactNode; onMarquee?: (page: number, rect: DOMRect, clientX: number, clientY: number) => void }) {
    const doc = usePdfDoc(file);
    return (
        <div className="flex w-full flex-col items-center gap-4">
            {doc ? Array.from({ length: file.pageCount }, (_, i) => (
                <PageCanvas key={i} doc={doc} index={i} width={width} onClear={onClear} onDrop={(e) => onDropAt(i, e)} onMarquee={onMarquee ? (rect, x, y) => onMarquee(i, rect, x, y) : undefined}>
                    {renderFields(i)}
                </PageCanvas>
            )) : <div className="py-16 text-sm text-slate-400">Rendering {file.fileName}…</div>}
        </div>
    );
}

function PageCanvas({ doc, index, width, onDrop, onClear, children, onMarquee }: { doc: PDFDocumentProxy; index: number; width: number; onDrop: (e: React.DragEvent) => void; onClear: () => void; children: React.ReactNode; onMarquee?: (rect: DOMRect, clientX: number, clientY: number) => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const [h, setH] = useState(width * 1.294);
    useEffect(() => {
        let cancelled = false;
        let task: { promise: Promise<void>; cancel: () => void } | null = null;
        (async () => {
            const page = await doc.getPage(index + 1);
            if (cancelled) return;
            const base = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({ scale: width / base.width });
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
    }, [doc, index, width]);

    return (
        <div ref={wrapRef} data-pagewrap className="relative select-none overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            style={{ width, height: h }}
            onPointerDown={(e) => {
                if (e.target === canvasRef.current || e.target === wrapRef.current) {
                    onClear();
                    if (onMarquee && wrapRef.current) { e.preventDefault(); onMarquee(wrapRef.current.getBoundingClientRect(), e.clientX, e.clientY); }
                }
            }}
            onDragStart={(e) => e.preventDefault()}
            onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
            <canvas ref={canvasRef} draggable={false} className="block h-full w-full" />
            <div className="pointer-events-none absolute left-2 top-2 rounded bg-slate-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">Page {index + 1}</div>
            {children}
        </div>
    );
}

// Selection chrome — a floating toolbar (duplicate / delete) above the box plus
// eight resize handles around it, shown only when a single field is selected.
function SelectionChrome({ f, single, onResizeDir, onDuplicate, onRemove }: { f: DocField; single: boolean; onResizeDir: (e: React.PointerEvent, dir: Dir) => void; onDuplicate: () => void; onRemove: () => void }) {
    const stop = (e: React.PointerEvent) => e.stopPropagation();
    // Flip the toolbar below the box when the field sits near the top of the page.
    const below = f.yPct < 12;
    return (
        <>
            <div onPointerDown={stop}
                className={cn("absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-1 py-1 shadow-md", below ? "top-full mt-1.5" : "bottom-full mb-1.5")}>
                <button type="button" title="Duplicate" onPointerDown={stop} onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700"><Copy className="h-3.5 w-3.5" /></button>
                <button type="button" title="Delete" onPointerDown={stop} onClick={(e) => { e.stopPropagation(); onRemove(); }} className="flex h-6 w-6 items-center justify-center rounded text-rose-500 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            {single && HANDLES.map((h) => (
                <span key={h.dir} onPointerDown={(e) => onResizeDir(e, h.dir)}
                    className={cn("absolute z-30 h-2.5 w-2.5 touch-none rounded-full border-2 border-blue-500 bg-white shadow-sm", h.pos, h.cursor)} />
            ))}
        </>
    );
}

function FieldChip({ f, selected, single, onDown, onResizeDir, onDuplicate, onRemove }: { f: DocField; selected: boolean; single: boolean; onDown: (e: React.PointerEvent) => void; onResizeDir: (e: React.PointerEvent, dir: Dir) => void; onDuplicate: () => void; onRemove: () => void }) {
    const Icon = fieldMeta(f.type).Icon;
    const c = FIELD_COLOR[f.type];
    const isSig = isSigType(f.type);
    const isCheckbox = f.type === "checkbox";
    const chrome = selected && <SelectionChrome f={f} single={single} onResizeDir={onResizeDir} onDuplicate={onDuplicate} onRemove={onRemove} />;

    // Pre-applied account signature — render the actual image, still movable/resizable.
    if (f.stampDataUrl) {
        return (
            <div onPointerDown={onDown}
                className={cn("group absolute flex touch-none items-center justify-center rounded-[3px] border-2 border-blue-400 bg-blue-50/60 shadow-sm", selected ? "z-20 ring-2 ring-blue-400 ring-offset-1" : "hover:brightness-[0.98]")}
                style={{ left: `${f.xPct}%`, top: `${f.yPct}%`, width: `${f.wPct}%`, height: `${f.hPct}%`, cursor: "move" }}>
                <img src={f.stampDataUrl} alt="Your signature" className="pointer-events-none h-full w-full object-contain p-0.5" />
                <span className="pointer-events-none absolute left-0.5 top-0.5 rounded bg-blue-600 px-1 text-[8px] font-bold uppercase leading-tight text-white">Signed</span>
                {chrome}
            </div>
        );
    }

    return (
        <div onPointerDown={onDown}
            className={cn("group absolute flex touch-none flex-col rounded-[3px] border-2 shadow-sm", c.tag, selected ? cn("z-20 ring-2 ring-offset-1", c.ring) : "overflow-hidden hover:brightness-[0.97]")}
            style={{ left: `${f.xPct}%`, top: `${f.yPct}%`, width: `${f.wPct}%`, height: `${f.hPct}%`, cursor: "move" }}>
            <div className="flex h-full w-full flex-col overflow-hidden">
                {isCheckbox ? (
                    <div className="flex h-full w-full items-center justify-center"><Icon className="h-3.5 w-3.5" /></div>
                ) : (
                    <>
                        <div className="flex items-center gap-1 px-1 pt-0.5 leading-none">
                            <Icon className="h-3 w-3 shrink-0" />
                            <span className="truncate text-[10px] font-bold uppercase tracking-wide">{f.label}{f.required && <span className="text-rose-500">*</span>}</span>
                        </div>
                        <div className="flex flex-1 items-end px-1 pb-0.5">
                            {isSig ? <span className="flex w-full items-center gap-1 border-b-2 border-dashed border-current pb-0.5 text-[9px] font-semibold italic opacity-70">Sign here</span> : <span className="h-1.5 w-full rounded-sm bg-white/50" />}
                        </div>
                    </>
                )}
            </div>
            {chrome}
        </div>
    );
}

// Interactive recipient field — type text, toggle checkbox, or click to sign.
// A pre-applied account signature renders as a locked image.
function PreviewField({ f, value, onChange, onSign }: { f: DocField; value?: string; onChange: (v: string) => void; onSign: () => void }) {
    const Icon = fieldMeta(f.type).Icon;
    const isSig = isSigType(f.type);
    const filled = !!value;
    const pos: React.CSSProperties = { left: `${f.xPct}%`, top: `${f.yPct}%`, width: `${f.wPct}%`, height: `${f.hPct}%` };

    if (f.stampDataUrl) {
        return (
            <div className="absolute flex items-center justify-center overflow-hidden rounded-[3px] border-2 border-blue-300 bg-blue-50/40" style={pos}>
                <img src={f.stampDataUrl} alt="signature" className="h-full w-full object-contain p-0.5" />
                <span className="absolute right-0.5 top-0.5 rounded bg-white/80 px-1 text-[8px] font-semibold text-blue-600">Signed</span>
            </div>
        );
    }
    if (f.type === "checkbox") {
        return (
            <button type="button" onClick={() => onChange(value ? "" : "1")}
                className="absolute flex items-center justify-center rounded-[3px] border-2 border-amber-400 bg-amber-50 shadow-sm"
                style={pos}>
                {value ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : null}
            </button>
        );
    }
    return (
        <div className={cn("absolute flex flex-col overflow-hidden rounded-[3px] border-2 shadow-sm", filled ? "border-emerald-400 bg-emerald-50/70" : "border-amber-400 bg-amber-50")}
            style={pos}>
            {isSig ? (
                value ? (
                    <div className="relative h-full w-full">
                        <img src={value} alt="signature" className="h-full w-full object-contain p-0.5" />
                        <button type="button" onClick={() => onChange("")} className="absolute right-0.5 top-0.5 rounded bg-white/80 px-1 text-[8px] font-semibold text-slate-500 hover:text-rose-600">clear</button>
                    </div>
                ) : (
                    <button type="button" onClick={onSign} className="flex h-full w-full flex-col justify-center px-1 text-left text-amber-800">
                        <span className="flex items-center gap-1 truncate text-[10px] font-bold uppercase leading-none"><Icon className="h-3 w-3 shrink-0" /> {f.label}{f.required && <span className="text-rose-500">*</span>}</span>
                        <span className="mt-0.5 border-b-2 border-dashed border-amber-500 pb-0.5 text-[9px] font-semibold italic text-amber-700/80">Click to sign</span>
                    </button>
                )
            ) : (
                <label className="flex h-full w-full flex-col px-1 py-0.5">
                    <span className="truncate text-[9px] font-bold uppercase leading-none text-slate-500">{f.label}{f.required && <span className="text-rose-500">*</span>}</span>
                    <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} type={inputType(f.type)}
                        className="min-h-0 w-full flex-1 bg-transparent text-[11px] font-medium text-slate-800 outline-none" />
                </label>
            )}
        </div>
    );
}

function UploadPane({ onUpload, warn }: { onUpload: (f: File | undefined) => void; warn: string | null }) {
    const [over, setOver] = useState(false);
    return (
        <div className="mx-auto max-w-2xl px-6 py-16">
            <label onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
                onDrop={(e) => { e.preventDefault(); setOver(false); onUpload(e.dataTransfer.files?.[0]); }}
                className={cn("flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition", over ? "border-blue-400 bg-blue-50/50" : "border-slate-300 bg-white hover:bg-slate-50")}>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-500"><UploadCloud className="h-7 w-7" /></div>
                <p className="mt-4 text-base font-bold text-slate-800">Upload a PDF to build a template</p>
                <p className="mt-1 text-sm text-slate-500">Click to upload or drag &amp; drop · PDF · you can add more documents after</p>
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} />
            </label>
            {warn && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{warn}</p>}
        </div>
    );
}
