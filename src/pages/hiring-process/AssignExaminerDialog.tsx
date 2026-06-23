import { useMemo, useState } from "react";
import { Send, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { APP_USERS } from "@/data/users.data";
import { ACTOR } from "./applicants.data";

export type AssignExaminerPayload = { name: string; role: string; email: string; subject: string; message: string; formLink: string };

// ── Assign Road Test Examiner — pick an internal user and email them the assignment ──
export function AssignExaminerDialog({ driverName, carrier, initial, inline, sendLabel, onClose, onAssign }: {
    driverName: string; carrier: string;
    initial?: { examiner?: string; examinerRole?: string; email?: string };
    inline?: boolean;
    sendLabel?: string;
    onClose: () => void;
    onAssign: (v: AssignExaminerPayload) => void;
}) {
    // Active users — those at this carrier first, so the obvious examiners are on top.
    const users = useMemo(() => {
        const active = APP_USERS.filter((u) => u.status === "Active");
        return [...active.filter((u) => u.accountName === carrier), ...active.filter((u) => u.accountName !== carrier)];
    }, [carrier]);
    const initialUser = users.find((u) => u.email === initial?.email || u.name === initial?.examiner);
    const formLink = `https://app.tracksmart.com/r/road-test-${driverName.toLowerCase().replace(/\s+/g, "-")}-x8f2`;
    const [userId, setUserId] = useState(initialUser?.id ?? "");
    const [name, setName] = useState(initial?.examiner ?? "");
    const [role, setRole] = useState(initial?.examinerRole ?? "");
    const [email, setEmail] = useState(initial?.email ?? "");
    const [subject, setSubject] = useState(`Road Test Assignment — ${driverName}`);
    const [message, setMessage] = useState(
        `Hi,\n\nYou have been assigned to conduct the FMCSA §391.31 road test for ${driverName}.\n\nThe Road Test Evaluation is a scored §391.31 assessment — you'll record the driver & equipment details, rate each section 1–5 (minimum 12/15 to pass), and certify the result. From there you can issue the Certificate of Road Test, accept a licence as equivalent, or upload a prior certificate.\n\nOpen the Road Test Evaluation form using your secure link below:\n${formLink}\n\nThank you,\n${ACTOR}`,
    );

    const pickUser = (id: string) => {
        setUserId(id);
        const u = users.find((x) => x.id === id);
        if (u) { setName(u.name); setRole(u.title); setEmail(u.email); }
    };
    const submit = () => onAssign({ name: name.trim(), role: role.trim(), email: email.trim(), subject: subject.trim(), message: message.trim(), formLink });

    const header = (
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
            <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><Send className="h-4 w-4" /></span> Assign Road Test Examiner</h3>
                <p className="mt-1 text-sm text-slate-500">Select the user who will take {driverName}'s §391.31 road test and email them the assignment.</p>
            </div>
            {!inline && <button type="button" onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-700">✕</button>}
        </div>
    );
    const body = (
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div>
                <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Examiner</Label>
                <Select value={userId} onValueChange={pickUser}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select a user…" /></SelectTrigger>
                    <SelectContent>
                        {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                                <span className="font-medium text-slate-800">{u.name}</span>
                                <span className="text-slate-400"> · {u.title}</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Examiner name</Label><Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></div>
                <div><Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Title / role</Label><Input className="mt-1.5" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Road Test Examiner" /></div>
            </div>
            <div>
                <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Email</Label>
                <Input className="mt-1.5" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
            </div>
            <div>
                <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Subject</Label>
                <Input className="mt-1.5" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
                <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Message</Label>
                <Textarea className="mt-1.5 resize-none" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><ExternalLink className="h-4 w-4" /></span>
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Road Test Evaluation — secure form link</p>
                    <p className="truncate text-xs text-blue-600">{formLink}</p>
                </div>
            </div>
        </div>
    );
    const footer = (
        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button disabled={!name.trim() || !email.trim()} onClick={submit}><Send className="h-4 w-4" /> {sendLabel ?? "Assign & send email"}</Button>
        </div>
    );

    if (inline) {
        return (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {header}{body}{footer}
            </div>
        );
    }
    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {header}{body}{footer}
            </div>
        </div>
    );
}
