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
export function UploadZone({ label, hint, compact, multiple, onFiles }: {
    label: string; hint?: string; compact?: boolean; multiple?: boolean; onFiles: (files: FileList | null) => void;
}) {
    const [dragging, setDragging] = useState(false);
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
            <input type="file" multiple={multiple} className="hidden" onChange={e => { onFiles(e.target.files); e.target.value = ''; }} />
            <UploadCloud size={compact ? 18 : 24} className={dragging ? 'text-blue-500' : 'text-slate-400'} />
            <p className={cn('font-medium text-slate-600', compact ? 'text-[12px]' : 'text-sm')}>{dragging ? 'Drop file to upload' : label}</p>
            {hint && !dragging && <span className="text-[11px] text-slate-400">{hint}</span>}
        </label>
    );
}
