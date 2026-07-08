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

/** Segmented Yes / No toggle (blue Yes · slate No), used inline next to a question label. */
export function YesNo({ value, onChange, options = ["Yes", "No"] }: { value: string; onChange: (v: string) => void; options?: [string, string] | string[] }) {
    return (
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {options.map((opt, i) => {
                const on = value === opt;
                return (
                    <button key={opt} type="button" onClick={() => onChange(opt)}
                        className={cn("min-w-[72px] rounded-md px-4 py-1.5 text-sm font-semibold transition",
                            on ? (i === 0 ? "bg-blue-600 text-white shadow-sm" : "bg-slate-700 text-white shadow-sm") : "text-slate-500 hover:text-slate-700")}>
                        {opt}
                    </button>
                );
            })}
        </div>
    );
}

/** A full-width Yes/No question row: label on the left, segmented toggle on the right. */
export function YesNoRow({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <span className="pr-4 text-sm font-medium text-slate-700">{label}{required && <span className="text-rose-500"> *</span>}</span>
            <YesNo value={value} onChange={onChange} />
        </div>
    );
}

const MONTH_OPTS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
/** Numeric month + year selector. Stores and loads the value as "YYYY-MM". */
export function MonthYear({ value, onChange, yearsBack = 40 }: { value: string; onChange: (v: string) => void; yearsBack?: number }) {
    const [y = "", m = ""] = (value || "").split("-");
    const thisYear = new Date().getFullYear();
    const yearOpts = Array.from({ length: yearsBack }, (_, i) => String(thisYear - i));
    const set = (mm: string, yy: string) => onChange(mm && yy ? `${yy}-${mm}` : "");
    return (
        <div className="grid grid-cols-2 gap-2">
            <SelectBox value={m} items={MONTH_OPTS} placeholder="MM" onChange={(v) => set(v, y)} />
            <SelectBox value={y} items={yearOpts} placeholder="YYYY" onChange={(v) => set(m, v)} />
        </div>
    );
}

export type Address = { street: string; city: string; state: string; zip: string; country: string };
export const emptyAddress = (): Address => ({ street: "", city: "", state: "", zip: "", country: "United States" });
export const formatAddress = (a: Address) => [a.street, [a.city, a.state].filter(Boolean).join(", "), a.zip, a.country].filter(Boolean).join(" · ");
/** Standard address block — Street / City / State-Province / ZIP-Postal / Country. */
export function AddressFields({ value, onChange }: { value: Address; onChange: (v: Address) => void }) {
    const set = (p: Partial<Address>) => onChange({ ...value, ...p });
    const isCanada = value.country === "Canada";
    return (
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <Field className="sm:col-span-2" label="Street address"><Input value={value.street} onChange={(e) => set({ street: e.target.value })} placeholder="Street address" /></Field>
            <Field label="City"><Input value={value.city} onChange={(e) => set({ city: e.target.value })} placeholder="City" /></Field>
            <Field label={isCanada ? "Province" : "State"}><Input value={value.state} onChange={(e) => set({ state: e.target.value })} placeholder={isCanada ? "Province" : "State"} /></Field>
            <Field label={isCanada ? "Postal code" : "ZIP code"}><Input value={value.zip} onChange={(e) => set({ zip: e.target.value })} placeholder={isCanada ? "A1A 1A1" : "ZIP code"} /></Field>
            <Field label="Country"><SelectBox value={value.country} items={["United States", "Canada"]} onChange={(v) => set({ country: v })} /></Field>
        </div>
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

// Handwriting fonts offered in Type mode (matches SignatureCreator).
const SIG_FONTS = [
    "'Segoe Script', cursive",
    "'Brush Script MT', cursive",
    "'Snell Roundhand', 'Apple Chancery', cursive",
    "'Lucida Handwriting', cursive",
    "'Gabriola', cursive",
    "'Ink Free', cursive",
    "'Bradley Hand', cursive",
    "'Segoe Print', cursive",
    "'Comic Sans MS', cursive",
];

/** Sign by drawing (default) or typing a name and picking a handwriting font. Emits a data-URL. */
export function SignaturePad({ label = "Signature", onChange }: { label?: string; onChange: (v: string) => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const [mode, setMode] = useState<"draw" | "type">("draw");
    const [typed, setTyped] = useState("");
    const [fontIdx, setFontIdx] = useState(0);
    const point = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = canvasRef.current!.getBoundingClientRect(); const sx = canvasRef.current!.width / r.width, sy = canvasRef.current!.height / r.height; return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy }; };
    const start = (e: React.PointerEvent<HTMLCanvasElement>) => { if (mode !== "draw") return; const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return; drawing.current = true; const p = point(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const move = (e: React.PointerEvent<HTMLCanvasElement>) => { if (!drawing.current) return; const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return; const p = point(e); ctx.lineTo(p.x, p.y); ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke(); };
    const end = () => { if (drawing.current) { drawing.current = false; const c = canvasRef.current; if (c) onChange(c.toDataURL()); } };
    // Render a typed name onto the canvas in the chosen handwriting font → signature image.
    const renderTyped = (name: string, idx: number) => {
        const c = canvasRef.current; const ctx = c?.getContext("2d");
        if (!c || !ctx) return;
        ctx.clearRect(0, 0, c.width, c.height);
        if (name.trim()) {
            ctx.fillStyle = "#1e293b";
            let size = 60;
            ctx.font = `${size}px ${SIG_FONTS[idx]}`;
            while (ctx.measureText(name).width > c.width - 48 && size > 22) { size -= 4; ctx.font = `${size}px ${SIG_FONTS[idx]}`; }
            ctx.textBaseline = "middle";
            ctx.fillText(name, 24, c.height / 2);
            onChange(c.toDataURL());
        } else { onChange(""); }
    };
    const pickFont = (i: number) => { setFontIdx(i); renderTyped(typed, i); };
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
                <>
                    <Input value={typed} onChange={(e) => { setTyped(e.target.value); renderTyped(e.target.value, fontIdx); }} placeholder="Type your full name" className="mb-2 bg-white" autoFocus />
                    <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {SIG_FONTS.map((f, i) => (
                            <button key={i} type="button" onClick={() => pickFont(i)}
                                className={cn("flex h-12 items-center justify-center overflow-hidden rounded-lg border px-2 transition", fontIdx === i ? "border-blue-400 bg-blue-50 ring-1 ring-blue-300" : "border-slate-200 bg-white hover:border-slate-300")}>
                                <span className="truncate text-xl leading-none text-slate-800" style={{ fontFamily: f }}>{typed.trim() || "Signature"}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                <canvas ref={canvasRef} width={680} height={150} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} className={cn("block w-full", mode === "draw" ? "touch-none" : "pointer-events-none")} style={{ height: 150 }} />
            </div>
            <p className="mt-1 text-xs text-slate-400">{mode === "draw" ? "Draw your signature above using your mouse or finger." : "Type your name, then pick a handwriting style — it's rendered as your signature above."}</p>
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

/**
 * CompletedByCertification — the end component a previous employer fills when we send them
 * a §391.23 form: their company details (company, telephone, address) plus the certification
 * (name, title, date, signature). One self-contained card; the parent captures it on submit.
 */
export type CompletedBy = { company: string; telephone: string; address: Address; name: string; role: string; date: string; sig: string; done: boolean };
export const newCompletedBy = (): CompletedBy => ({ company: "", telephone: "", address: emptyAddress(), name: "", role: "", date: todayISO(), sig: "", done: false });

export function CompletedByCertification({
    value, onChange, checklist,
    kicker = "Completed by — your details & certification",
    companyHeading = "Company details",
    companySubtext = "The company and contact completing this form.",
    certKicker = "Certification",
    certHeading = "I certify the information above is true and complete.",
    certSubtext = "Complete the fields above, then sign to certify the information is true and complete to the best of your knowledge. We receive this on submit.",
    nameLabel = "Your name",
    buttonLabel = "Complete & sign",
    signedLabel = "Completed & signed",
    signedByLabel = "Completed by",
}: {
    value: CompletedBy; onChange: (v: CompletedBy) => void; checklist?: React.ReactNode;
    kicker?: string; companyHeading?: string; companySubtext?: string;
    certKicker?: string; certHeading?: string; certSubtext?: string;
    nameLabel?: string; buttonLabel?: string; signedLabel?: string; signedByLabel?: string;
}) {
    const patch = (p: Partial<CompletedBy>) => onChange({ ...value, ...p });
    const { company, telephone, address, name, role, date, sig, done } = value;
    const addrOk = !!address.street && !!address.city && !!address.state;
    const canSign = !!company && addrOk && !!name.trim() && !!sig;
    return (
        <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">{kicker}</p>
            {done ? (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><Check className="h-4 w-4" /> {signedLabel}</p>
                    <div className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                        <p><span className="text-slate-500">Company:</span> <span className="font-semibold text-slate-800">{company}</span></p>
                        <p><span className="text-slate-500">Telephone:</span> <span className="font-semibold text-slate-800">{telephone || "—"}</span></p>
                        <p className="sm:col-span-2"><span className="text-slate-500">Address:</span> <span className="font-semibold text-slate-800">{formatAddress(address) || "—"}</span></p>
                        <p><span className="text-slate-500">{signedByLabel}:</span> <span className="font-semibold text-slate-800">{name}</span></p>
                        <p><span className="text-slate-500">Title:</span> <span className="font-semibold text-slate-800">{role || "—"}</span></p>
                        <p><span className="text-slate-500">Date:</span> <span className="font-semibold text-slate-800">{date}</span></p>
                    </div>
                    {sig && <div className="mt-3"><span className="text-sm text-slate-500">Signature:</span><img src={sig} alt="signature" className="mt-1 h-16 rounded border border-slate-200 bg-white" /></div>}
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => patch({ done: false })}>Edit</Button>
                </div>
            ) : (
                <>
                    <h3 className="mt-0.5 text-base font-semibold text-slate-900">{companyHeading}</h3>
                    <p className="mt-1 text-sm text-slate-500">{companySubtext}</p>
                    <div className="mt-4 space-y-5">
                        <Grid>
                            <Field label="Company" required><Input value={company} onChange={(e) => patch({ company: e.target.value })} placeholder="Company name" /></Field>
                            <Field label="Telephone"><Input type="tel" value={telephone} onChange={(e) => patch({ telephone: e.target.value })} placeholder="(555) 000-0000" /></Field>
                        </Grid>
                        <AddressFields value={address} onChange={(a) => patch({ address: a })} />
                    </div>

                    {checklist && <div className="mt-6 border-t border-slate-100 pt-6">{checklist}</div>}

                    <div className="mt-6 border-t border-slate-100 pt-6">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">{certKicker}</p>
                        <h3 className="mt-0.5 text-base font-semibold text-slate-900">{certHeading}</h3>
                        <p className="mt-1 text-sm text-slate-500">{certSubtext}</p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                            <div><Label className="mb-1 block text-xs font-semibold text-slate-600">{nameLabel}</Label><Input value={name} onChange={(e) => patch({ name: e.target.value })} placeholder="Your name" /></div>
                            <div><Label className="mb-1 block text-xs font-semibold text-slate-600">Title / role</Label><Input value={role} onChange={(e) => patch({ role: e.target.value })} placeholder="e.g. Safety Manager" /></div>
                            <div><Label className="mb-1 block text-xs font-semibold text-slate-600">Date</Label><Input type="date" value={date} onChange={(e) => patch({ date: e.target.value })} /></div>
                        </div>
                        <div className="mt-4"><Label className="mb-1 block text-xs font-semibold text-slate-600">Signature</Label><SignaturePad onChange={(v) => patch({ sig: v })} /></div>
                        <Button className="mt-4" disabled={!canSign} onClick={() => patch({ done: true })}><Check className="h-4 w-4" /> {buttonLabel}</Button>
                    </div>
                </>
            )}
        </div>
    );
}

export type SignOffData = { name: string; role: string; date: string; sig: string; done: boolean };
export const newSignOff = (): SignOffData => ({ name: "", role: "Hiring Manager", date: todayISO(), sig: "", done: false });

/** Reviewer sign-off — name / role / date / signature. Optionally controlled via
 *  value/onChange so the parent can include the signed data in a PDF document. */
export function ReviewSignOff({ heading, value, onChange, bare, kicker = "Reviewer Sign-Off", subtext = "Confirm you have reviewed the form above. Your name, title, date and signature are recorded on file.", nameLabel = "Reviewer name", buttonLabel = "Confirm review & sign", signedLabel = "Reviewed & signed", signedByLabel = "Reviewed by" }: { heading: string; value?: SignOffData; onChange?: (v: SignOffData) => void; bare?: boolean; kicker?: string; subtext?: string; nameLabel?: string; buttonLabel?: string; signedLabel?: string; signedByLabel?: string }) {
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
        <div className={cn(!bare && "rounded-2xl border border-blue-200 bg-white p-5 shadow-sm")}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">{kicker}</p>
            <h3 className="mt-0.5 text-base font-semibold text-slate-900">{heading}</h3>
            <p className="mt-1 text-sm text-slate-500">{subtext}</p>
            {done ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><Check className="h-4 w-4" /> {signedLabel}</p>
                    <div className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                        <p><span className="text-slate-500">{signedByLabel}:</span> <span className="font-semibold text-slate-800">{name}</span></p>
                        <p><span className="text-slate-500">Title:</span> <span className="font-semibold text-slate-800">{role}</span></p>
                        <p><span className="text-slate-500">Date:</span> <span className="font-semibold text-slate-800">{date}</span></p>
                    </div>
                    {sig && <div className="mt-3"><span className="text-sm text-slate-500">Signature:</span><img src={sig} alt="signature" className="mt-1 h-16 rounded border border-slate-200 bg-white" /></div>}
                </div>
            ) : (
                <>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                        <div><Label className="mb-1 block text-xs font-semibold text-slate-600">{nameLabel}</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></div>
                        <div><Label className="mb-1 block text-xs font-semibold text-slate-600">Title / role</Label><Input value={role} onChange={(e) => setRole(e.target.value)} /></div>
                        <div><Label className="mb-1 block text-xs font-semibold text-slate-600">Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                    </div>
                    <div className="mt-4"><Label className="mb-1 block text-xs font-semibold text-slate-600">Signature</Label><SignaturePad onChange={setSig} /></div>
                    <Button className="mt-4" disabled={!sig || !name.trim()} onClick={() => setDone(true)}><Check className="h-4 w-4" /> {buttonLabel}</Button>
                </>
            )}
        </div>
    );
}
