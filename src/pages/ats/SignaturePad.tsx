import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mouse/touch signature pad. Renders into a small canvas; consumers receive
 * the dataURL of the captured signature via `onChange`. Pure presentation —
 * no persistence; parents store the dataURL if they need it.
 */

interface SignaturePadProps {
    value?: string | null;
    onChange?: (dataUrl: string | null) => void;
    /** Drawing height in px. */
    height?: number;
    label?: string;
    helper?: string;
}

export function SignaturePad({
    value, onChange, height = 120, label = 'Signature', helper,
}: SignaturePadProps) {
    const ref = useRef<HTMLCanvasElement | null>(null);
    const [drawing, setDrawing] = useState(false);
    const [empty, setEmpty] = useState(!value);

    // Restore an externally-provided dataURL when the canvas mounts.
    useEffect(() => {
        const c = ref.current;
        if (!c) return;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        if (value) {
            const img = new Image();
            img.onload = () => { ctx.drawImage(img, 0, 0, c.width, c.height); setEmpty(false); };
            img.src = value;
        }
    }, [value]);

    const point = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
        const c = ref.current;
        if (!c) return null;
        const rect = c.getBoundingClientRect();
        if ('touches' in e) {
            const t = e.touches[0];
            return { x: (t.clientX - rect.left) * (c.width / rect.width), y: (t.clientY - rect.top) * (c.height / rect.height) };
        }
        return { x: (e.clientX - rect.left) * (c.width / rect.width), y: (e.clientY - rect.top) * (c.height / rect.height) };
    };

    const start = (e: React.MouseEvent | React.TouchEvent) => {
        const p = point(e); if (!p) return;
        const ctx = ref.current?.getContext('2d'); if (!ctx) return;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        setDrawing(true);
        setEmpty(false);
    };
    const move = (e: React.MouseEvent | React.TouchEvent) => {
        if (!drawing) return;
        const p = point(e); if (!p) return;
        const ctx = ref.current?.getContext('2d'); if (!ctx) return;
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
    };
    const end = () => {
        if (!drawing) return;
        setDrawing(false);
        const c = ref.current;
        if (c && onChange) onChange(c.toDataURL('image/png'));
    };

    const clear = () => {
        const c = ref.current;
        if (!c) return;
        const ctx = c.getContext('2d'); if (!ctx) return;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        setEmpty(true);
        if (onChange) onChange(null);
    };

    return (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div className="text-[11px] font-bold text-slate-700 inline-flex items-center gap-1.5">
                    <Pencil size={11} /> {label}
                </div>
                <div className="flex items-center gap-1">
                    {!empty && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                            <Check size={11} /> Captured
                        </span>
                    )}
                    <button type="button" onClick={clear} className="h-6 px-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1 text-[10px] font-semibold">
                        <Trash2 size={10} /> Clear
                    </button>
                </div>
            </div>
            <canvas
                ref={ref}
                width={640}
                height={height * 2}
                className={cn('w-full block touch-none', empty && 'bg-[linear-gradient(180deg,white_0,white_calc(100%-22px),#cbd5e1_calc(100%-22px),#cbd5e1_calc(100%-21px),white_calc(100%-21px))]')}
                style={{ height }}
                onMouseDown={start}
                onMouseMove={move}
                onMouseUp={end}
                onMouseLeave={end}
                onTouchStart={start}
                onTouchMove={move}
                onTouchEnd={end}
            />
            {helper && <div className="px-3 py-1.5 text-[10px] text-slate-500 border-t border-slate-100 bg-slate-50/40">{helper}</div>}
        </div>
    );
}

/**
 * Tiny photo-upload tile. Calls onChange with the dataURL when a file is
 * picked. No backend — purely for the demo.
 */
interface PhotoUploadProps {
    value?: string | null;
    onChange?: (dataUrl: string | null) => void;
    label?: string;
    aspect?: 'square' | 'landscape';
    helper?: string;
}

export function PhotoUpload({ value, onChange, label, aspect = 'landscape', helper }: PhotoUploadProps) {
    const ref = useRef<HTMLInputElement | null>(null);
    const onPick = () => ref.current?.click();
    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => onChange?.(reader.result as string);
        reader.readAsDataURL(f);
    };
    return (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            {label && (
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                    <div className="text-[11px] font-bold text-slate-700">{label}</div>
                    {value && (
                        <button type="button" onClick={() => onChange?.(null)} className="h-6 px-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1 text-[10px] font-semibold">
                            <Trash2 size={10} /> Remove
                        </button>
                    )}
                </div>
            )}
            <button
                type="button"
                onClick={onPick}
                className={cn(
                    'w-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center cursor-pointer overflow-hidden text-slate-400',
                    aspect === 'square' ? 'aspect-square' : 'aspect-[16/10]',
                )}
            >
                {value
                    ? <img src={value} alt={label ?? ''} className="w-full h-full object-cover" />
                    : <div className="text-center px-3"><div className="text-[10px] font-bold uppercase tracking-wider">Tap to upload</div><div className="text-[10px] text-slate-400 mt-1">PNG / JPG</div></div>}
            </button>
            <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
            {helper && <div className="px-3 py-1.5 text-[10px] text-slate-500 border-t border-slate-100 bg-slate-50/40">{helper}</div>}
        </div>
    );
}
