// ─────────────────────────────────────────────────────────────────────────────
// The kit checklist, as the driver sees it in their chat — both ways round.
//
// The office assigned or handed them kit and asked them to collect it. They tick
// what they actually walked away with — one at a time, or Select all — and confirm.
//
// Ticking per item rather than one "got it" button, because a collection of five
// things is rarely five things collected: two were on the shelf and the third is
// still on order. Confirming a partial pick-up is a real answer, and the card says
// which ones are still outstanding rather than rounding up to done.
//
// It runs in both directions. Collecting is the office handing kit out; returning is the
// office asking for it back — the half of a driver change that used to be a phone call and
// got forgotten. Same list, same ticks, same partial answer; only the words change, because
// to the person holding it the job is identical.
//
// The office side sees the same card read-only (`preview`), so the thread reads the
// same from both ends.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import {
    Boxes, Check, CheckCircle2, PackageCheck, ClipboardList, PenLine, Clock, Truck, Undo2,
    Building2, UserRound, CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InventoryCollection } from './messages-store';
import { formatDue } from '@/pages/inventory/inventory-collection';

const ROUTE_META = {
    assigned: { label: 'Assigned', cls: 'border-blue-200 bg-blue-50 text-blue-700', Icon: ClipboardList },
    carried: { label: 'In the cab', cls: 'border-amber-200 bg-amber-50 text-amber-700', Icon: Truck },
    handed: { label: 'Sign for', cls: 'border-violet-200 bg-violet-50 text-violet-700', Icon: PenLine },
} as const;

/** The words. The job is the same either way; what the driver is being asked is not. */
const DIRECTION_COPY = {
    collect: {
        title: 'Collect from the office',
        titleDone: 'Collected from the office',
        prompt: 'Tick what you have picked up.',
        confirmAll: 'I have collected these',
        confirmSome: (n: number, all: number) => `Collected ${n} of ${all}`,
        waiting: (who: string) => `Waiting for ${who} to confirm what they picked up.`,
        allDone: (n: number, who: string) => `All ${n} confirmed by ${who}.`,
        partial: 'still at the office',
        outstanding: 'Waiting on',
    },
    return: {
        title: 'Hand back to the office',
        titleDone: 'Handed back to the office',
        prompt: 'Tick what you have handed in.',
        confirmAll: 'I have handed these back',
        confirmSome: (n: number, all: number) => `Handed back ${n} of ${all}`,
        waiting: (who: string) => `Waiting for ${who} to confirm what they handed in.`,
        allDone: (n: number, who: string) => `All ${n} handed back by ${who}.`,
        partial: 'still with them',
        outstanding: 'Still to come back',
    },
} as const;


export function InventoryCollectionCard({ collection, preview, onConfirm }: {
    collection: InventoryCollection;
    /** The office's own copy — shows the state, offers no buttons. */
    preview?: boolean;
    onConfirm: (collectedItemIds: string[]) => void;
}) {
    const done = collection.status === 'collected';
    const back = collection.direction === 'return';
    const copy = DIRECTION_COPY[back ? 'return' : 'collect'];

    // Where the other end of the trip is. "The office" is the usual answer and the default,
    // but a card that says it when the thing is in Mike's cab sends somebody on a wasted trip.
    const person = collection.counterparty?.kind === 'person' ? collection.counterparty.name : null;
    const place = person || 'the office';
    const title = back
        ? (person ? `Hand to ${person}` : copy.title)
        : (person ? `Collect from ${person}` : copy.title);
    const due = collection.dueAt ? formatDue(collection.dueAt) : null;
    const confirmed = useMemo(() => new Set(collection.collectedItemIds ?? []), [collection.collectedItemIds]);

    // Everything starts ticked: the common case is that they picked up the lot, and making
    // them tick five boxes to say so is a tax on the normal path.
    const [picked, setPicked] = useState<Set<string>>(() => new Set(collection.lines.map(l => l.itemId)));

    const toggle = (id: string) => setPicked(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const all = collection.lines.length;
    const allPicked = picked.size === all;
    const anyHanded = collection.lines.some(l => l.route === 'handed');

    const shownAsOn = (id: string) => (done ? confirmed.has(id) : picked.has(id));
    const outstanding = done ? collection.lines.filter(l => !confirmed.has(l.itemId)) : [];

    return (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {/* Header */}
            <div className={cn('flex items-start gap-2.5 border-b px-3.5 py-2.5',
                done ? 'border-emerald-100 bg-emerald-50/70' : 'border-slate-100 bg-slate-50/80')}>
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    done ? 'bg-emerald-600 text-white' : back ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white')}>
                    {done ? <CheckCircle2 size={16} /> : back ? <Undo2 size={16} /> : <PackageCheck size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-slate-900">
                        {done ? copy.titleDone : title}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {all} item{all === 1 ? '' : 's'} · issued by {collection.issuedBy}
                        {collection.holderLabel && (
                            <> · <span className="inline-flex items-center gap-1"><Truck size={10} />{collection.holderLabel}</span></>
                        )}
                    </p>
                    {/* The two things a driver actually needs: where to go, and by when. */}
                    {(person || due) && !done && (
                        <p className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className={cn('inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold',
                                person ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600')}>
                                {person ? <UserRound size={9} /> : <Building2 size={9} />}
                                {back ? 'to' : 'from'} {place}
                            </span>
                            {due && (
                                <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                    <CalendarClock size={9} /> by {due}
                                </span>
                            )}
                        </p>
                    )}
                </div>
                {!done && !preview && (
                    <button
                        type="button"
                        onClick={() => setPicked(allPicked ? new Set() : new Set(collection.lines.map(l => l.itemId)))}
                        className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                        {allPicked ? 'Clear all' : 'Select all'}
                    </button>
                )}
            </div>

            {/* The list */}
            <ul className="divide-y divide-slate-100">
                {collection.lines.map(line => {
                    const on = shownAsOn(line.itemId);
                    const meta = ROUTE_META[line.route];
                    const interactive = !done && !preview;
                    return (
                        <li key={line.itemId}>
                            <label className={cn('flex items-center gap-2.5 px-3.5 py-2',
                                interactive ? 'cursor-pointer hover:bg-slate-50' : '',
                                done && !on && 'bg-amber-50/50')}>
                                <input
                                    type="checkbox"
                                    checked={on}
                                    disabled={!interactive}
                                    onChange={() => toggle(line.itemId)}
                                    className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 disabled:opacity-100"
                                />
                                <Boxes size={14} className="shrink-0 text-slate-400" />
                                <span className="min-w-0 flex-1">
                                    <span className={cn('block truncate text-[13px] font-semibold',
                                        done && !on ? 'text-slate-500' : 'text-slate-800')}>
                                        {line.name}
                                    </span>
                                    {line.serial && <span className="block truncate font-mono text-[11px] text-slate-400">{line.serial}</span>}
                                </span>
                                <span className={cn('shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', meta.cls)}>
                                    <meta.Icon size={9} className="mr-0.5 inline" />{meta.label}
                                </span>
                            </label>
                        </li>
                    );
                })}
            </ul>

            {/* Footer */}
            {done ? (
                <div className={cn('border-t px-3.5 py-2.5 text-[12px]',
                    outstanding.length ? 'border-amber-100 bg-amber-50/70 text-amber-800' : 'border-emerald-100 bg-emerald-50/70 text-emerald-800')}>
                    {outstanding.length === 0 ? (
                        <span className="flex items-center gap-1.5 font-semibold">
                            <Check size={13} /> {copy.allDone(all, collection.driverName)}
                        </span>
                    ) : (
                        <>
                            {/* Rounding a partial pick-up up to "done" is how the office ends up
                                believing something is out when it is still on the shelf. */}
                            <span className="flex items-center gap-1.5 font-semibold">
                                <Clock size={13} /> {confirmed.size} of {all} done — {outstanding.length} {copy.partial}.
                            </span>
                            <span className="mt-1 block text-[11px] text-amber-700">
                                {copy.outstanding}: {outstanding.map(l => l.name).join(', ')}
                            </span>
                        </>
                    )}
                </div>
            ) : preview ? (
                <div className="border-t border-slate-100 bg-slate-50/70 px-3.5 py-2.5 text-[12px] text-slate-500">
                    {copy.waiting(collection.driverName)}
                </div>
            ) : (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
                    <span className="text-[11px] text-slate-500">
                        {picked.size === 0
                            ? copy.prompt
                            : <><span className="font-semibold text-slate-700">{picked.size}</span> of {all} ticked
                                {!back && anyHanded && picked.size > 0 && ' · signing for these'}</>}
                    </span>
                    <button
                        type="button"
                        onClick={() => onConfirm([...picked])}
                        disabled={picked.size === 0}
                        className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold text-white transition-colors',
                            picked.size === 0 ? 'cursor-not-allowed bg-slate-300' : 'bg-blue-600 hover:bg-blue-700')}
                    >
                        <Check size={13} /> {picked.size === all ? copy.confirmAll : copy.confirmSome(picked.size, all)}
                    </button>
                </div>
            )}
        </div>
    );
}
