import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ACTOR } from "./applicants.data";
import { SOURCE_LABEL, todayIso, type FormCopy } from "./form-copies";

/**
 * A reviewer putting their name to one copy: "I looked at this, it is the signed form."
 *
 * Asked the same way everywhere a copy can be verified — the hiring file, the onboarding
 * file, the driver's own tab — so Verified means one thing across the product.
 */
export function VerifyCopyDialog({ copy, formName, onClose, onConfirm }: {
    copy: FormCopy; formName: string; onClose: () => void;
    onConfirm: (r: { by: string; date: string; note?: string }) => void;
}) {
    const [by, setBy] = useState(ACTOR);
    const [date, setDate] = useState(todayIso());
    const [note, setNote] = useState("");
    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-md p-0">
                <DialogHeader className="border-b border-slate-200 px-6 py-4 text-left">
                    <DialogTitle className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white"><BadgeCheck className="h-4 w-4" /></span> Verify this copy</DialogTitle>
                    <p className="text-sm font-normal text-slate-500">{formName} — {SOURCE_LABEL[copy.source].toLowerCase()}{copy.by ? `, signed by ${copy.by}` : ""}{copy.at ? ` on ${copy.at}` : ""}.</p>
                </DialogHeader>
                <div className="space-y-4 px-6 py-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Reviewer</Label>
                            <Input className="mt-1.5" value={by} onChange={(e) => setBy(e.target.value)} />
                        </div>
                        <div>
                            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Date</Label>
                            <Input className="mt-1.5" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Note (optional)</Label>
                        <Textarea className="mt-1.5 resize-none" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Signature matches the licence; dated before start." />
                    </div>
                    <p className="text-xs text-slate-500">Recorded on this copy. A copy signed again later starts unverified.</p>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button disabled={!by.trim() || !date} onClick={() => onConfirm({ by: by.trim(), date, note })}><BadgeCheck className="h-4 w-4" /> Mark verified</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
