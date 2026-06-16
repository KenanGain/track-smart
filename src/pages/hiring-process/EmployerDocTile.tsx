import { FileText, Eye, RotateCcw, Send, Check, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { type DocStatus } from "./applicants.data";

const DONE_STATES: DocStatus[] = ["received", "verified", "skipped"];

/**
 * Shared verification-document tile — icon + name + status + inline action. Used by both
 * the hiring-file employer review and the Workflows Employment Verification form so they
 * look and behave identically. States: Uploaded / Waiting from employer / Missing.
 */
export function EmployerDocTile({ label, status, source, onUpload, onAsk, onView, onReplace, onSend }: {
    label: string; status: DocStatus; source: "driver" | "employer";
    onUpload?: () => void; onAsk?: () => void; onView?: () => void; onReplace?: () => void; onSend?: () => void;
}) {
    const received = DONE_STATES.includes(status);
    const state = received ? { label: "Uploaded", badge: "bg-emerald-100 text-emerald-700", tint: "border-emerald-200 bg-emerald-50/50", icon: "text-emerald-500" }
        : status === "requested" ? { label: "Waiting from employer", badge: "bg-amber-100 text-amber-700", tint: "border-amber-200 bg-amber-50/40", icon: "text-amber-500" }
        : { label: "Missing", badge: "bg-rose-100 text-rose-600", tint: "border-slate-200 bg-white", icon: "text-slate-400" };
    return (
        <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border p-3", state.tint)}>
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm", state.icon)}><FileText className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{label}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs">
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", state.badge)}>{state.label}</span>
                    <span className="text-slate-400">· {source === "driver" ? "Driver provides" : "From employer"}</span>
                </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                {received ? (
                    <>
                        {onView && <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onView}><Eye className="h-3.5 w-3.5" /> View</Button>}
                        {onReplace && <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onReplace}><RotateCcw className="h-3.5 w-3.5" /> Replace</Button>}
                        {onSend && <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onSend}><Send className="h-3.5 w-3.5" /> Send</Button>}
                    </>
                ) : status === "requested"
                    ? (onUpload && <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onUpload}><Check className="h-3.5 w-3.5" /> Mark received</Button>)
                    : (source === "employer" && onAsk)
                        ? <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onAsk}><Send className="h-3.5 w-3.5" /> Ask employer</Button>
                        : (onUpload && <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onUpload}><Upload className="h-3.5 w-3.5" /> Upload</Button>)}
            </div>
        </div>
    );
}
