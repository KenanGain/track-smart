import { useState } from "react";
import { Send, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * EmployerRequestDialog — the one shared "ask the previous employer" popup, used by both
 * the Employment Verification form (Workflows) and the hiring-file employment review.
 * It carries the editable contact details, a checklist of exactly which documents the
 * driver asked us to obtain (pre-ticked), and the editable subject + message.
 */

export type RequestDocOption = { key: string; label: string; preselected?: boolean; received?: boolean };
export type RequestDataRow = { label: string; value: string };

export type EmployerRequestPayload = {
    docKeys: string[]; docLabels: string[]; verifyData: boolean;
    to: string; phone: string; address: string; contact: string;
    subject: string; message: string;
};

export function EmployerRequestDialog({
    employerName, applicantName, period, brandName, attemptLabel, docs, dataRows, defaultVerifyData, prefill, onClose, onSend,
}: {
    employerName: string;
    applicantName: string;
    period?: string;
    brandName: string;
    attemptLabel?: string;
    docs: RequestDocOption[];
    dataRows?: RequestDataRow[];               // employment data the employer can be asked to confirm
    defaultVerifyData?: boolean;               // start with "confirm the data is correct" ticked
    prefill?: { email?: string; phone?: string; address?: string; contact?: string };
    onClose: () => void;
    onSend: (payload: EmployerRequestPayload) => void;
}) {
    const [want, setWant] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(docs.map((d) => [d.key, !!d.preselected && !d.received])));
    const [verifyData, setVerifyData] = useState(!!defaultVerifyData);
    const [to, setTo] = useState(prefill?.email ?? "");
    const [phone, setPhone] = useState(prefill?.phone ?? "");
    const [address, setAddress] = useState(prefill?.address ?? "");
    const [contact, setContact] = useState(prefill?.contact ?? "");
    const [touchedMsg, setTouchedMsg] = useState(false);

    const composeMessage = (wantMap: Record<string, boolean>, verify: boolean) => {
        const docLines = docs.filter((d) => wantMap[d.key]).map((d) => `  • ${d.label}`).join("\n");
        const dataBlock = verify && dataRows?.length
            ? ["", `Please confirm the following employment details are correct, or reply with the corrected information:`, "", ...dataRows.map((r) => `  • ${r.label}: ${r.value || "—"}`)].join("\n")
            : "";
        const docBlock = docLines
            ? ["", `Please provide the following document(s) for our records:`, "", docLines].join("\n")
            : "";
        return [
            `Dear ${employerName || "Employer"},`, ``,
            `We are completing an employment verification for ${applicantName}${period ? ` (employed ${period})` : ""}.${docBlock}${dataBlock}`, ``,
            `Thank you,`, brandName,
        ].join("\n");
    };

    const [subject, setSubject] = useState(`Employment verification — ${applicantName}${employerName ? ` (${employerName})` : ""}`);
    const [message, setMessage] = useState(() => composeMessage(Object.fromEntries(docs.map((d) => [d.key, !!d.preselected && !d.received])), !!defaultVerifyData));

    const sync = (wantMap: Record<string, boolean>, verify: boolean) => { if (!touchedMsg) setMessage(composeMessage(wantMap, verify)); };
    const toggle = (key: string) => { const next = { ...want, [key]: !want[key] }; setWant(next); sync(next, verifyData); };
    const toggleVerify = () => { const next = !verifyData; setVerifyData(next); sync(want, next); };

    const anyWanted = docs.some((d) => want[d.key]);
    const canSend = anyWanted || verifyData;
    const submit = () => {
        if (!canSend) return;
        const chosen = docs.filter((d) => want[d.key]);
        onSend({ docKeys: chosen.map((d) => d.key), docLabels: chosen.map((d) => d.label), verifyData, to, phone, address, contact, subject, message });
    };

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><Send className="h-4 w-4" /></span> Request documents from {employerName || "previous employer"}</DialogTitle>
                    <p className="text-sm font-normal text-slate-500">Employment verification for {applicantName}{period ? ` · ${period}` : ""}{attemptLabel ? ` · ${attemptLabel}` : ""}.</p>
                </DialogHeader>
                <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 pb-2">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Send to</p>
                        <div className="mt-2 grid gap-3 sm:grid-cols-2">
                            <div><Label className="text-xs font-semibold text-slate-500">Contact name</Label><Input className="mt-1.5" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="HR / Safety manager" /></div>
                            <div><Label className="text-xs font-semibold text-slate-500">Email</Label><Input className="mt-1.5" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="hr@previous-employer.com" /></div>
                            <div><Label className="text-xs font-semibold text-slate-500">Phone</Label><Input className="mt-1.5" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 000-0000" /></div>
                            <div><Label className="text-xs font-semibold text-slate-500">Employer address</Label><Input className="mt-1.5" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, State ZIP" /></div>
                        </div>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Documents needed <span className="font-normal normal-case text-slate-400">— the driver asked us to obtain these</span></p>
                        <div className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                            {docs.map((d) => (
                                <label key={d.key} className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50">
                                    <Checkbox checked={!!want[d.key]} onCheckedChange={() => toggle(d.key)} />
                                    <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                                    <span className="flex-1 text-sm font-medium text-slate-700">{d.label}</span>
                                    {d.received
                                        ? <span className="text-[10px] font-semibold text-emerald-600">Received</span>
                                        : d.preselected
                                            ? <span className="text-[10px] font-semibold text-amber-600">Driver requested</span>
                                            : <span className="text-[10px] font-semibold text-slate-400">Driver provides</span>}
                                </label>
                            ))}
                        </div>
                    </div>

                    {dataRows && dataRows.length > 0 && (
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Confirm the data</p>
                            <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-3.5 py-3 hover:bg-slate-50">
                                <Checkbox className="mt-0.5" checked={verifyData} onCheckedChange={toggleVerify} />
                                <span>
                                    <span className="block text-sm font-medium text-slate-700">Ask the employer to confirm these employment details are correct</span>
                                    <span className="mt-0.5 block text-xs text-slate-400">{dataRows.map((r) => r.label).join(" · ")}</span>
                                </span>
                            </label>
                            {verifyData && (
                                <div className="mt-2 grid gap-x-4 gap-y-1.5 rounded-xl bg-slate-50 px-4 py-3 text-xs sm:grid-cols-2">
                                    {dataRows.map((r) => (
                                        <div key={r.label} className="flex justify-between gap-2"><span className="text-slate-400">{r.label}</span><span className="font-medium text-slate-700">{r.value || "—"}</span></div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {!canSend && <p className="text-xs text-amber-600">Select a document or tick “confirm the data” to send.</p>}
                    <div><Label className="text-xs font-semibold text-slate-500">Subject</Label><Input className="mt-1.5" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
                    <div><Label className="text-xs font-semibold text-slate-500">Message</Label><Textarea className="mt-1.5 resize-none" rows={7} value={message} onChange={(e) => { setMessage(e.target.value); setTouchedMsg(true); }} /></div>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button disabled={!canSend} onClick={submit}><Send className="h-4 w-4" /> Send request</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
