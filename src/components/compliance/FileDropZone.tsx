import { useRef, useState } from 'react';
import { UploadCloud, FileText, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropFile { id: string; fileName: string; fileSize?: number }

/** Shared drag-and-drop file field used by every compliance upload surface
 *  (the standalone Upload modal and the key number form's supporting document).
 *  Prototype: records the file name/size only. */
export function FileDropZone({
    files, onAdd, onRemove, multiple = false, compact = false,
}: {
    files: DropFile[];
    onAdd: (list: FileList | null) => void;
    onRemove: (id: string) => void;
    multiple?: boolean;
    /** Slightly tighter padding when embedded inside another form. */
    compact?: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    return (
        <div className="space-y-2">
            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); onAdd(e.dataTransfer.files); }}
                className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-center transition-colors",
                    compact ? "px-4 py-5" : "px-6 py-7",
                    dragging ? "border-blue-400 bg-blue-50/60" : "border-slate-300 bg-slate-50/40 hover:border-blue-300 hover:bg-blue-50/30",
                )}
            >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <UploadCloud size={18} />
                </span>
                <p className="text-sm font-semibold text-slate-700">
                    Drag &amp; drop {multiple ? 'files' : 'a file'}, or <span className="text-blue-600">click to browse</span>
                </p>
                <p className="text-[11px] text-slate-400">
                    {multiple ? 'Multiple files allowed. ' : ''}PDF, JPG or PNG — prototype records the file name only.
                </p>
                <input ref={inputRef} type="file" multiple={multiple} className="hidden" onChange={(e) => onAdd(e.target.files)} />
            </div>

            {files.length > 0 && (
                <div className="space-y-1.5">
                    {files.map(f => (
                        <div key={f.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <div className="flex min-w-0 items-center gap-2">
                                <FileText size={16} className="shrink-0 text-emerald-600" />
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-800">{f.fileName}</p>
                                    {f.fileSize != null && <p className="text-[11px] text-slate-400">{(f.fileSize / 1024).toFixed(0)} KB</p>}
                                </div>
                            </div>
                            <button type="button" onClick={() => onRemove(f.id)} className="shrink-0 rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Remove file">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
