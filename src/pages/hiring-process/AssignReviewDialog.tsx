import { useMemo, useState } from "react";
import { Send, BadgeCheck, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { APP_USERS } from "@/data/users.data";
import { ACTOR } from "./applicants.data";

export type ReviewScope = { id: string; label: string };
export type AssignReviewPayload = { name: string; role: string; email: string; subject: string; message: string; scopeIds: string[]; scopeLabel: string };

// ── Assign for review — pick a hiring manager (internal user) and email them the
// assignment to review the whole process OR specific steps (a dynamic "all or
// one" checklist). Shared by the hiring & onboarding lists.
export function AssignReviewDialog({ driverName, carrier, context = "file", scopes = [], onClose, onAssign }: {
    driverName: string; carrier?: string; context?: string; scopes?: ReviewScope[];
    onClose: () => void; onAssign: (v: AssignReviewPayload) => void;
}) {
    // Active users — managers/leads/HR first, then this carrier's users, then the rest.
    const users = useMemo(() => {
        const active = APP_USERS.filter((u) => u.status === "Active");
        const isManager = (t: string) => /manager|supervisor|lead|director|hr|recruit|admin/i.test(t);
        const sorted = [...active.filter((u) => u.accountName === carrier), ...active.filter((u) => u.accountName !== carrier)];
        return sorted.sort((a, b) => (isManager(a.title) ? 0 : 1) - (isManager(b.title) ? 0 : 1));
    }, [carrier]);

    // Summarize a selection into a short label + a sentence fragment for the copy.
    const summarize = (ids: Set<string>): { label: string; text: string } => {
        if (scopes.length === 0 || ids.size === scopes.length) return { label: `Entire ${context}`, text: `the entire ${context}` };
        if (ids.size === 0) return { label: "No steps selected", text: "no steps yet" };
        if (ids.size === 1) { const s = scopes.find((x) => ids.has(x.id))!; return { label: s.label, text: `the “${s.label}” step` }; }
        const names = scopes.filter((x) => ids.has(x.id)).map((x) => x.label).join(", ");
        return { label: `${ids.size} steps`, text: `${ids.size} steps (${names})` };
    };
    const msgFor = (txt: string) => `Hi,\n\nYou have been assigned to review ${txt} for ${driverName}. Please review the submitted forms, documents and signatures and confirm everything meets requirements.\n\nThank you,\n${ACTOR}`;

    const [checked, setChecked] = useState<Set<string>>(() => new Set(scopes.map((s) => s.id)));
    const [userId, setUserId] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [email, setEmail] = useState("");
    const [subject, setSubject] = useState(`Review — ${driverName}`);
    const [message, setMessage] = useState(msgFor(`the entire ${context}`));

    const allSelected = scopes.length > 0 && checked.size === scopes.length;
    const summary = summarize(checked);

    const applyScope = (next: Set<string>) => {
        setChecked(next);
        const all = scopes.length === 0 || next.size === scopes.length;
        const s = summarize(next);
        setSubject(`Review — ${driverName}${all ? "" : ` · ${s.label}`}`);
        setMessage(msgFor(s.text));
    };
    const toggle = (id: string) => { const n = new Set(checked); n.has(id) ? n.delete(id) : n.add(id); applyScope(n); };
    const toggleAll = () => applyScope(allSelected ? new Set() : new Set(scopes.map((s) => s.id)));

    const pickUser = (id: string) => {
        setUserId(id);
        const u = users.find((x) => x.id === id);
        if (u) { setName(u.name); setRole(u.title); setEmail(u.email); }
    };

    const Box = ({ on }: { on: boolean }) => (
        <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white")}>{on && <Check className="h-3 w-3" strokeWidth={3} />}</span>
    );

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
                    <div>
                        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><BadgeCheck className="h-4 w-4" /></span> Assign for review</h3>
                        <p className="mt-1 text-sm text-slate-500">Assign a hiring manager to review {summary.text} for {driverName}.</p>
                    </div>
                    <button type="button" onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-700">✕</button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                    <div>
                        <div className="mb-1.5 flex items-center justify-between">
                            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">What to review</Label>
                            {scopes.length > 0 && <span className="text-[11px] font-semibold text-slate-400">{checked.size}/{scopes.length} steps</span>}
                        </div>
                        {scopes.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-4 py-4 text-center text-sm text-slate-400">The entire {context} will be assigned for review.</div>
                        ) : (
                            <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
                                <li>
                                    <label className="flex cursor-pointer items-center gap-2.5 bg-slate-50/70 px-3 py-2 text-sm font-semibold transition hover:bg-slate-100/70">
                                        <Box on={allSelected} />
                                        <input type="checkbox" checked={allSelected} onChange={toggleAll} className="hidden" />
                                        <span className="min-w-0 flex-1 text-slate-800">All steps <span className="font-normal text-slate-400">· entire {context}</span></span>
                                    </label>
                                </li>
                                {scopes.map((s) => {
                                    const on = checked.has(s.id);
                                    return (
                                        <li key={s.id}>
                                            <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition hover:bg-slate-50">
                                                <Box on={on} />
                                                <input type="checkbox" checked={on} onChange={() => toggle(s.id)} className="hidden" />
                                                <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{s.label}</span>
                                            </label>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                    <div>
                        <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Hiring manager</Label>
                        <Select value={userId} onValueChange={pickUser}>
                            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select a hiring manager…" /></SelectTrigger>
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
                        <div><Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Name</Label><Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></div>
                        <div><Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Title / role</Label><Input className="mt-1.5" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Hiring Manager" /></div>
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
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                    <span className="text-sm text-slate-500">{summary.label}</span>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button disabled={!name.trim() || !email.trim() || (scopes.length > 0 && checked.size === 0)} onClick={() => onAssign({ name: name.trim(), role: role.trim(), email: email.trim(), subject: subject.trim(), message: message.trim(), scopeIds: [...checked], scopeLabel: summary.label })}><Send className="h-4 w-4" /> Assign &amp; send</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
