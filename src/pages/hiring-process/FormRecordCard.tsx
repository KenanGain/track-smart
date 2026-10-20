import { useRef } from "react";
import { BadgeCheck, Download, Eye, FileCheck2, FileSignature, FileText, MessageSquarePlus, PenLine, Send, Share2, Upload, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { KebabMenu, type KebabItem } from "@/components/ui/KebabMenu";
import { FORM_STATUS_META, SOURCE_LABEL, formCopyStatus, type FormCopy } from "./form-copies";

// ─────────────────────────────────────────────────────────────────────────────
// FormRecordCard — "Copies on file" for one form on one person's file.
//
// The same card in the hiring file, the onboarding file and the driver's profile, because
// it answers the same question in all three: is this form signed, by whom, is there a copy,
// has anyone checked it. Status is derived from the copies (see form-copies), the two ways
// a copy gets here are the two buttons, and everything else is behind the three dots.
// ─────────────────────────────────────────────────────────────────────────────

export interface FormRecordCardProps {
    title: string;
    subtitle?: string;
    copies: FormCopy[];
    /** The file's own "asked for, not back yet" flag. Only read while nothing is on file. */
    requested?: boolean;
    /** Whether the form can be filled in the app (a PDF template cannot — it is reviewed). */
    canFill?: boolean;
    onOpen?: (copy: FormCopy) => void;
    onFill?: () => void;
    onUpload?: (file: File) => void;
    /** The blank form, as a document. */
    onPdf?: () => void;
    onShare?: () => void;
    onAsk?: () => void;
    onRemark?: () => void;
    onVerify?: (copy: FormCopy) => void;
    /** Paper the office holds but did not scan. */
    onMarkReceived?: () => void;
    /** For a PDF template: walk the fields. */
    onReview?: () => void;
    /** Tighter: inside a table row's expansion rather than on a record page. */
    compact?: boolean;
    className?: string;
}

export function FormRecordCard({ title, subtitle, copies, requested, canFill = true, onOpen, onFill, onUpload, onPdf, onShare, onAsk, onRemark, onVerify, onMarkReceived, onReview, compact, className }: FormRecordCardProps) {
    const fileRef = useRef<HTMLInputElement>(null);
    const status = formCopyStatus(copies, requested);
    const meta = FORM_STATUS_META[status];
    const onFile = copies.length > 0;
    const latest = copies[0];

    const more: KebabItem[] = [
        ...(latest && onOpen ? [{ label: "Open signed copy", icon: Eye, onClick: () => onOpen(latest) }] : []),
        ...(onReview ? [{ label: "Review fields", icon: ClipboardCheck, onClick: onReview }] : []),
        ...(onPdf ? [{ label: "Blank form (PDF)", icon: FileText, onClick: onPdf }] : []),
        ...(onShare ? [{ label: "Share to chat", icon: Share2, onClick: onShare }] : []),
        ...(onAsk ? [{ label: "Ask driver to sign", icon: Send, onClick: onAsk }] : []),
        ...(latest && !latest.verified && onVerify ? [{ label: "Verify latest copy", icon: BadgeCheck, onClick: () => onVerify(latest) }] : []),
        ...(!onFile && onMarkReceived ? [{ label: "Mark received (paper copy)", icon: FileCheck2, onClick: onMarkReceived }] : []),
        ...(onRemark ? [{ label: "Add a remark", icon: MessageSquarePlus, onClick: onRemark }] : []),
    ];

    return (
        <div className={cn("rounded-xl border bg-white shadow-sm transition-colors", status === "verified" ? "border-emerald-200" : onFile ? "border-blue-200" : "border-slate-200", className)}>
            <div className={cn("flex flex-wrap items-start justify-between gap-3", compact ? "p-4" : "p-5")}>
                <div className="flex min-w-0 items-start gap-3">
                    <span className={cn("flex shrink-0 items-center justify-center rounded-lg", compact ? "h-9 w-9" : "h-10 w-10",
                        status === "verified" ? "bg-emerald-100 text-emerald-600" : onFile ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500")}>
                        {onFile ? <FileCheck2 className="h-5 w-5" /> : <PenLine className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className={cn("font-bold text-slate-900", compact ? "text-sm" : "text-[15px]")}>{title}</p>
                            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.badge)}>{meta.label}</span>
                            {onFile && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{copies.length} on file</span>}
                        </div>
                        <p className="mt-0.5 text-[13px] text-slate-500">
                            {latest
                                ? <>{SOURCE_LABEL[latest.source]}{latest.by ? <> · signed by <span className="font-semibold text-slate-700">{latest.by}</span></> : null}{latest.at ? ` on ${latest.at}` : ""}{latest.verified ? <> · <span className="font-semibold text-emerald-700">verified by {latest.verified.by}</span></> : ""}</>
                                : requested ? "Asked for — nothing back yet. Fill it in here, or upload the signed copy when it arrives."
                                    : subtitle ?? "No copy on file yet. Fill it in and sign it here, or upload a signed copy."}
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {canFill && onFill && (
                        <Button size={compact ? "sm" : "default"} onClick={onFill}><FileSignature className="h-4 w-4" /> {onFile ? "Fill again" : "Fill out & sign"}</Button>
                    )}
                    {!canFill && onReview && (
                        <Button size={compact ? "sm" : "default"} onClick={onReview}><ClipboardCheck className="h-4 w-4" /> Review</Button>
                    )}
                    {onUpload && (
                        <>
                            <Button size={compact ? "sm" : "default"} variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Upload signed copy</Button>
                            <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
                        </>
                    )}
                    {more.length > 0 && <KebabMenu items={more} title={`More actions for ${title}`} />}
                </div>
            </div>

            {onFile && (
                <div className="border-t border-slate-100">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <th className="px-5 py-2">Copy</th>
                                <th className="w-32 px-3 py-2">Signed</th>
                                <th className="w-40 px-3 py-2">Verified</th>
                                <th className="w-40 py-2 pl-1 pr-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {copies.map((c, i) => (
                                <tr key={c.id} className={cn("transition-colors hover:bg-slate-50/70", onOpen && "cursor-pointer")} onClick={onOpen ? () => onOpen(c) : undefined}>
                                    <td className="px-5 py-2.5">
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", c.source === "upload" ? "bg-violet-50 text-violet-600" : c.source === "system" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500")}>
                                                {c.source === "upload" ? <Upload className="h-3.5 w-3.5" /> : <FileCheck2 className="h-3.5 w-3.5" />}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-slate-800">{SOURCE_LABEL[c.source]}{i === 0 && copies.length > 1 ? <span className="ml-1.5 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-bold text-slate-500">LATEST</span> : null}</p>
                                                <p className="truncate text-[11px] text-slate-400" title={c.fileName ?? c.label}>{c.fileName ?? c.label}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{c.at || <span className="text-slate-300">&mdash;</span>}{c.by && <span className="block truncate text-[11px] text-slate-400">{c.by}</span>}</td>
                                    <td className="px-3 py-2.5">
                                        {c.verified
                                            ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><BadgeCheck className="h-3 w-3" /> {c.verified.by} · {c.verified.at}</span>
                                            : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Not verified</span>}
                                    </td>
                                    <td className="py-2.5 pl-1 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1">
                                            {onOpen && <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => onOpen(c)}><Eye className="h-3.5 w-3.5" /> Open</Button>}
                                            {!c.verified && onVerify && <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => onVerify(c)}><BadgeCheck className="h-3.5 w-3.5" /> Verify</Button>}
                                            {c.fileUrl && <a href={c.fileUrl} download={c.fileName ?? "copy"} className="inline-flex h-7 items-center justify-center rounded-md border border-slate-200 px-2 text-slate-500 hover:bg-slate-50" title="Download"><Download className="h-3.5 w-3.5" /></a>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
