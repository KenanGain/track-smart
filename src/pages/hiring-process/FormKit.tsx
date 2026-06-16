import { useRef, useState } from "react";
import { UploadCloud, CornerDownRight, Trash2, FileText, X, Check, AlertCircle, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select as ShadSelect, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

/** Shared building blocks for hiring-process forms (Driver License, Abstract/MVR, …). */

export function Field({ label, required, hint, children, className }: {
    label: string; required?: boolean; hint?: string; children: React.ReactNode; className?: string;
}) {
    return (
        <div className={className}>
            <Label className="text-slate-700">{label}{required && <span className="text-rose-500"> *</span>}</Label>
            {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
            <div className="mt-1.5">{children}</div>
        </div>
    );
}

export function Grid({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">{children}</div>;
}

export function SelectBox({ value, onChange, items, placeholder, disabled }: {
    value: string; onChange: (v: string) => void; items: string[]; placeholder?: string; disabled?: boolean;
}) {
    return (
        <ShadSelect value={value} onValueChange={onChange}>
            <SelectTrigger disabled={disabled}><SelectValue placeholder={placeholder ?? "Select..."} /></SelectTrigger>
            <SelectContent>{items.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
        </ShadSelect>
    );
}

export function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
    return (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <span className="pr-4 text-sm font-semibold text-slate-800">{label}</span>
            <Switch checked={checked} onCheckedChange={onChange} />
        </div>
    );
}

export function RevealPanel({ title, children }: { title?: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-blue-600"><CornerDownRight className="h-3.5 w-3.5" /> Please provide the details</p>
            {title && <p className="mt-2 text-sm font-semibold text-slate-800">{title}</p>}
            <div className="mt-3 space-y-2">{children}</div>
        </div>
    );
}

export function UploadBox({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    const ref = useRef<HTMLInputElement>(null);
    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => onChange(String(reader.result));
        reader.readAsDataURL(f);
    };
    return (
        <div>
            <Label className="text-slate-700">{label}</Label>
            <div className="mt-1.5">
                {value ? (
                    <div className="relative overflow-hidden rounded-lg border border-slate-200">
                        <img src={value} alt={label} className="h-40 w-full object-cover" />
                        <button type="button" onClick={() => onChange("")} className="absolute right-2 top-2 rounded-md bg-white/90 p-1.5 text-slate-500 shadow hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                ) : (
                    <button type="button" onClick={() => ref.current?.click()} className="flex h-40 w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-blue-300 hover:text-blue-500">
                        <UploadCloud className="h-6 w-6" />
                        <span className="text-sm font-medium">Upload {label.toLowerCase()}</span>
                        <span className="text-xs">PNG or JPG</span>
                    </button>
                )}
                <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onFile} />
            </div>
        </div>
    );
}

/** Draw-to-sign pad (mouse + touch). Emits a data-URL on each stroke. */
export function SignaturePad({ label = "Signature", onChange }: { label?: string; onChange: (v: string) => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const [mode, setMode] = useState<"draw" | "type">("draw");
    const [typed, setTyped] = useState("");
    const point = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = canvasRef.current!.getBoundingClientRect(); const sx = canvasRef.current!.width / r.width, sy = canvasRef.current!.height / r.height; return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy }; };
    const start = (e: React.PointerEvent<HTMLCanvasElement>) => { if (mode !== "draw") return; const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return; drawing.current = true; const p = point(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const move = (e: React.PointerEvent<HTMLCanvasElement>) => { if (!drawing.current) return; const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return; const p = point(e); ctx.lineTo(p.x, p.y); ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke(); };
    const end = () => { if (drawing.current) { drawing.current = false; const c = canvasRef.current; if (c) onChange(c.toDataURL()); } };
    // Render a typed name onto the canvas in a script font → signature image.
    const renderTyped = (name: string) => {
        const c = canvasRef.current; const ctx = c?.getContext("2d");
        if (!c || !ctx) return;
        ctx.clearRect(0, 0, c.width, c.height);
        if (name.trim()) {
            ctx.fillStyle = "#1e293b";
            ctx.font = "52px 'Segoe Script', 'Brush Script MT', 'Snell Roundhand', cursive";
            ctx.textBaseline = "middle";
            ctx.fillText(name, 24, c.height / 2);
            onChange(c.toDataURL());
        } else { onChange(""); }
    };
    const clearCanvas = () => { const c = canvasRef.current; const ctx = c?.getContext("2d"); if (c && ctx) ctx.clearRect(0, 0, c.width, c.height); };
    const clear = () => { clearCanvas(); setTyped(""); onChange(""); };
    const switchMode = (m: "draw" | "type") => { setMode(m); clearCanvas(); setTyped(""); onChange(""); };
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Label className="text-slate-700">✎ {label}</Label>
                <div className="flex items-center gap-1.5">
                    <div className="flex rounded-md border border-slate-200 bg-white p-0.5">
                        {(["draw", "type"] as const).map((m) => (
                            <button key={m} type="button" onClick={() => switchMode(m)} className={cn("rounded px-2.5 py-1 text-xs font-semibold capitalize transition", mode === m ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700")}>{m}</button>
                        ))}
                    </div>
                    <button type="button" onClick={clear} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:text-rose-500"><Trash2 className="h-3 w-3" /> Clear</button>
                </div>
            </div>
            {mode === "type" && (
                <Input value={typed} onChange={(e) => { setTyped(e.target.value); renderTyped(e.target.value); }} placeholder="Type your full name" className="mb-2 bg-white" />
            )}
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                <canvas ref={canvasRef} width={680} height={150} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} className={cn("block w-full", mode === "draw" ? "touch-none" : "pointer-events-none")} style={{ height: 150 }} />
            </div>
            <p className="mt-1 text-xs text-slate-400">{mode === "draw" ? "Draw your signature above using your mouse or finger." : "Your typed name is rendered as your signature above."}</p>
        </div>
    );
}

/** Bordered checkbox rows (multi-select), optionally two columns. */
export function CheckRows({ items, selected, onToggle, cols = 1 }: { items: string[]; selected: string[]; onToggle: (v: string) => void; cols?: 1 | 2 }) {
    return (
        <div className={cn("grid gap-2", cols === 2 ? "sm:grid-cols-2" : "grid-cols-1")}>
            {items.map((it) => (
                <label key={it} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition hover:border-slate-300">
                    <Checkbox checked={selected.includes(it)} onCheckedChange={() => onToggle(it)} /> {it}
                </label>
            ))}
        </div>
    );
}

/** Bordered radio rows (single-select), optionally two columns. */
export function RadioRows({ items, value, onChange, cols = 1 }: { items: string[]; value: string; onChange: (v: string) => void; cols?: 1 | 2 }) {
    return (
        <div className={cn("grid gap-2", cols === 2 ? "sm:grid-cols-2" : "grid-cols-1")}>
            {items.map((it) => {
                const on = value === it;
                return (
                    <button key={it} type="button" onClick={() => onChange(it)} className={cn("flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-left text-sm transition", on ? "border-blue-400 bg-blue-50 font-medium text-blue-700" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300")}>
                        <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", on ? "border-blue-600" : "border-slate-300")}>{on && <span className="h-2 w-2 rounded-full bg-blue-600" />}</span>
                        {it}
                    </button>
                );
            })}
        </div>
    );
}

/** Labeled inline Yes / No (/ N/A) question in a bordered row. */
export function YesNoField({ label, value, onChange, options = ["Yes", "No"] }: { label: string; value: string; onChange: (v: string) => void; options?: string[] }) {
    return (
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="pr-4 text-sm font-medium text-slate-700">{label}</span>
            <div className="inline-flex shrink-0 gap-2">
                {options.map((o) => (
                    <button key={o} type="button" onClick={() => onChange(o)} className={cn("rounded-md border px-4 py-1.5 text-sm font-semibold transition", value === o ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>{o}</button>
                ))}
            </div>
        </div>
    );
}

/** U / S / G / E rating (label + 2×2 radio). */
export function RatingGroup({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div>
            <p className="mb-1.5 text-sm font-semibold text-slate-700">{label}</p>
            <RadioRows items={["Unsatisfactory", "Satisfactory", "Good", "Excellent"]} value={value} onChange={onChange} cols={2} />
        </div>
    );
}

/** Multi-file dropzone (Choose Files / Or Drag It Here) with file chips. */
export function FilesUpload({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
    const ref = useRef<HTMLInputElement>(null);
    const [names, setNames] = useState<string[]>([]);
    const add = (files: FileList) => {
        const arr = Array.from(files);
        Promise.all(arr.map((f) => new Promise<{ u: string; n: string }>((res) => { const r = new FileReader(); r.onload = () => res({ u: String(r.result), n: f.name }); r.readAsDataURL(f); })))
            .then((res) => { onChange([...value, ...res.map((x) => x.u)]); setNames((n) => [...n, ...res.map((x) => x.n)]); });
    };
    const removeAt = (i: number) => { onChange(value.filter((_, idx) => idx !== i)); setNames((n) => n.filter((_, idx) => idx !== i)); };
    return (
        <div>
            <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.length) add(e.dataTransfer.files); }} className="rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/30 p-6">
                <div className="flex flex-col items-center gap-2 text-center">
                    <UploadCloud className="h-7 w-7 text-slate-300" />
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => ref.current?.click()} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Choose Files</button>
                        <span className="text-sm text-slate-400">{value.length ? `${value.length} file(s)` : "No file chosen"}</span>
                    </div>
                    <button type="button" onClick={() => ref.current?.click()} className="text-sm font-medium text-blue-600 hover:underline">Or Drag It Here.</button>
                </div>
                <input ref={ref} type="file" accept="application/pdf,image/*" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) add(e.target.files); }} />
            </div>
            {value.length > 0 && (
                <div className="mt-2 space-y-1.5">
                    {value.map((_, i) => (
                        <div key={i} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm">
                            <span className="inline-flex items-center gap-2 text-slate-700"><FileText className="h-4 w-4 text-blue-600" /> {names[i] || `File ${i + 1}`}</span>
                            <button type="button" onClick={() => removeAt(i)} className="text-slate-400 hover:text-rose-500"><X className="h-4 w-4" /></button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/** Single PDF/image upload with a Choose-File + drag-and-drop dropzone. */
export function PdfUpload({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const ref = useRef<HTMLInputElement>(null);
    const [name, setName] = useState("");
    const read = (f: File) => { setName(f.name); const r = new FileReader(); r.onload = () => onChange(String(r.result)); r.readAsDataURL(f); };
    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) read(f); };
    const onDrop = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) read(f); };
    if (value) {
        return (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm"><FileText className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{name || "Attached file"}</p>
                    <p className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check className="h-3.5 w-3.5" /> Uploaded</p>
                </div>
                <button type="button" onClick={() => ref.current?.click()} className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">Replace</button>
                <button type="button" onClick={() => { onChange(""); setName(""); }} className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-white hover:text-rose-500"><X className="h-4 w-4" /></button>
                <input ref={ref} type="file" accept="application/pdf,image/*" className="hidden" onChange={onFile} />
            </div>
        );
    }
    return (
        <button
            type="button"
            onClick={() => ref.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="group flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-7 text-center transition hover:border-blue-300 hover:bg-blue-50/40"
        >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-500 transition group-hover:bg-blue-100"><UploadCloud className="h-5 w-5" /></span>
            <span className="text-sm text-slate-600"><span className="font-semibold text-blue-600">Click to upload</span> or drag &amp; drop</span>
            <span className="text-xs text-slate-400">PDF or image · up to 10MB</span>
            <input ref={ref} type="file" accept="application/pdf,image/*" className="hidden" onChange={onFile} />
        </button>
    );
}

/** Multi-file uploader (e.g. multi-page MVR / abstract report). */
export function DocumentsUpload({ label, hint, value, onChange }: { label: string; hint?: string; value: string[]; onChange: (v: string[]) => void }) {
    const ref = useRef<HTMLInputElement>(null);
    const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;
        Promise.all(files.map((f) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f); })))
            .then((urls) => onChange([...value, ...urls]));
    };
    return (
        <div>
            <Label className="text-slate-700">{label}</Label>
            {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
            <div className="mt-1.5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {value.map((src, i) => (
                    <div key={i} className="relative overflow-hidden rounded-lg border border-slate-200">
                        {src.startsWith("data:image")
                            ? <img src={src} alt={`Page ${i + 1}`} className="h-28 w-full object-cover" />
                            : <div className="flex h-28 w-full flex-col items-center justify-center gap-1 bg-slate-50 text-slate-400"><FileText className="h-6 w-6" /><span className="text-[11px] font-medium">Document {i + 1}</span></div>}
                        <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))} className="absolute right-1.5 top-1.5 rounded-md bg-white/90 p-1 text-slate-500 shadow hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                ))}
                <button type="button" onClick={() => ref.current?.click()} className="flex h-28 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-blue-300 hover:text-blue-500">
                    <UploadCloud className="h-5 w-5" />
                    <span className="text-xs font-medium">Upload</span>
                    <span className="text-[10px]">PNG · JPG · PDF</span>
                </button>
            </div>
            <input ref={ref} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={onFiles} />
        </div>
    );
}

// ── Read-only review primitives (shared by the License / MVR review steps) ──────
export function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

/** A read-only field — label + boxed value. */
export function RoField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">{label}</label>
            <div className="min-h-[38px] rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800">{value || <span className="text-slate-300">—</span>}</div>
        </div>
    );
}

/** An uploaded-document tile with a View action, or a "not provided" placeholder. */
export function ReviewDocTile({ title, filename, uploaded, onView }: { title: string; filename: string; uploaded: boolean; onView: () => void }) {
    if (!uploaded) {
        return (
            <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">{title}</p>
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-amber-400 shadow-sm"><UploadCloud className="h-5 w-5" /></div>
                    <div><p className="text-sm font-semibold text-amber-700">Not provided</p><p className="text-xs text-amber-600">No document on file</p></div>
                </div>
            </div>
        );
    }
    return (
        <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">{title}</p>
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-500 shadow-sm"><FileText className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{filename}</p>
                    <p className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check className="h-3.5 w-3.5" /> Uploaded</p>
                </div>
                <Button variant="outline" size="sm" className="h-7 shrink-0 gap-1 px-2 text-xs" onClick={onView}><Eye className="h-3.5 w-3.5" /> View</Button>
            </div>
        </div>
    );
}

/** A single ✓ / ! review-checklist line. */
export function CheckLine({ ok, label }: { ok: boolean; label: string }) {
    return (
        <li className="flex items-center gap-2 text-sm">
            {ok ? <Check className="h-4 w-4 shrink-0 text-emerald-500" /> : <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />}
            <span className={ok ? "text-slate-700" : "text-amber-700"}>{label}</span>
        </li>
    );
}

/** Remarks & comments block (local state). */
export type RemarkItem = { id: number; text: string };

/** Remarks & comments. Optionally controlled via value/onChange so the parent can
 *  surface the remarks in a PDF document; falls back to internal state otherwise. */
export function ReviewRemarks({ value, onChange }: { value?: RemarkItem[]; onChange?: (v: RemarkItem[]) => void } = {}) {
    const [draft, setDraft] = useState("");
    const [internal, setInternal] = useState<RemarkItem[]>([]);
    const items = value ?? internal;
    const setItems = (next: RemarkItem[]) => { if (onChange) onChange(next); else setInternal(next); };
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Remarks &amp; Comments</p>
            <div className="mt-2 flex gap-2">
                <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder="Add a remark or comment…" className="resize-none" />
                <Button size="sm" className="self-end" disabled={!draft.trim()} onClick={() => { setItems([{ id: items.length, text: draft.trim() }, ...items]); setDraft(""); }}>Add</Button>
            </div>
            {items.length > 0 && (
                <div className="mt-3 space-y-2">
                    {items.map((r) => <div key={r.id} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-[13px] text-slate-700">{r.text}</div>)}
                </div>
            )}
        </div>
    );
}

export type SignOffData = { name: string; role: string; date: string; sig: string; done: boolean };
export const newSignOff = (): SignOffData => ({ name: "", role: "Hiring Manager", date: todayISO(), sig: "", done: false });

/** Reviewer sign-off — name / role / date / signature. Optionally controlled via
 *  value/onChange so the parent can include the signed data in a PDF document. */
export function ReviewSignOff({ heading, value, onChange }: { heading: string; value?: SignOffData; onChange?: (v: SignOffData) => void }) {
    const [internal, setInternal] = useState<SignOffData>(newSignOff);
    const data = value ?? internal;
    const patch = (p: Partial<SignOffData>) => { const next = { ...data, ...p }; if (onChange) onChange(next); else setInternal(next); };
    const { name, role, date, sig, done } = data;
    const setName = (v: string) => patch({ name: v });
    const setRole = (v: string) => patch({ role: v });
    const setDate = (v: string) => patch({ date: v });
    const setSig = (v: string) => patch({ sig: v });
    const setDone = (v: boolean) => patch({ done: v });
    return (
        <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">Reviewer Sign-Off</p>
            <h3 className="mt-0.5 text-base font-semibold text-slate-900">{heading}</h3>
            <p className="mt-1 text-sm text-slate-500">Confirm you have reviewed the form above. Your name, title, date and signature are recorded on file.</p>
            {done ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><Check className="h-4 w-4" /> Reviewed &amp; signed</p>
                    <div className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                        <p><span className="text-slate-500">Reviewed by:</span> <span className="font-semibold text-slate-800">{name}</span></p>
                        <p><span className="text-slate-500">Title:</span> <span className="font-semibold text-slate-800">{role}</span></p>
                        <p><span className="text-slate-500">Date:</span> <span className="font-semibold text-slate-800">{date}</span></p>
                    </div>
                    {sig && <div className="mt-3"><span className="text-sm text-slate-500">Signature:</span><img src={sig} alt="signature" className="mt-1 h-16 rounded border border-slate-200 bg-white" /></div>}
                </div>
            ) : (
                <>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                        <div><Label className="mb-1 block text-xs font-semibold text-slate-600">Reviewer name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></div>
                        <div><Label className="mb-1 block text-xs font-semibold text-slate-600">Title / role</Label><Input value={role} onChange={(e) => setRole(e.target.value)} /></div>
                        <div><Label className="mb-1 block text-xs font-semibold text-slate-600">Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                    </div>
                    <div className="mt-4"><Label className="mb-1 block text-xs font-semibold text-slate-600">Signature</Label><SignaturePad onChange={setSig} /></div>
                    <Button className="mt-4" disabled={!sig || !name.trim()} onClick={() => setDone(true)}><Check className="h-4 w-4" /> Confirm review &amp; sign</Button>
                </>
            )}
        </div>
    );
}
