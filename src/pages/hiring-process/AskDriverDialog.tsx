import { useState } from "react";
import { X, Send, Mail, MessageSquarePlus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// A requestable item — a form, document/signature or quiz the driver still owes.
export type AskItem = { id: string; label: string; hint?: string; done?: boolean };
export type AskGroup = { title: string; items: AskItem[] };
export type AskChannel = "Email" | "In-app";
export type AskResult = { itemIds: string[]; to: string; channel: AskChannel; subject: string; message: string };

// "Ask driver for more data" popup — pick the forms / documents / signatures /
// quizzes to request from the driver, then send. Shared by the hiring &
// onboarding monitor lists (and file dashboards).
export function AskDriverDialog({ driverName, driverEmail, groups, title = "Ask driver for more data", subtitle, defaultSubject, defaultMessage, sendLabel = "Send request", onClose, onSend }: {
    driverName: string; driverEmail: string; groups: AskGroup[];
    title?: string; subtitle?: string; defaultSubject?: string; defaultMessage?: string; sendLabel?: string;
    onClose: () => void; onSend: (r: AskResult) => void;
}) {
    const outstanding = groups.flatMap((g) => g.items.filter((i) => !i.done).map((i) => i.id));
    const [checked, setChecked] = useState<Set<string>>(() => new Set(outstanding));
    const [to, setTo] = useState(driverEmail);
    const [channel, setChannel] = useState<AskChannel>("Email");
    const first = driverName.split(" ")[0] || "there";
    const [subject, setSubject] = useState(defaultSubject ?? "Action needed — please complete your outstanding items");
    const [message, setMessage] = useState(defaultMessage ?? `Hi ${first}, please complete and sign the items below so we can finish your file.`);

    const toggle = (id: string) => setChecked((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const anyItems = groups.some((g) => g.items.length > 0);
    const selectedCount = checked.size;
    const allIds = groups.flatMap((g) => g.items.map((i) => i.id));
    const allSelected = allIds.length > 0 && allIds.every((id) => checked.has(id));
    const toggleAll = () => setChecked(allSelected ? new Set() : new Set(allIds));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white"><Send className="h-4 w-4" /></span>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">{title}</h3>
                            <p className="text-sm text-slate-500">{subtitle ?? `Ask ${driverName} to complete forms, documents & signatures.`}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-4 w-4" /></button>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Send to</label>
                            <Input className="mt-1.5" value={to} onChange={(e) => setTo(e.target.value)} placeholder={driverEmail || "name@company.com"} />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Send via</label>
                            <div className="mt-1.5 flex rounded-lg border border-slate-200 p-1">
                                {(["Email", "In-app"] as AskChannel[]).map((c) => (
                                    <button key={c} type="button" onClick={() => setChannel(c)} className={cn("flex-1 rounded-md py-1.5 text-sm font-semibold transition", channel === c ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50")}>{c === "Email" ? <Mail className="mr-1 inline h-3.5 w-3.5" /> : <MessageSquarePlus className="mr-1 inline h-3.5 w-3.5" />}{c}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="mb-1.5 flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Items to request</label>
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] font-semibold text-slate-400">{selectedCount} selected</span>
                                {anyItems && <button type="button" onClick={toggleAll} className="text-[11px] font-bold text-blue-600 hover:text-blue-700">{allSelected ? "Clear all" : "Select all"}</button>}
                            </div>
                        </div>
                        {!anyItems ? (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-4 py-6 text-center text-sm text-slate-400">Nothing outstanding — send a general note below.</div>
                        ) : (
                            <div className="space-y-3">
                                {groups.filter((g) => g.items.length > 0).map((g) => (
                                    <div key={g.title}>
                                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{g.title}</p>
                                        <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
                                            {g.items.map((item) => {
                                                const on = checked.has(item.id);
                                                return (
                                                    <li key={item.id}>
                                                        <label className={cn("flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition hover:bg-slate-50", item.done && "opacity-60")}>
                                                            <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white")}>{on && <Check className="h-3 w-3" strokeWidth={3} />}</span>
                                                            <input type="checkbox" checked={on} onChange={() => toggle(item.id)} className="hidden" />
                                                            <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{item.label}</span>
                                                            {item.done && <span className="shrink-0 text-[11px] font-semibold text-emerald-600">Signed</span>}
                                                        </label>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Subject</label>
                        <Input className="mt-1.5" value={subject} onChange={(e) => setSubject(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Message</label>
                        <textarea className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                    <span className="text-sm text-slate-500">{selectedCount ? `${selectedCount} item${selectedCount === 1 ? "" : "s"}` : "No items"} · {channel}</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                        <Button size="sm" disabled={!subject.trim()} onClick={() => onSend({ itemIds: [...checked], to, channel, subject: subject.trim(), message: message.trim() })}><Send className="h-4 w-4" /> {sendLabel}</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
