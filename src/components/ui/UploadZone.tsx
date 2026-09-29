import { useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The drop target used to attach a document to a compliance record.
 *
 * Shared so the driver application can offer the same thing: what it captures becomes a
 * compliance record, and an office that sees a drag-and-drop zone on the record should not
 * find a different-looking control on the form that produced it.
 */
export function UploadZone({ label, hint, compact, multiple, variant = 'inline', accept, onFiles }: {
    label: string; hint?: string; compact?: boolean; multiple?: boolean;
    /**
     * Which of the app's two drop targets this is.
     *
     * `inline` is the original: a slim strip that sits between fields on a record
     * form. `card` is the one the asset wizard uses for a bill of sale — a tall
     * panel with the icon in a circle, a bold instruction and a line saying what
     * it takes. Two shapes for two jobs, one component, so neither drifts.
     */
    variant?: 'inline' | 'card';
    accept?: string;
    onFiles: (files: FileList | null) => void;
}) {
    const [dragging, setDragging] = useState(false);

    if (variant === 'card') {
        return (
            <label
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files); }}
                className={cn(
                    'flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white px-4 py-6 text-center transition-colors',
                    dragging
                        ? 'cursor-copy border-blue-400 bg-blue-50/60'
                        : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50',
                )}
            >
                <input type="file" multiple={multiple} accept={accept} className="hidden"
                    onChange={e => { onFiles(e.target.files); e.target.value = ''; }} />
                <span className={cn('mb-2 rounded-full p-2.5', dragging ? 'bg-blue-100' : 'bg-blue-50')}>
                    <UploadCloud className="h-5 w-5 text-blue-600" />
                </span>
                <p className="text-[13px] font-semibold text-slate-700">
                    {dragging ? 'Drop the file to upload' : label}
                </p>
                {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
            </label>
        );
    }

    return (
        <label
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files); }}
            className={cn(
                'flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-center transition-colors',
                compact ? 'px-3 py-4' : 'px-4 py-7',
                dragging
                    ? 'cursor-copy border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                    : 'cursor-pointer border-slate-300 bg-slate-50/50 hover:border-blue-300 hover:bg-blue-50/40',
            )}
        >
            <input type="file" multiple={multiple} accept={accept} className="hidden" onChange={e => { onFiles(e.target.files); e.target.value = ''; }} />
            <UploadCloud size={compact ? 18 : 24} className={dragging ? 'text-blue-500' : 'text-slate-400'} />
            <p className={cn('font-medium text-slate-600', compact ? 'text-[12px]' : 'text-sm')}>{dragging ? 'Drop file to upload' : label}</p>
            {hint && !dragging && <span className="text-[11px] text-slate-400">{hint}</span>}
        </label>
    );
}
