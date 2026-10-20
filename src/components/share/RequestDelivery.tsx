import { Mail, MessageSquare, Smartphone, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    getConversations, shareToMessages,
    type ConvSource, type RecordRef, type RoleTag,
} from '@/pages/messages/messages-store';

// ─────────────────────────────────────────────────────────────────────────────
// RequestDelivery — the three ways an Ask / Order (or a share) reaches someone.
//
//   · In-app chat    — a TrackSmart user (the driver on the mobile app, a manager). Lands in
//                      their existing chat if there is one, otherwise opens a new one.
//   · External chat  — an outsider by email, with a secure chat link they reply on. The
//                      thread lives in our Messages box.
//   · Email          — a one-way email. Logged in Messages, but nobody can reply on it.
//
// Every Ask / Order dialog used to offer "Email | In-app" and then only write a line to the
// file's activity — nothing was actually sent anywhere a person would read it. Sending now
// goes through the same messages-store the Share to chat dialog uses, so a request and a
// share land in the same place and look the same when they get there.
// ─────────────────────────────────────────────────────────────────────────────

export type Delivery = 'In-app' | 'External chat' | 'Email';

export const DELIVERIES: { id: Delivery; label: string; sub: string; icon: LucideIcon }[] = [
    { id: 'In-app', label: 'In-app chat', sub: 'TrackSmart user · app', icon: Smartphone },
    { id: 'External chat', label: 'External chat', sub: 'Secure link · they reply', icon: MessageSquare },
    { id: 'Email', label: 'Email', sub: 'One-way · no reply', icon: Mail },
];

/** Whether this delivery needs an email address to send to. */
export const needsEmail = (d: Delivery) => d !== 'In-app';

export function DeliveryPicker({ value, onChange, className }: {
    value: Delivery; onChange: (d: Delivery) => void; className?: string;
}) {
    return (
        <div className={cn('grid grid-cols-1 gap-2 sm:grid-cols-3', className)}>
            {DELIVERIES.map(({ id, label, sub, icon: Icon }) => {
                const active = value === id;
                return (
                    <button key={id} type="button" onClick={() => onChange(id)} aria-pressed={active}
                        className={cn('flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors',
                            active ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}>
                        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500')}><Icon size={15} /></span>
                        <span className="min-w-0">
                            <span className={cn('block text-[13px] font-semibold', active ? 'text-blue-900' : 'text-slate-700')}>{label}</span>
                            <span className="block truncate text-[11px] text-slate-400">{sub}</span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Send a request through Messages. Returns the conversation id.
 *
 * What was asked for goes in the note as a list — they are things to do, not files, so they
 * are not attachments (see share-payloads). Real files, when there are any, go in `files`.
 */
export function deliverRequest({ delivery, name, email, subject, message, asked = [], files = [], source, record, roleTag }: {
    delivery: Delivery;
    name: string;
    email?: string;
    subject: string;
    message: string;
    /** The items being requested, listed in the note. */
    asked?: string[];
    files?: string[];
    source: ConvSource;
    record?: RecordRef;
    roleTag?: RoleTag;
}): string {
    const external = delivery !== 'In-app';
    const body = asked.length
        ? `${message}\n\nRequested:\n${asked.map((a) => `  • ${a}`).join('\n')}`
        : message;
    const n = asked.length;
    const what = n ? `Requested ${n} item${n === 1 ? '' : 's'}` : 'Sent a request';
    const systemText = delivery === 'Email'
        ? `${what} by email to ${email || name} · one-way (no reply chat).`
        : delivery === 'External chat'
            ? `${what} from ${email || name} · secure chat link sent by email.`
            : `${what} — ${source.label}.`;
    // An in-app request continues the person's chat when they already have one.
    const existing = external ? undefined : getConversations()
        .find((c) => c.kind === 'internal' && !c.ai && c.name.trim().toLowerCase() === name.trim().toLowerCase());
    return shareToMessages({
        recipientName: name,
        recipientEmail: external ? email : undefined,
        recipientId: existing?.id,
        channel: external ? 'email' : 'in-app',
        externalDelivery: delivery === 'Email' ? 'email' : external ? 'chat' : undefined,
        roleTag,
        subject,
        message: body,
        items: files.map((f) => ({ name: f })),
        source,
        record,
        systemText,
    });
}
