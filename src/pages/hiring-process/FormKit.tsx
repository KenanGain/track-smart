import { useRef, useState } from "react";
import { UploadCloud, CornerDownRight, Trash2, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
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
    const point = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = canvasRef.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const start = (e: React.PointerEvent<HTMLCanvasElement>) => { const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return; drawing.current = true; const p = point(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const move = (e: React.PointerEvent<HTMLCanvasElement>) => { if (!drawing.current) return; const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return; const p = point(e); ctx.lineTo(p.x, p.y); ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke(); };
    const end = () => { if (drawing.current) { drawing.current = false; const c = canvasRef.current; if (c) onChange(c.toDataURL()); } };
    const clear = () => { const c = canvasRef.current; const ctx = c?.getContext("2d"); if (c && ctx) { ctx.clearRect(0, 0, c.width, c.height); onChange(""); } };
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="mb-2 flex items-center justify-between">
                <Label className="text-slate-700">✎ {label}</Label>
                <button type="button" onClick={clear} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:text-rose-500"><Trash2 className="h-3 w-3" /> Clear</button>
            </div>
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                <canvas ref={canvasRef} width={680} height={150} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} className="block w-full touch-none" style={{ height: 150 }} />
            </div>
            <p className="mt-1 text-xs text-slate-400">Draw your signature above using your mouse or finger.</p>
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
    return (
        <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/30 p-6"
        >
            <div className="flex flex-col items-center gap-2 text-center">
                <UploadCloud className="h-7 w-7 text-slate-300" />
                {value ? (
                    <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-slate-700">{name || "Attached file"}</span>
                        <button type="button" onClick={() => { onChange(""); setName(""); }} className="text-slate-400 hover:text-rose-500"><X className="h-4 w-4" /></button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => ref.current?.click()} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Choose File</button>
                            <span className="text-sm text-slate-400">No file chosen</span>
                        </div>
                        <button type="button" onClick={() => ref.current?.click()} className="text-sm font-medium text-blue-600 hover:underline">Or Drag It Here.</button>
                    </>
                )}
            </div>
            <input ref={ref} type="file" accept="application/pdf,image/*" className="hidden" onChange={onFile} />
        </div>
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
