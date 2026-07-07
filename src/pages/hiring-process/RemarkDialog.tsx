import { useState } from "react";
import { X, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

// A small popup to add an internal remark / comment against a driver. Shared by
// the hiring & onboarding monitor lists.
export function RemarkDialog({ title = "Add a remark", subtitle, placeholder = "Add a remark or comment…", onClose, onSubmit }: {
    title?: string; subtitle?: string; placeholder?: string;
    onClose: () => void; onSubmit: (text: string) => void;
}) {
    const [text, setText] = useState("");
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white"><MessageSquarePlus className="h-4 w-4" /></span>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">{title}</h3>
                            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-4 w-4" /></button>
                </div>
                <div className="px-6 py-5">
                    <textarea autoFocus className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
                    <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                    <Button size="sm" disabled={!text.trim()} onClick={() => onSubmit(text.trim())}><MessageSquarePlus className="h-4 w-4" /> Add remark</Button>
                </div>
            </div>
        </div>
    );
}
