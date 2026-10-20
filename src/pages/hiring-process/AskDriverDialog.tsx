import { useState } from "react";
import { X, Send, Check, CheckCircle2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeliveryPicker, deliverRequest, needsEmail, type Delivery } from "@/components/share/RequestDelivery";
import type { ConvSource, RecordRef } from "@/pages/messages/messages-store";

// A requestable item — a form, document/signature or quiz the driver still owes.
export type AskItem = { id: string; label: string; hint?: string; done?: boolean };
export type AskGroup = { title: string; items: AskItem[] };
export type AskChannel = Delivery;
export type AskResult = { itemIds: string[]; to: string; channel: AskChannel; subject: string; message: string };

// "Ask driver for more data" popup — pick the forms / documents / signatures /
// quizzes to request from the driver, choose how it reaches them (in-app chat,
// external chat, or email), then send. The request is delivered through Messages
// and handed back to the caller to log against the file. Shared by the hiring &
// onboarding monitor lists.
export function AskDriverDialog({ driverName, driverEmail, groups, title = "Ask driver for more data", subtitle, defaultSubject, defaultMessage, sendLabel = "Send request", defaultDelivery = "In-app", source, record, onOpenInMessages, onClose, onSend }: {
    driverName: string; driverEmail: string; groups: AskGroup[];
    title?: string; subtitle?: string; defaultSubject?: string; defaultMessage?: string; sendLabel?: string;
    defaultDelivery?: Delivery;
    /** What the Messages thread says it came from, and the link back to the file. */
    source: ConvSource; record?: RecordRef;
    onOpenInMessages?: (convId: string) => void;
    onClose: () => void; onSend: (r: AskResult) => void;
}) {
    const outstanding = groups.flatMap((g) => g.items.filter((i) => !i.done).map((i) => i.id));
    const [checked, setChecked] = useState<Set<string>>(() => new Set(outstanding));
    const [to, setTo] = useState(driverEmail);
    const [channel, setChannel] = useState<AskChannel>(defaultDelivery);
    const [sent, setSent] = useState<string | null>(null);
    const first = driverName.split(" ")[0] || "there";
    const [subject, setSubject] = useState(defaultSubject ?? "Action needed — please complete your outstanding items");
    const [message, setMessage] = useState(defaultMessage ?? `Hi ${first}, please complete and sign the items below so we can finish your file.`);

    const toggle = (id: string) => setChecked((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const anyItems = groups.some((g) => g.items.length > 0);
    const selectedCount = checked.size;
    const allIds = groups.flatMap((g) => g.items.map((i) => i.id));
    const allSelected = allIds.length > 0 && allIds.every((id) => checked.has(id));
    const toggleAll = () => setChecked(allSelected ? new Set() : new Set(allIds));
    const labelOf = (id: string) => groups.flatMap((g) => g.items).find((i) => i.id === id)?.label ?? id;
    const emailOk = !needsEmail(channel) || /\S+@\S+\.\S+/.test(to);
    const canSend = !!subject.trim() && emailOk;

    const send = () => {
        if (!canSend) return;
        const r: AskResult = { itemIds: [...checked], to: needsEmail(channel) ? to.trim() : driverName, channel, subject: subject.trim(), message: message.trim() };
        const convId = deliverRequest({
            delivery: channel, name: driverName, email: to.trim(), subject: r.subject, message: r.message,
            asked: r.itemIds.map(labelOf), source, record, roleTag: "Driver",
        });
        onSend(r);
        setSent(convId);
    };

    if (sent) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
                <div className="w-full max-w-md rounded-2xl bg-white px-6 py-8 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
                    <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-7 w-7" /></span>
                    <h3 className="text-lg font-bold text-slate-900">Request sent</h3>
                    <p className="mt-1 text-[13px] text-slate-500">
                        {channel === "Email" ? `Emailed to ${to} — one-way, logged in Messages.`
                            : channel === "External chat" ? `Secure chat link emailed to ${to}. Their reply lands in Messages.`
                                : `Sent to ${driverName}'s chat in the app.`}
                    </p>
                    <div className="mt-6 flex items-center justify-center gap-2">
                        <Button variant="outline" size="sm" onClick={onClose}>Done</Button>
                        {onOpenInMessages && <Button size="sm" onClick={() => { onOpenInMessages(sent); onClose(); }}><MessageSquare className="h-4 w-4" /> Open in Messages</Button>}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
            <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
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
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Send via</label>
                        <DeliveryPicker className="mt-1.5" value={channel} onChange={setChannel} />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Send to</label>
                        {needsEmail(channel) ? (
                            <>
                                <Input className="mt-1.5" value={to} onChange={(e) => setTo(e.target.value)} placeholder={driverEmail || "name@company.com"} />
                                {!emailOk && to.trim() && <p className="mt-1 text-[11px] font-semibold text-rose-600">Enter a valid email address.</p>}
                            </>
                        ) : (
                            <div className="mt-1.5 flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">{driverName.split(" ").map((p) => p[0]).join("").slice(0, 2)}</span>
                                <span className="font-semibold text-slate-800">{driverName}</span>
                                <span className="text-slate-400">· driver chat</span>
                            </div>
                        )}
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
                    <span className="text-sm text-slate-500">{selectedCount ? `${selectedCount} item${selectedCount === 1 ? "" : "s"}` : "No items"} · {channel === "In-app" ? "In-app chat" : channel}</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                        <Button size="sm" disabled={!canSend} onClick={send}><Send className="h-4 w-4" /> {sendLabel}</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
