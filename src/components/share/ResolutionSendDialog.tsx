import { useState } from 'react';
import { X, Send, CheckCircle2, MessageSquare, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeliveryPicker, deliverRequest, needsEmail, type Delivery } from '@/components/share/RequestDelivery';
import { DISP_ICON } from '@/components/ui/ReviewResolution';
import { HOS_DISPOSITION_BY_ID, HOS_TRAINING_TYPES, type HosDisposition } from '@/pages/hos/hos-violations.data';
import type { ConvSource, RecordRef } from '@/pages/messages/messages-store';

// ─────────────────────────────────────────────────────────────────────────────
// ResolutionSendDialog — a review resolution that reaches the driver.
//
// "Issue warning letter", "Send safety alert", "Send driver notice", "Assign training" and
// "Terminate driver" all end with something the driver has to read. The Review tab used to
// close the record and write one line to the activity trail — nothing went anywhere. The
// resolution now goes out the same three ways an Ask / Order does (in-app chat, external
// chat by secure link, one-way email), through Messages, and the record closes with a
// line that says how and to whom it was sent.
//
// "Dismiss as false" has nothing to send, so it never opens this.
// ─────────────────────────────────────────────────────────────────────────────

/** The resolutions that are delivered to the driver. */
export const DELIVERED_DISPOSITIONS: HosDisposition[] = ['training', 'warning', 'alert', 'notice', 'terminated'];
export const isDeliveredDisposition = (d: HosDisposition) => DELIVERED_DISPOSITIONS.includes(d);

export interface ResolutionSendResult {
    delivery: Delivery;
    to: string;
    subject: string;
    message: string;
    trainingName?: string;
    /** "sent via in-app chat to John Smith" — the line the activity trail carries. */
    via: string;
    convId: string;
}

/** What each resolution says by default, in the driver's terms. */
function defaultsFor(disp: HosDisposition, first: string, about: string, when: string) {
    switch (disp) {
        case 'warning': return {
            subject: `Warning letter — ${about}`,
            message: `Hi ${first}, a formal warning letter has been issued to your file for ${about} on ${when}. Please read it and acknowledge it in the app. A further occurrence may lead to disciplinary action.`,
        };
        case 'alert': return {
            subject: `Safety alert — ${about}`,
            message: `Hi ${first}, this is a safety alert following ${about} on ${when}. Please review the safety expectations for this and reach out to your safety manager with any questions.`,
        };
        case 'notice': return {
            subject: `Notice — ${about}`,
            message: `Hi ${first}, please note that ${about} on ${when} has been recorded on your file. Contact the office if you believe any of the details are wrong.`,
        };
        case 'training': return {
            subject: `Training assigned — ${about}`,
            message: `Hi ${first}, following ${about} on ${when}, a training course has been assigned to you. Please complete it in the app within 14 days.`,
        };
        case 'terminated': return {
            subject: `Notice of termination — ${about}`,
            message: `Hi ${first}, following ${about} on ${when}, your engagement with the carrier is being terminated. Please return company equipment and contact the office about final arrangements.`,
        };
        default: return { subject: about, message: '' };
    }
}

export function ResolutionSendDialog({
    disposition, driverName, driverEmail, about, when, source, record, courses = HOS_TRAINING_TYPES,
    onOpenInMessages, onClose, onSent,
}: {
    disposition: HosDisposition;
    driverName: string;
    driverEmail?: string;
    /** "Ticket OFF-84729 · Speeding" — what the resolution is about. */
    about: string;
    when: string;
    source: ConvSource;
    record?: RecordRef;
    courses?: string[];
    onOpenInMessages?: (convId: string) => void;
    onClose: () => void;
    /** Called once it has gone out; the caller closes the record with `via`. */
    onSent: (r: ResolutionSendResult) => void;
}) {
    const meta = HOS_DISPOSITION_BY_ID[disposition];
    const Icon = DISP_ICON[disposition];
    const first = driverName.split(' ')[0] || 'there';
    const d = defaultsFor(disposition, first, about, when);
    const [delivery, setDelivery] = useState<Delivery>('In-app');
    const [to, setTo] = useState(driverEmail ?? '');
    const [subject, setSubject] = useState(d.subject);
    const [message, setMessage] = useState(d.message);
    const [course, setCourse] = useState(courses[0] ?? '');
    const [sent, setSent] = useState<ResolutionSendResult | null>(null);
    const emailOk = !needsEmail(delivery) || /\S+@\S+\.\S+/.test(to);
    const canSend = !!subject.trim() && emailOk && (disposition !== 'training' || !!course);

    const send = () => {
        if (!canSend) return;
        const body = disposition === 'training' ? `${message.trim()}\n\nCourse: ${course}` : message.trim();
        const files = disposition === 'warning' ? [`Warning letter — ${about}.pdf`] : [];
        const convId = deliverRequest({
            delivery, name: driverName, email: to.trim(), subject: subject.trim(), message: body,
            files, source, record, roleTag: 'Driver',
        });
        const toLabel = needsEmail(delivery) ? to.trim() : driverName;
        const via = delivery === 'Email' ? `emailed to ${toLabel}` : delivery === 'External chat' ? `sent by secure chat link to ${toLabel}` : `sent to ${toLabel}'s in-app chat`;
        const r: ResolutionSendResult = { delivery, to: toLabel, subject: subject.trim(), message: body, trainingName: disposition === 'training' ? course : undefined, via, convId };
        onSent(r);
        setSent(r);
    };

    if (sent) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
                <div className="w-full max-w-md rounded-2xl bg-white px-6 py-8 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
                    <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-7 w-7" /></span>
                    <h3 className="text-lg font-bold text-slate-900">{meta.label} — sent</h3>
                    <p className="mt-1 text-[13px] text-slate-500">
                        {sent.delivery === 'Email' ? `Emailed to ${sent.to} — one-way, logged in Messages.`
                            : sent.delivery === 'External chat' ? `Secure chat link emailed to ${sent.to}. Their reply lands in Messages.`
                                : `Delivered to ${driverName}'s chat in the app.`}
                        {' '}The record is closed with this resolution.
                    </p>
                    <div className="mt-6 flex items-center justify-center gap-2">
                        <Button variant="outline" size="sm" onClick={onClose}>Done</Button>
                        {onOpenInMessages && <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => { onOpenInMessages(sent.convId); onClose(); }}><MessageSquare className="h-4 w-4" /> Open in Messages</Button>}
                    </div>
                </div>
            </div>
        );
    }

    const initials = driverName.split(' ').map((p) => p[0]).join('').slice(0, 2);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
            <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg border', meta.tone)}><Icon className="h-4 w-4" /></span>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">{meta.label}</h3>
                            <p className="text-sm text-slate-500">To {driverName} · {about}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-4 w-4" /></button>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Send via</label>
                        <DeliveryPicker className="mt-1.5" value={delivery} onChange={setDelivery} />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Send to</label>
                        {needsEmail(delivery) ? (
                            <>
                                <Input className="mt-1.5" value={to} onChange={(e) => setTo(e.target.value)} placeholder={driverEmail || 'name@company.com'} />
                                {!emailOk && to.trim() && <p className="mt-1 text-[11px] font-semibold text-rose-600">Enter a valid email address.</p>}
                            </>
                        ) : (
                            <div className="mt-1.5 flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">{initials}</span>
                                <span className="font-semibold text-slate-800">{driverName}</span>
                                <span className="text-slate-400">· driver chat</span>
                            </div>
                        )}
                    </div>

                    {disposition === 'training' && (
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Course</label>
                            <div className="relative mt-1.5">
                                <select value={course} onChange={(e) => setCourse(e.target.value)} className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                                    {courses.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <GraduationCap className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500" />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Subject</label>
                        <Input className="mt-1.5" value={subject} onChange={(e) => setSubject(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Message</label>
                        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    {disposition === 'warning' && (
                        <p className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-[12px] text-amber-800">The warning letter is filed to the driver&rsquo;s compliance record with this citation&rsquo;s details, and a copy goes with this message.</p>
                    )}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-6 py-4">
                    <span className="text-[11px] text-slate-400">Delivered through Messages · closes the review with this resolution.</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                        <Button size="sm" disabled={!canSend} className="bg-blue-600 text-white hover:bg-blue-700" onClick={send}><Send className="h-4 w-4" /> Send &amp; close review</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
