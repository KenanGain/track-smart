import { useState } from "react";
import { Send, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * SendDocumentDialog — forwards an uploaded document to a THIRD PARTY (issuing body,
 * insurer, verification agency) to confirm it is authentic / correct. Distinct from the
 * EmployerRequestDialog, which requests documents from the previous employer.
 */

export type SendDocumentPayload = { docLabel: string; org: string; to: string; subject: string; message: string };

export function SendDocumentDialog({
    docLabel, applicantName, employerName, brandName, prefill, onClose, onSend,
}: {
    docLabel: string;
    applicantName: string;
    employerName?: string;
    brandName: string;
    prefill?: { org?: string; to?: string };
    onClose: () => void;
    onSend: (payload: SendDocumentPayload) => void;
}) {
    const [org, setOrg] = useState(prefill?.org ?? "");
    const [to, setTo] = useState(prefill?.to ?? "");
    const [subject, setSubject] = useState(`Document verification — ${docLabel} (${applicantName})`);
    const [message, setMessage] = useState(
        `Hello,\n\nWe are verifying employment documents for ${applicantName}${employerName ? ` (previous employer: ${employerName})` : ""}. Please confirm the attached ${docLabel} is authentic and the information is correct, or advise of any discrepancies.\n\nThank you,\n${brandName}`,
    );

    const canSend = !!(to.trim() || org.trim());
    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white"><Send className="h-4 w-4" /></span> Send to third party for verification</DialogTitle>
                    <p className="text-sm font-normal text-slate-500">Forward this document to a third party (issuing body, insurer, agency) to confirm it is authentic.</p>
                </DialogHeader>
                <div className="space-y-3 px-6 pb-2">
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                        <FileText className="h-5 w-5 shrink-0 text-slate-400" />
                        <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-700">{docLabel}</p><p className="text-xs text-slate-400">Attached to this request</p></div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div><Label className="text-xs font-semibold text-slate-500">Third party / organization</Label><Input className="mt-1.5" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="e.g. State DMV, Insurer, Agency" /></div>
                        <div><Label className="text-xs font-semibold text-slate-500">Email</Label><Input className="mt-1.5" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="verify@organization.com" /></div>
                    </div>
                    <div><Label className="text-xs font-semibold text-slate-500">Subject</Label><Input className="mt-1.5" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
                    <div><Label className="text-xs font-semibold text-slate-500">Message</Label><Textarea className="mt-1.5 resize-none" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button disabled={!canSend} onClick={() => onSend({ docLabel, org, to, subject, message })}><Send className="h-4 w-4" /> Send</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
