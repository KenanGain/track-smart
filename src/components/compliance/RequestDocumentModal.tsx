import { useEffect, useState } from 'react';
import { X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    REQUEST_TEMPLATES, renderTemplate,
    type Recipient, type Channel, type RequestRecord,
} from '@/pages/compliance/compliance-monitoring.data';

const RECIPIENTS: Recipient[] = ['Driver', 'Safety Manager', 'Carrier Admin'];
const CHANNELS: Channel[] = ['In-app', 'Email', 'SMS'];

/** Request/Order popup — collects recipients, channels, deadline + message and
 *  returns a RequestRecord. Prototype: the send is mocked by the caller. */
export function RequestDocumentModal({ isOpen, itemName, entityName, company, defaultRecipient, count, onClose, onSend }: {
    isOpen: boolean;
    itemName: string;
    entityName: string;
    company: string;
    defaultRecipient: Recipient;
    /** When > 1, this is a bulk request across N items. */
    count?: number;
    onClose: () => void;
    onSend: (rec: Omit<RequestRecord, 'id' | 'sentAt' | 'sentBy'>) => void;
}) {
    const [recipients, setRecipients] = useState<Recipient[]>([defaultRecipient]);
    const [methods, setMethods] = useState<Channel[]>(['In-app', 'Email']);
    const [deadlineDays, setDeadlineDays] = useState(7);
    const [templateId, setTemplateId] = useState('missing');
    const [message, setMessage] = useState('');
    const [autoReminder, setAutoReminder] = useState(true);
    const [escalate, setEscalate] = useState(true);

    const deadlineISO = new Date(Date.now() + deadlineDays * 86_400_000).toISOString().slice(0, 10);

    useEffect(() => {
        if (!isOpen) return;
        setRecipients([defaultRecipient]);
        setMethods(['In-app', 'Email']);
        setDeadlineDays(7);
        setTemplateId('missing');
        setAutoReminder(true);
        setEscalate(true);
    }, [isOpen, defaultRecipient]);

    useEffect(() => {
        const tpl = REQUEST_TEMPLATES.find(t => t.id === templateId);
        if (tpl) setMessage(renderTemplate(tpl.body, { item: itemName, company, deadline: deadlineISO }));
    }, [templateId, itemName, company, deadlineISO]);

    if (!isOpen) return null;

    const toggle = <T,>(arr: T[], v: T, set: (a: T[]) => void) =>
        set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

    const canSend = recipients.length > 0 && methods.length > 0 && message.trim().length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/30 px-6 py-5">
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-slate-900">Request Document</h3>
                        <p className="mt-0.5 truncate text-sm text-slate-500">
                            {count && count > 1 ? `${count} items` : itemName} · {count && count > 1 ? company : entityName}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto p-6">
                    <Field label="Send to">
                        <div className="flex flex-wrap gap-2">
                            {RECIPIENTS.map(r => (
                                <Chip key={r} active={recipients.includes(r)} onClick={() => toggle(recipients, r, setRecipients)}>{r}</Chip>
                            ))}
                        </div>
                    </Field>

                    <Field label="Method">
                        <div className="flex flex-wrap gap-2">
                            {CHANNELS.map(m => (
                                <Chip key={m} active={methods.includes(m)} onClick={() => toggle(methods, m, setMethods)}>{m}</Chip>
                            ))}
                        </div>
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Deadline">
                            <select value={deadlineDays} onChange={(e) => setDeadlineDays(+e.target.value)}
                                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {[3, 5, 7, 14, 30].map(d => <option key={d} value={d}>{d} days ({new Date(Date.now() + d * 86_400_000).toISOString().slice(5, 10)})</option>)}
                            </select>
                        </Field>
                        <Field label="Template">
                            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}
                                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {REQUEST_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                        </Field>
                    </div>

                    <Field label="Message">
                        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
                            className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </Field>

                    <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
                            <input type="checkbox" checked={autoReminder} onChange={(e) => setAutoReminder(e.target.checked)} className="h-4 w-4 rounded accent-blue-600" />
                            Auto-reminder every 2 days until completed
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
                            <input type="checkbox" checked={escalate} onChange={(e) => setEscalate(e.target.checked)} className="h-4 w-4 rounded accent-blue-600" />
                            Escalate to Safety Manager after 5 days
                        </label>
                    </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" disabled={!canSend}
                        onClick={() => { onSend({ recipients, methods, deadline: deadlineISO, message: message.trim() }); onClose(); }}
                        className={cn("flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold text-white shadow-sm", canSend ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 cursor-not-allowed")}>
                        <Send className="h-4 w-4" /> Send Request
                    </button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</label>
            {children}
        </div>
    );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button type="button" onClick={onClick}
            className={cn("rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600")}>
            {children}
        </button>
    );
}
