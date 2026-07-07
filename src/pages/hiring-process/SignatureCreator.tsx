import { useEffect, useRef, useState } from "react";
import { X, Check, Keyboard, PenLine, UploadCloud, Trash2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Create-your-signature modal (Type · Draw · Upload) ───────────────────────
// Mirrors the DocuSign / Sejda "Create your signature" dialog. Returns a PNG
// data URL via onApply. Optionally offers "save for future use" so the caller
// can persist it as the account's reusable signature.

type Tab = "type" | "draw" | "upload";

const FONTS = [
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

const INK = "#0f172a";

// Render a typed name in a script font to a transparent PNG.
function typedToDataUrl(name: string, fontFamily: string): string {
    const c = document.createElement("canvas");
    c.width = 640; c.height = 200;
    const ctx = c.getContext("2d");
    if (!ctx || !name.trim()) return "";
    ctx.fillStyle = INK;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    let size = 96;
    ctx.font = `${size}px ${fontFamily}`;
    while (ctx.measureText(name).width > 600 && size > 22) { size -= 4; ctx.font = `${size}px ${fontFamily}`; }
    ctx.fillText(name, c.width / 2, c.height / 2 + 6);
    return c.toDataURL();
}

export function SignatureCreator({ title = "Create your signature", label = "signature", savedSignature, hideSave, onApply, onClose }: {
    title?: string;
    label?: string;
    savedSignature?: string | null;
    hideSave?: boolean;
    onApply: (dataUrl: string, saveForReuse: boolean) => void;
    onClose: () => void;
}) {
    const [tab, setTab] = useState<Tab>("type");
    const [name, setName] = useState("");
    const [fontIdx, setFontIdx] = useState(0);
    const [uploadUrl, setUploadUrl] = useState("");
    const [hasDrawing, setHasDrawing] = useState(false);
    const [saveForReuse, setSaveForReuse] = useState(!hideSave);

    const drawCanvas = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);

    // Draw tab — freehand
    const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const c = drawCanvas.current!; const r = c.getBoundingClientRect();
        return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
    };
    const dStart = (e: React.PointerEvent<HTMLCanvasElement>) => { const ctx = drawCanvas.current?.getContext("2d"); if (!ctx) return; drawing.current = true; const p = point(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const dMove = (e: React.PointerEvent<HTMLCanvasElement>) => { if (!drawing.current) return; const ctx = drawCanvas.current?.getContext("2d"); if (!ctx) return; const p = point(e); ctx.lineTo(p.x, p.y); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(); setHasDrawing(true); };
    const dEnd = () => { drawing.current = false; };
    const clearDraw = () => { const c = drawCanvas.current; const ctx = c?.getContext("2d"); if (c && ctx) ctx.clearRect(0, 0, c.width, c.height); setHasDrawing(false); };
    useEffect(() => { if (tab === "draw") clearDraw(); /* fresh canvas on entry */ }, [tab]);

    const onUpload = (file: File | undefined) => {
        if (!file || !file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = () => setUploadUrl(reader.result as string);
        reader.readAsDataURL(file);
    };

    const canApply = tab === "type" ? !!name.trim() : tab === "draw" ? hasDrawing : !!uploadUrl;
    const apply = () => {
        let out = "";
        if (tab === "type") out = typedToDataUrl(name, FONTS[fontIdx]);
        else if (tab === "draw") out = drawCanvas.current?.toDataURL() ?? "";
        else out = uploadUrl;
        if (out) onApply(out, saveForReuse);
    };

    const TABS: { id: Tab; label: string; desc: string; Icon: React.ElementType }[] = [
        { id: "type", label: "Type", desc: "Type your name in a ready-made font", Icon: Keyboard },
        { id: "draw", label: "Draw", desc: "Handwrite it with your mouse or trackpad", Icon: PenLine },
        { id: "upload", label: "Upload", desc: "Use a signature image from your device", Icon: UploadCloud },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                    <h3 className="text-base font-bold text-slate-900">{title}</h3>
                    <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-4 w-4" /></button>
                </div>

                <div className="flex flex-col sm:flex-row">
                    {/* Left rail — tabs */}
                    <div className="flex shrink-0 gap-2 border-b border-slate-100 p-3 sm:w-52 sm:flex-col sm:border-b-0 sm:border-r">
                        {TABS.map((t) => (
                            <button key={t.id} type="button" onClick={() => setTab(t.id)}
                                className={cn("flex flex-1 items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition sm:flex-none", tab === t.id ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100")}>
                                <t.Icon className="mt-0.5 h-4 w-4 shrink-0" />
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold">{t.label}</span>
                                    <span className={cn("mt-0.5 hidden text-[11px] leading-tight sm:block", tab === t.id ? "text-blue-100" : "text-slate-400")}>{t.desc}</span>
                                </span>
                            </button>
                        ))}
                        {savedSignature && (
                            <button type="button" onClick={() => onApply(savedSignature, false)}
                                className="mt-1 hidden items-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 px-3 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50 sm:flex">
                                <Sparkles className="h-4 w-4 shrink-0" /> Use my saved signature
                            </button>
                        )}
                    </div>

                    {/* Right — active tab */}
                    <div className="min-w-0 flex-1 p-5">
                        {tab === "type" && (
                            <div className="space-y-3">
                                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter full name" className="h-10 w-full border-blue-300 focus-visible:ring-blue-400" autoFocus />
                                <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                                    {FONTS.map((f, i) => (
                                        <button key={i} type="button" onClick={() => setFontIdx(i)}
                                            className={cn("flex h-16 items-center justify-center overflow-hidden rounded-lg border px-2 transition", fontIdx === i ? "border-blue-400 bg-blue-50 ring-1 ring-blue-300" : "border-slate-200 bg-white hover:border-slate-300")}>
                                            <span className="truncate text-2xl leading-none" style={{ fontFamily: f, color: INK }}>{name.trim() || "Signature"}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {tab === "draw" && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-end">
                                    <button type="button" onClick={clearDraw} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /> Clear</button>
                                </div>
                                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                    <canvas ref={drawCanvas} width={680} height={200} onPointerDown={dStart} onPointerMove={dMove} onPointerUp={dEnd} onPointerLeave={dEnd} className="block w-full touch-none" style={{ height: 200 }} />
                                </div>
                                <p className="text-xs text-slate-400">Draw your signature above using your mouse or finger.</p>
                            </div>
                        )}

                        {tab === "upload" && (
                            <div className="space-y-3">
                                {uploadUrl ? (
                                    <div className="relative flex h-52 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                                        <img src={uploadUrl} alt="signature" className="max-h-full max-w-full object-contain p-3" />
                                        <button type="button" onClick={() => setUploadUrl("")} className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-slate-500 shadow hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
                                    </div>
                                ) : (
                                    <label className="flex h-52 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white text-center transition hover:border-blue-300 hover:bg-blue-50/40">
                                        <UploadCloud className="h-8 w-8 text-blue-500" />
                                        <span className="mt-2 text-sm font-semibold text-slate-700">Upload a signature image</span>
                                        <span className="mt-0.5 text-xs text-slate-400">PNG or JPG · a transparent PNG looks best</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} />
                                    </label>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                    {hideSave ? <span /> : (
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                            <input type="checkbox" checked={saveForReuse} onChange={(e) => setSaveForReuse(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                            Save for future use
                        </label>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                        <Button size="sm" disabled={!canApply} onClick={apply}><Check className="h-4 w-4" /> Place {label}</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
