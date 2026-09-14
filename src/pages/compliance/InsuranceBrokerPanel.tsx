import { useEffect, useState } from 'react';
import { Briefcase, Mail, Phone, Pencil, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    brokerIsEmpty, emptyBroker, sampleBroker, useInsuranceBroker, type InsuranceBroker,
} from '@/pages/compliance/insurance-broker.data';

/**
 * The broker of record, in the Insurance record's header.
 *
 * Above the policies rather than inside them: the brokerage, the agent and how to reach them
 * are the same for every policy on the page, and a certificate needed at 6am is a phone call,
 * not a row in a table. Captured once, edited in place.
 */
export function InsuranceBrokerFacts({ accountId, condensed = false }: { accountId?: string; condensed?: boolean }) {
    const { broker, save, canSave } = useInsuranceBroker(accountId);
    const [editing, setEditing] = useState(false);
    const empty = brokerIsEmpty(broker);

    // Condensed: who placed it and who to call. Everything else waits for the full header.
    if (condensed) {
        if (empty) return null;
        return (
            <span className="flex min-w-0 items-center gap-2 text-[12px] text-slate-500">
                <Briefcase size={12} className="shrink-0 text-slate-400" />
                <span className="truncate font-semibold text-slate-600">{broker.producer || broker.agent}</span>
                {broker.phone && <span className="hidden shrink-0 tabular-nums md:inline">· {broker.phone}</span>}
            </span>
        );
    }

    return (
        <div className="border-t border-slate-100">
            <div className="flex items-center justify-between gap-2 bg-slate-50/50 px-4 py-1.5">
                <span className="flex min-w-0 items-center gap-2">
                    <Briefcase size={13} className="shrink-0 text-slate-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Broker of record</span>
                </span>
                {canSave && (
                    <button type="button" onClick={() => setEditing(true)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-white hover:text-blue-600">
                        <Pencil size={11} /> {empty ? 'Add' : 'Edit'}
                    </button>
                )}
            </div>

            {empty ? (
                <p className="px-4 py-3 text-[12px] text-slate-400">
                    No broker recorded yet — add the brokerage and agent who placed these policies.
                </p>
            ) : (
                <div className="flex flex-wrap gap-x-8 gap-y-3 px-4 py-3">
                    <BrokerFact label="Producer / broker" Icon={Briefcase} className="min-w-[13rem]">{broker.producer}</BrokerFact>
                    <BrokerFact label="Agent" Icon={User} className="min-w-[11rem]">{broker.agent}</BrokerFact>
                    <BrokerFact label="Phone" Icon={Phone}>
                        {broker.phone ? <a href={`tel:${broker.phone.replace(/[^\d+]/g, '')}`} className="tabular-nums hover:text-blue-600">{broker.phone}</a> : null}
                    </BrokerFact>
                    <BrokerFact label="Email" Icon={Mail} className="min-w-[14rem]">
                        {broker.email ? <a href={`mailto:${broker.email}`} className="truncate hover:text-blue-600">{broker.email}</a> : null}
                    </BrokerFact>
                </div>
            )}

            {editing && (
                <BrokerDialog
                    initial={broker}
                    onClose={() => setEditing(false)}
                    onSave={next => { save(next); setEditing(false); }}
                />
            )}
        </div>
    );
}

function BrokerFact({ label, Icon, children, className }: {
    label: string; Icon: typeof Briefcase; children: React.ReactNode; className?: string;
}) {
    return (
        <div className={cn('min-w-0', className ?? 'min-w-[9rem]')}>
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Icon size={11} /> {label}
            </div>
            <div className="mt-0.5 truncate text-[13px] font-semibold text-slate-800">
                {children || <span className="font-normal text-slate-400">—</span>}
            </div>
        </div>
    );
}

function BrokerDialog({ initial, onClose, onSave }: {
    initial: InsuranceBroker; onClose: () => void; onSave: (b: InsuranceBroker) => void;
}) {
    const [draft, setDraft] = useState<InsuranceBroker>(initial);
    const set = (k: keyof InsuranceBroker, v: string) => setDraft(d => ({ ...d, [k]: v }));

    // Escape closes it, like every other dialog in the app.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const input = 'h-9 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
            <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Briefcase size={16} /></span>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900">Broker of record</h3>
                            <p className="text-[12px] text-slate-500">Who placed this carrier’s policies, and who to call about them.</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={16} /></button>
                </div>

                <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2">
                    <label className="sm:col-span-2">
                        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Producer / broker name</span>
                        <input value={draft.producer} onChange={e => set('producer', e.target.value)} placeholder="e.g. Marsh McLennan Agency" className={input} />
                    </label>
                    <label>
                        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Agent name</span>
                        <input value={draft.agent} onChange={e => set('agent', e.target.value)} placeholder="Who handles this account" className={input} />
                    </label>
                    <label>
                        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Phone</span>
                        <input value={draft.phone} onChange={e => set('phone', e.target.value)} placeholder="(416) 555-0142" inputMode="tel" className={input} />
                    </label>
                    <label className="sm:col-span-2">
                        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Email</span>
                        <input value={draft.email} onChange={e => set('email', e.target.value)} placeholder="agent@brokerage.com" inputMode="email" className={input} />
                    </label>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-3">
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setDraft(sampleBroker())}
                            className="text-[12px] font-semibold text-violet-600 hover:underline">Fill sample</button>
                        {!brokerIsEmpty(draft) && (
                            <button type="button" onClick={() => setDraft(emptyBroker())}
                                className="text-[12px] font-semibold text-slate-400 hover:text-rose-600">Clear</button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                        <button type="button" onClick={() => onSave(draft)} className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">Save</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
