// ─────────────────────────────────────────────────────────────────────────────
// AddServiceRecordPage — the service happened. File it.
//
// The gap this closes
// ───────────────────
// A countdown says a unit is due. What happens next is either a work order — raised
// here, sent to a shop, closed with an invoice — or it is the other half of real life:
// the truck was already in, the driver had it done on the road, the yard mechanic did
// it on a Saturday. In those cases nobody raised an order, and the only way to tell the
// app was "correct the last service", which moves a number and keeps nothing: no
// vendor, no receipt, no bill, no document.
//
// So this is the second way a service enters the record, and it writes the SAME entry a
// closed work order writes. One ledger, two doors into it. The countdown resets because
// the entry is the newest one for the pair — not because this form reaches in and sets
// it.
//
// Four questions, in the order a shop answers them
// ────────────────────────────────────────────────
//   1. What the meters read, and when. All three are captured whatever the rule counts:
//      a record of a brake job that does not say what the odometer stood at is worth
//      less a year later, and the rule it was filed under is not the only thing that
//      will ever want to know. Only the clocks this rule runs show where it puts the
//      next one.
//   2. Where it was done — the vendor, picked from the carrier's own list, or typed for
//      a shop that is not on it.
//   3. Who did it — the driver or a mechanic. A separate question from the vendor,
//      because they are separate facts: a driver can have work done at a shop (both), a
//      yard mechanic does it with no shop at all, and a shop can invoice for work
//      nobody here watched.
//   4. The bill and the paper it comes on. Labour and parts, which is how an invoice is
//      actually written, with the total read off them rather than typed a third time.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Gauge, Receipt, Store, Wrench, UserRound, FileText, X,
    ClipboardCheck, TriangleAlert, Check, StickyNote, Lock, Eye,
} from 'lucide-react';
import {
    WizardHeader, WizardSection, WizardStepNav, type WizardStep,
} from '@/components/ui/WizardEditor';
import { UploadZone } from '@/components/ui/UploadZone';
import { Combobox } from '@/components/ui/combobox';
import { TagField } from '@/components/ui/TagField';
import { MAX_RECORD_DOCS, type ServiceDocument } from './service-history';
import type { IntervalAssetInfo } from './LastServiceDialog';
import type { AssetIntervalLine } from './MaintenanceAssetsTable';
import { STATE_PILL } from './AssetIntervalPage';
import { projectClocks, soonestClock, type ClockDue } from './service-intervals';
import type { ServiceIntervals } from '@/types/service-types';
import { cn } from '@/lib/utils';

/** Who turned the spanner — not where it was done, which is the vendor. */
export type ServicePerformedBy = 'driver' | 'mechanic';

/** One service, as this form captures it. The caller turns it into a ledger entry. */
export interface ServiceRecordDraft {
    /** yyyy-mm-dd — the day the work was done, not the day it was typed. */
    date: string;
    /** In the rule's own unit. Captured whether or not the rule counts it. */
    odometer?: number;
    engineHours?: number;
    /** The shop that did it, where there was one. */
    vendorId?: string;
    vendorName?: string;
    performedBy: ServicePerformedBy;
    /** The driver, where they are on the roster rather than typed. */
    driverId?: string;
    /** The person's name — the driver's, or the mechanic's. */
    performedByName?: string;
    /** The receipt number, which is how the paper is found again. */
    invoiceNumber?: string;
    labour?: number;
    parts?: number;
    /** labour + parts, so the record and the sum of its lines cannot disagree. */
    cost?: number;
    currency: string;
    notes?: string;
    /** What to watch next time, which is not the same thing as what happened this time. */
    remarks?: string;
    /**
     * The paper, each piece of it saying what it is.
     *
     * Not one invoice: a visit comes back with the bill, the shop's own sheet, a safety
     * certificate and photographs of what was found. They are filed together because
     * they are one visit, and tagged apart because they answer different questions a
     * year later.
     */
    files: ServiceDocument[];
}

const STEPS: readonly WizardStep[] = [
    { id: 'readings', label: 'Readings', icon: Gauge },
    { id: 'who', label: 'Vendor and performed by', icon: Store },
    { id: 'bill', label: 'Bill & document', icon: Receipt },
    { id: 'notes', label: 'Notes & remarks', icon: StickyNote },
];

const FIELD = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20';

/**
 * A field's label, and whether the form will refuse without it.
 *
 * The same blue pill the repair-bill form uses, rather than a red asterisk: an asterisk
 * on one screen beside a pill on the next makes the two look like different products.
 * It is driven by the same `missing` list the Save button reads, so a pill never claims
 * something is required that the form would in fact accept.
 */
function L({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <span className="mb-1.5 flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{children}</span>
            {required && (
                <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-600">
                    Required
                </span>
            )}
        </span>
    );
}

/**
 * One labelled box, with its unit inside it and its note under it.
 *
 * The readings used to borrow the standing cards the start-tracking dialog uses - icon
 * tile, title, sub-title, input, a ruled footer with the next due date in it. Three of
 * those is half a screen to collect three numbers, and in a three-column grid the tile
 * squeezed the titles until "Operating hours" read "Operating ...". A form is a set of
 * boxes; these are boxes.
 */
function Field({ label, hint, suffix, required, className, children }: {
    label: string;
    hint?: string;
    suffix?: string;
    required?: boolean;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div className={className}>
            <L required={required}>{label}</L>
            <div className="relative">
                {children}
                {suffix && (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                        {suffix}
                    </span>
                )}
            </div>
            {hint && <p className="mt-1 truncate text-[11px] text-slate-500">{hint}</p>}
        </div>
    );
}

export function AddServiceRecordPage({
    asset, intervalName, intervals, vendors, drivers, services, line, initial, lockedVendor,
    onCancel, onSave,
}: {
    asset: IntervalAssetInfo;
    intervalName: string;
    intervals?: ServiceIntervals;
    /** The carrier's own shops, so the record names one that exists. */
    vendors: { id: string; name: string }[];
    /** The carrier's own drivers, for the same reason. */
    drivers: { id: string; name: string }[];
    /**
     * What this rule actually has done to the truck.
     *
     * The header names the rule, and "PM-B" is a code, not a job. Somebody filing a bill
     * needs to see that PM-B means an oil change, a brake inspection and a greased fifth
     * wheel — both to know they are on the right record, and to read the invoice in
     * front of them against it.
     */
    services?: string[];
    /**
     * Where the rule stands on this unit, right now.
     *
     * Filing a record RESETS a countdown, and until now the form never said what it was
     * resetting: you were typing an odometer into a box with no sight of the 450 miles
     * that were left on it, when it was last done, or whether it was already past. The
     * same figures the row you came from was showing — not a second opinion about them.
     */
    line?: AssetIntervalLine;
    /**
     * An entry being corrected, rather than a service being filed.
     *
     * The same form either way, because it is the same question. A second, smaller
     * "correct this" dialog asking for four of the twelve fields was a second place for
     * the record's shape to be decided, and it quietly threw away everything it did not
     * ask about — the vendor, the person, the bill's own lines, the document.
     */
    initial?: ServiceRecordDraft;
    /**
     * The shop, already settled — so the form shows it instead of asking.
     *
     * A record filed from a work order has no vendor question left in it: the order was
     * raised against one shop, the work was sent there, and the invoice coming back has
     * that shop's name on it. Asking again is a second chance to get it wrong, and a
     * record naming a vendor that never saw the truck is a cost filed against the wrong
     * company for the life of the unit.
     */
    lockedVendor?: { id?: string; name: string };
    onCancel: () => void;
    onSave: (draft: ServiceRecordDraft) => void;
}) {
    const editing = !!initial;
    const unit = intervals?.mileage?.unit === 'km' ? 'km' : 'mi';
    // The meter is kept in miles; a fleet that works in kilometres is shown kilometres.
    const meterInUnit = unit === 'km'
        ? Math.round(asset.meter.odometer / 0.621371)
        : asset.meter.odometer;

    // Which clocks this RULE counts. Every reading is still captured — this only decides
    // which of them get a "next due" worked out underneath.
    const countsMiles = !!intervals?.mileage;
    const countsHours = !!intervals?.engineHours;
    const countsDays = !!intervals?.days;

    const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
    // Pre-filled with what the unit reads now, because that is what it read when it came
    // out of the shop this morning — and a number already there gets corrected, where an
    // empty box gets skipped.
    const str = (v?: number) => (v == null ? '' : String(v));
    const [odometer, setOdometer] = useState(initial ? str(initial.odometer) : String(meterInUnit));
    const [hours, setHours] = useState(initial ? str(initial.engineHours) : String(asset.meter.engineHours));

    const [vendorId, setVendorId] = useState(lockedVendor?.id ?? initial?.vendorId ?? '');
    // A shop named on the entry that is not in the list stays typed, rather than
    // silently becoming "no vendor" the first time somebody opens the form.
    const typedIn = !lockedVendor && !!initial?.vendorName && !initial?.vendorId;
    const [typedVendor, setTypedVendor] = useState(typedIn ? initial!.vendorName! : '');
    const [typing, setTyping] = useState(typedIn);

    const [performedBy, setPerformedBy] = useState<ServicePerformedBy>(initial?.performedBy ?? 'mechanic');
    const [driverId, setDriverId] = useState(initial?.driverId ?? '');
    const [mechanic, setMechanic] = useState(
        initial && initial.performedBy !== 'driver' ? (initial.performedByName ?? '') : '');

    const invoiceNumber = initial?.invoiceNumber;
    /*
      * An older entry carries a total and no breakdown — work orders and the opening
      * record were written before this form asked for two lines. It lands in Labour,
      * because that is the line every invoice has, and the alternative is a correction
      * that silently empties the cost column the moment somebody fixes an odometer.
      */
    const [labour, setLabour] = useState(
        initial && initial.labour == null && initial.parts == null
            ? str(initial.cost) : str(initial?.labour));
    const [parts, setParts] = useState(str(initial?.parts));
    const [currency, setCurrency] = useState(initial?.currency ?? 'USD');
    const [notes, setNotes] = useState(initial?.notes ?? '');
    const [remarks, setRemarks] = useState(initial?.remarks ?? '');
    const [files, setFiles] = useState<ServiceDocument[]>(initial?.files ?? []);
    /** What the cap did to the last drop, said out loud rather than silently applied. */
    const [docNote, setDocNote] = useState('');

    /*
     * What the rule was last done at, in each clock's own unit — read off the enrolment
     * the countdowns were measured from, so the strip and the row cannot disagree.
     */
    const lastAt = (clock: ClockDue['unit']) => {
        const e = line?.enrolled;
        if (clock === 'miles') {
            const v = line?.lastService?.odometer ?? e?.lastOdometer;
            return v == null ? undefined
                : `${v.toLocaleString()} ${line?.lastService?.odometerUnit === 'km' ? 'km' : 'mi'}`;
        }
        if (clock === 'engine_hours') {
            return e?.lastEngineHours == null ? undefined : `${e.lastEngineHours.toLocaleString()} h`;
        }
        const d = line?.lastService?.date ?? e?.lastServiceDate;
        return d
            ? new Date(d.length === 10 ? `${d}T08:00:00` : d)
                .toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
            : undefined;
    };

    /** What it was last done at, as one line: the date, then every reading taken then. */
    const lastDone = [lastAt('days'), lastAt('miles'), lastAt('engine_hours')].filter(Boolean);

    const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
    const total = (num(labour) ?? 0) + (num(parts) ?? 0);
    const charged = total > 0;

    const vendorName = lockedVendor
        ? lockedVendor.name
        : typing
            ? typedVendor.trim() || undefined
            : vendors.find((v) => v.id === vendorId)?.name;
    const driverName = drivers.find((d) => d.id === driverId)?.name
        ?? (initial?.performedBy === 'driver' && driverId === (initial.driverId ?? '')
            ? initial.performedByName : undefined);
    const whoName = performedBy === 'driver' ? driverName : mechanic.trim() || undefined;

    /*
     * What is still missing, said in words rather than by a dead button.
     *
     * A disabled Save with no explanation is the commonest way a form wastes somebody's
     * afternoon. Charged work needs its paper: an amount with no document behind it is a
     * figure nobody downstream can check, and this is the record an auditor reads.
     */
    const missing: string[] = [];
    if (!date) missing.push('the date it was done');
    if (countsMiles && odometer.trim() === '') missing.push(`the odometer in ${unit}`);
    if (countsHours && hours.trim() === '') missing.push('the hour meter');
    if (!whoName) missing.push(performedBy === 'driver' ? 'which driver' : "the mechanic's name");
    if (charged && files.length === 0) missing.push('the bill');

    const valid = missing.length === 0;

    /** Where the readings on screen put the next one — recomputed as they are typed. */
    const preview: ClockDue[] = useMemo(() => projectClocks(
        intervals,
        {
            enabled: true,
            lastOdometer: odometer.trim() === '' ? undefined : Number(odometer),
            lastEngineHours: hours.trim() === '' ? undefined : Number(hours),
            lastServiceDate: date || undefined,
        },
        asset.meter,
    ), [intervals, odometer, hours, date, asset.meter]);

    const first = soonestClock(preview);

    const takeFiles = (list: FileList | null) => {
        if (!list) return;
        /*
         * A name and no way to open it is a filename, not a document.
         *
         * The row and the record's page both offer View off `url`, and a file picked here
         * arrived with none — so the one entry that actually had its bill attached was
         * the only one you could not read it from. The blob lives as long as the page
         * does, which is exactly as long as the ledger it belongs to.
         */
        const now = new Date().toISOString();
        const added: ServiceDocument[] = Array.from(list).map((f) => ({
            name: f.name,
            url: URL.createObjectURL(f),
            size: f.size,
            addedAt: now,
            tags: [],
        }));
        setFiles((prev) => {
            const fresh = added.filter((a) => !prev.some((x) => x.name === a.name));
            const dropped = added.length - fresh.length;
            /*
             * Ten per record, and the form says when it stopped.
             *
             * A cap that silently drops the eleventh file is worse than no cap: somebody
             * attaches twelve, sees ten, and has no way to know which two are missing or
             * that any are. So the overflow is named and the count is on the label.
             */
            const room = Math.max(0, MAX_RECORD_DOCS - prev.length);
            const taken = fresh.slice(0, room);
            const over = fresh.length - taken.length;
            setDocNote([
                over > 0 ? `${over} file${over === 1 ? '' : 's'} not attached — a record holds ${MAX_RECORD_DOCS}.` : '',
                dropped > 0 ? `${dropped} already attached.` : '',
            ].filter(Boolean).join(' '));
            return [...prev, ...taken];
        });
    };

    /** One document's own facts — its tags — changed without touching the rest. */
    const patchFile = (name: string, partial: Partial<ServiceDocument>) =>
        setFiles((prev) => prev.map((f) => (f.name === name ? { ...f, ...partial } : f)));

    const atDocCap = files.length >= MAX_RECORD_DOCS;

    // ── Section navigator ── the form scrolls inside `scrollRef` and the rail follows
    // it, exactly as the Add Inventory and Add Asset wizards do.
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [activeStep, setActiveStep] = useState<string>(STEPS[0].id);

    useEffect(() => {
        const root = scrollRef.current;
        if (!root) return;
        const obs = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((e) => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible[0]) setActiveStep(visible[0].target.id.replace('section-', ''));
            },
            { root, rootMargin: '-12px 0px -55% 0px', threshold: 0 },
        );
        for (const st of STEPS) {
            const sec = document.getElementById(`section-${st.id}`);
            if (sec) obs.observe(sec);
        }
        return () => obs.disconnect();
    }, []);

    const go = (id: string) => {
        const sec = document.getElementById(`section-${id}`);
        const el = scrollRef.current;
        if (!sec || !el) return;
        el.scrollTo({
            top: el.scrollTop + (sec.getBoundingClientRect().top - el.getBoundingClientRect().top) - 12,
            behavior: 'smooth',
        });
        setActiveStep(id);
    };

    /** How many answers a section holds — the rail's tick and its count chip. */
    const filled = (id: string) => {
        if (id === 'readings') {
            return [odometer.trim() !== '', hours.trim() !== '', !!date].filter(Boolean).length;
        }
        if (id === 'who') return [!!vendorName, !!whoName].filter(Boolean).length;
        if (id === 'bill') return [charged, files.length > 0].filter(Boolean).length;
        return [notes.trim() !== '', remarks.trim() !== ''].filter(Boolean).length;
    };

    return (
        <div className="flex h-full flex-col bg-[#F8FAFC] text-slate-900">
            <WizardHeader
                backLabel={`Back to ${intervalName} · ${asset.label}`}
                onBack={onCancel}
                icon={ClipboardCheck}
                title={editing ? 'Edit service record' : 'Add service record'}
                subtitle={
                    <span className="flex flex-wrap items-center gap-x-1.5">
                        <span className="font-semibold text-slate-700">{intervalName}</span>
                        <span aria-hidden className="text-slate-300">·</span>
                        <span className="font-semibold text-slate-700">{asset.label}</span>
                        <span aria-hidden className="text-slate-300">·</span>
                        <span>
                            {[
                                asset.description ?? (asset.kind === 'trailer' ? 'Trailer' : 'Truck'),
                                asset.driver,
                            ].filter(Boolean).join(' · ')}
                        </span>
                    </span>
                }
                actions={<>
                    {/* What is still wanted, where Save is — a dead button that will not
                        say why is the commonest way a form wastes an afternoon. */}
                    {!valid && (
                        <span className="inline-flex max-w-sm items-start gap-1.5 self-center text-[12px] leading-snug text-amber-700">
                            <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                            Still needs {missing.join(', ')}.
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={!valid}
                        onClick={() => onSave({
                            date,
                            odometer: num(odometer),
                            engineHours: num(hours),
                            vendorId: typing ? undefined : (vendorId || undefined),
                            vendorName,
                            performedBy,
                            driverId: performedBy === 'driver' ? (driverId || undefined) : undefined,
                            performedByName: whoName,
                            invoiceNumber,
                            labour: num(labour),
                            parts: num(parts),
                            cost: charged ? total : undefined,
                            currency,
                            notes: notes.trim() || undefined,
                            remarks: remarks.trim() || undefined,
                            files,
                        })}
                        className={cn(
                            'flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors',
                            valid ? 'bg-blue-600 hover:bg-blue-700' : 'cursor-not-allowed bg-slate-300',
                        )}
                    >
                        <Check size={16} /> {editing ? 'Save changes' : 'File record'}
                    </button>
                </>}
            />

            <div className="flex flex-1 overflow-hidden">
                <WizardStepNav steps={STEPS} active={activeStep} onGo={go} completionFor={filled} />

                <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto">
                    <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-8">

                        {/*
                          * Where the rule stands, before a single question about resetting it.
                          *
                          * Filing a record moves a countdown, and the form was asking for an
                          * odometer with no sight of the 450 miles that were left on it, when
                          * it was last done, or whether it was already past. These are the
                          * same figures as the row you came from, read off the same line —
                          * "PM-B" is a code, and what it means is a brake inspection, a tire
                          * rotation and a greased fifth wheel.
                          */}
                        {(line || (services?.length ?? 0) > 0) && (
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Resetting
                                    </span>
                                    <span className="text-[14px] font-bold text-slate-900">{intervalName}</span>
                                    <span className="text-[12px] text-slate-400">on {asset.label}</span>
                                    <div className="flex-1" />
                                    {line && (
                                        <span className={cn(
                                            'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                                            STATE_PILL[line.state].cls,
                                        )}>
                                            {STATE_PILL[line.state].label}
                                        </span>
                                    )}
                                </div>

                                {/* Every clock the rule runs: where it falls due, and what is
                                    left on it. A column each, the way the row had them. */}
                                {(line?.clocks.length ?? 0) > 0 && (
                                    <div className="grid gap-px bg-slate-100 sm:grid-cols-3">
                                        {line!.clocks.map((c) => (
                                            <div key={c.unit} className="bg-white px-4 py-3">
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                    {c.label}
                                                </div>
                                                <div className="mt-0.5 truncate text-[13px] font-bold tabular-nums text-slate-900">
                                                    {c.dueText}
                                                </div>
                                                <div className={cn('truncate text-[11px] font-semibold',
                                                    c.over ? 'text-red-600' : 'text-slate-500')}>
                                                    {c.remainingText}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 px-4 py-2.5">
                                    {lastDone.length > 0 && (
                                        <span className="text-[11px] text-slate-500">
                                            <span className="font-bold uppercase tracking-wider text-slate-400">Last done </span>
                                            <span className="font-semibold tabular-nums text-slate-700">
                                                {lastDone.join(' \u00b7 ')}
                                            </span>
                                        </span>
                                    )}
                                    {(services?.length ?? 0) > 0 && (
                                        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                Covers
                                            </span>
                                            {services!.map((sv) => (
                                                <span
                                                    key={sv}
                                                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                                                >
                                                    {sv}
                                                </span>
                                            ))}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── 1. Readings ── all three, whatever the rule counts.
                            A brake job filed without the odometer against it is worth less
                            a year later, and the rule it happened to be filed under is not
                            the only thing that will ever ask. The clocks the rule DOES run
                            get their next-due worked out underneath; the others are simply
                            recorded. */}
                        <WizardSection id="readings" icon={Gauge} title="Readings">
                            <div className="grid gap-4 sm:grid-cols-3">
                                <Field
                                    required
                                    label="Performed on"
                                    hint={countsDays
                                        ? `Comes round every ${intervals?.days?.every.toLocaleString()} days`
                                        : 'The day the work was done'}
                                >
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className={FIELD}
                                    />
                                </Field>
                                {/* Odometer first, then hours — the order every other
                                    screen in this module puts them in, and the order the
                                    two figures are read off a dash. Asked the other way
                                    round, the odometer goes into the hours box: they are
                                    both just numbers once the labels are above them, and
                                    the box that comes first gets the figure you have in
                                    your head. */}
                                <Field
                                    required={countsMiles}
                                    label="Odometer"
                                    suffix={unit}
                                    hint={countsMiles
                                        ? `Reads ${meterInUnit.toLocaleString()} ${unit} now · every ${intervals?.mileage?.every.toLocaleString()} ${unit}`
                                        : `Reads ${meterInUnit.toLocaleString()} ${unit} now`}
                                >
                                    <input
                                        type="number"
                                        min={0}
                                        value={odometer}
                                        onChange={(e) => setOdometer(e.target.value)}
                                        className={cn(FIELD, 'pr-10 tabular-nums')}
                                    />
                                </Field>
                                <Field
                                    required={countsHours}
                                    label="Operating hours"
                                    suffix="h"
                                    hint={countsHours
                                        ? `Reads ${asset.meter.engineHours.toLocaleString()} h now · every ${intervals?.engineHours?.every.toLocaleString()} h`
                                        : `Reads ${asset.meter.engineHours.toLocaleString()} h now`}
                                >
                                    <input
                                        type="number"
                                        min={0}
                                        value={hours}
                                        onChange={(e) => setHours(e.target.value)}
                                        className={cn(FIELD, 'pr-10 tabular-nums')}
                                    />
                                </Field>
                            </div>

                            {/* Where these readings put the next one - one line under the
                                three boxes, for the clocks this rule actually counts. Three
                                ruled card footers saying it separately was the same answer
                                told three times, in three times the space. */}
                            {preview.length > 0 && (
                                <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-slate-100 pt-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Next due
                                    </span>
                                    {preview.map((c) => (
                                        <span key={c.unit} className="text-[12px] text-slate-500">
                                            <span className="font-bold tabular-nums text-slate-900">{c.dueText}</span>
                                            {' '}on {c.label.toLowerCase()}
                                            <span className="text-slate-400"> · {c.remainingText}</span>
                                            {preview.length > 1 && first?.unit === c.unit && (
                                                <span className="ml-1.5 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                                    First
                                                </span>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </WizardSection>

                        {/* ── 2. Who did it ── the shop and the person, side by side.
                            They are two facts, not one — a driver can have work done at a
                            shop (both), a yard mechanic does it with no shop at all, and a
                            shop can invoice for work nobody here watched — but they are
                            one question, and two cards to ask it made the form a screen
                            and a half long. */}
                        {/* `allowOverflow`, because the vendor list is a popover inside
                            this card: without it the card's own `overflow-hidden` cuts the
                            results off mid-row, which is what a fleet with sixty shops
                            sees every time. */}
                        <WizardSection id="who" icon={Store} title="Vendor and performed by" allowOverflow>
                            {/* The shop, on a line of its own and searched rather than
                                scrolled: a carrier with sixty vendors cannot find one in a
                                half-width dropdown. The same control the repair-bill form
                                uses, down to what it says when the shop is not on the list. */}
                            {lockedVendor ? (
                                /* Settled on the order, so it is read back rather than
                                   re-asked. Shown in full — a locked field with nothing in
                                   it tells you less than the order already did. */
                                <div>
                                    <L>Vendor</L>
                                    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                                            <Store size={15} />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-bold text-slate-900">
                                                {lockedVendor.name}
                                            </span>
                                            <span className="block text-[11px] text-slate-500">
                                                From the work order this line is on
                                            </span>
                                        </span>
                                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 shadow-sm">
                                            <Lock size={10} /> Set
                                        </span>
                                    </div>
                                </div>
                            ) : (<div>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <L>Vendor</L>
                                    {/* A shop that is not on the list is still a shop. */}
                                    <button
                                        type="button"
                                        onClick={() => { setTyping((t) => !t); setVendorId(''); }}
                                        className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 transition-colors hover:text-blue-600"
                                    >
                                        {typing ? 'Pick from list' : 'Enter manually'}
                                    </button>
                                </div>
                                {typing ? (
                                    <input
                                        value={typedVendor}
                                        onChange={(e) => setTypedVendor(e.target.value)}
                                        placeholder="Shop name"
                                        className={FIELD}
                                    />
                                ) : (
                                    <Combobox
                                        value={vendorId}
                                        placeholder="Search vendors…"
                                        searchPlaceholder="Search by shop name…"
                                        options={[
                                            { value: '', label: 'No vendor — done in-house' },
                                            ...vendors.map((v) => ({ value: v.id, label: v.name })),
                                        ]}
                                        onValueChange={setVendorId}
                                    />
                                )}
                                <p className="mt-1.5 text-[11px] text-slate-400">
                                    {typing
                                        ? 'Typed shops file against this record by name; they do not join the vendor list.'
                                        : 'Not on the list? Enter manually and the record still files.'}
                                </p>
                            </div>)}

                            {/* Who turned the spanner, on its own line too. The choice decides
                                what the next question is: a driver is on the roster and is
                                picked, a mechanic is not and is typed. */}
                            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                <div>
                                    <L required>Performed by</L>
                                    <div className="flex flex-wrap gap-5">
                                        {([
                                            { id: 'mechanic' as const, label: 'Mechanic', Icon: Wrench },
                                            { id: 'driver' as const, label: 'Driver', Icon: UserRound },
                                        ]).map((o) => (
                                            <label key={o.id} className="flex cursor-pointer items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="performed-by"
                                                    checked={performedBy === o.id}
                                                    onChange={() => setPerformedBy(o.id)}
                                                    className="h-4 w-4 accent-blue-600"
                                                />
                                                <o.Icon size={14} className={performedBy === o.id ? 'text-blue-600' : 'text-slate-400'} />
                                                <span className={cn('text-sm font-semibold',
                                                    performedBy === o.id ? 'text-slate-900' : 'text-slate-500')}>
                                                    {o.label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    {performedBy === 'driver' ? (<>
                                        <L required>Driver</L>
                                        <select
                                            value={driverId}
                                            onChange={(e) => setDriverId(e.target.value)}
                                            className={FIELD}
                                        >
                                            <option value="">Select the driver…</option>
                                            {drivers.map((d) => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                        <p className="mt-1 text-[11px] text-slate-400">
                                            The driver who had it done, so the record names someone
                                            who can be asked about it.
                                        </p>
                                    </>) : (<>
                                        <L required>Mechanic name</L>
                                        <input
                                            value={mechanic}
                                            onChange={(e) => setMechanic(e.target.value)}
                                            placeholder="Dale Foster"
                                            className={FIELD}
                                        />
                                        <p className="mt-1 text-[11px] text-slate-400">
                                            Who did the work — an auditor asking about a brake repair
                                            wants the name on the sheet.
                                        </p>
                                    </>)}
                                </div>
                            </div>
                        </WizardSection>

                        {/* ── 3. The bill and the paper ── one section, because they are one
                            thing: the amount is a claim and the document is the evidence for
                            it. Labour and parts, the way an invoice is actually written,
                            with the total read off them rather than typed a third time. */}
                        <WizardSection id="bill" icon={Receipt} title="Bill & document">
                            {/* Labour, parts and the currency they are in. The receipt
                                number is gone: it was a filing-cabinet reference for a
                                document that is attached to this very record, and its
                                label wrapped onto two lines to ask for it. An entry that
                                already carries one keeps it. */}
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div>
                                    <L>Labour</L>
                                    <input
                                        value={labour}
                                        onChange={(e) => setLabour(e.target.value.replace(/[^\d.]/g, ''))}
                                        placeholder="0.00"
                                        inputMode="decimal"
                                        className={cn(FIELD, 'tabular-nums')}
                                    />
                                </div>
                                <div>
                                    <L>Parts</L>
                                    <input
                                        value={parts}
                                        onChange={(e) => setParts(e.target.value.replace(/[^\d.]/g, ''))}
                                        placeholder="0.00"
                                        inputMode="decimal"
                                        className={cn(FIELD, 'tabular-nums')}
                                    />
                                </div>
                                <div>
                                    <L>Currency</L>
                                    <select
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value)}
                                        className={FIELD}
                                    >
                                        <option value="USD">USD</option>
                                        <option value="CAD">CAD</option>
                                    </select>
                                </div>
                            </div>

                            {/* Read off the two lines above, never typed: a total that can be
                                edited is a total that will one day not be their sum. */}
                            <div className={cn('mt-3 flex items-center justify-between rounded-lg border px-3 py-2',
                                charged ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50')}>
                                <span className={cn('text-[12px] font-bold uppercase tracking-wider',
                                    charged ? 'text-amber-900' : 'text-slate-500')}>
                                    Total
                                </span>
                                <span className={cn('text-[14px] font-bold tabular-nums',
                                    charged ? 'text-amber-900' : 'text-slate-400')}>
                                    {charged ? `${currency} ${total.toFixed(2)}` : '—'}
                                </span>
                            </div>

                            <div className="mt-5">
                                {/* Required once there is money on the record: an amount with
                                    no paper behind it is a figure nobody downstream can check.
                                    The count sits beside it, because a ceiling you cannot see
                                    is one you only meet by hitting it. */}
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <L required={charged}>Documents</L>
                                    <span className={cn('mb-1.5 text-[10px] font-bold tabular-nums',
                                        atDocCap ? 'text-amber-600' : 'text-slate-400')}>
                                        {files.length}/{MAX_RECORD_DOCS}
                                    </span>
                                </div>

                                {/* One card per file, each with its own tags.
                                    A single tag box over the whole upload would say the
                                    record contains an invoice AND a certificate AND two
                                    photos, without ever saying which file is which — and
                                    "which is the certificate" is the only question anybody
                                    asks of this list a year later. The control is the same
                                    one the compliance documents use, over the same catalog. */}
                                {files.length > 0 && (
                                    <div className="mb-3 space-y-3">
                                        {files.map((f, i) => (
                                            <div key={f.name} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                                                <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                                                    <div className="flex min-w-0 items-center gap-2.5">
                                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                                            <FileText size={16} />
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-semibold text-slate-800" title={f.name}>
                                                                {f.name}
                                                            </p>
                                                            <p className="text-[11px] font-medium text-slate-500">
                                                                Document {i + 1}
                                                                {f.size != null ? ` · ${Math.max(1, Math.round(f.size / 1024))} KB` : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-1.5">
                                                        {f.url && (
                                                            <a
                                                                href={f.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                                                            >
                                                                <Eye size={13} /> View
                                                            </a>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setFiles((prev) => prev.filter((x) => x.name !== f.name));
                                                                setDocNote('');
                                                            }}
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                                            aria-label={`Remove ${f.name}`}
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="mt-3">
                                                    <TagField
                                                        value={f.tags ?? []}
                                                        onChange={(tags) => patchFile(f.name, { tags })}
                                                        label="Document tags"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {atDocCap ? (
                                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-800">
                                        This record is holding {MAX_RECORD_DOCS} documents, which is the most one
                                        service takes. Remove one to attach another — or file the rest against
                                        the service they actually belong to.
                                    </p>
                                ) : (
                                    <UploadZone
                                        variant="card"
                                        multiple
                                        label="Click to upload or drag &amp; drop"
                                        hint={`Invoice, inspection sheet, certificate, photos — up to ${MAX_RECORD_DOCS - files.length} more`}
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onFiles={takeFiles}
                                    />
                                )}
                                {docNote && (
                                    <p className="mt-2 text-[11px] font-semibold text-amber-700">{docNote}</p>
                                )}
                            </div>

                        </WizardSection>

                        {/* ── 4. What was said about it ── two boxes, not one.
                            A note is about THIS visit: what was done, why it was late, what
                            the driver reported. A remark is about the NEXT one: linings at
                            30%, a seal starting to weep, a part on back-order. Typed into
                            one box they are read back as one thing, and the half that
                            matters next quarter is the half that gets lost. */}
                        <WizardSection id="notes" icon={StickyNote} title="Notes & remarks">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div>
                                    <L>Notes on this service</L>
                                    <textarea
                                        rows={4}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Anything the next person reading this record should know"
                                        className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                    <p className="mt-1 text-[11px] text-slate-400">
                                        What happened on the day — why it was late, what the driver
                                        reported, anything that explains the bill.
                                    </p>
                                </div>
                                <div>
                                    <L>Remarks for next time</L>
                                    <textarea
                                        rows={4}
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        placeholder="e.g. Linings at 30% — quote for a brake job before the next PM"
                                        className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                    <p className="mt-1 text-[11px] text-slate-400">
                                        What the shop said to watch. It is read when the rule next
                                        comes round, which is the point of writing it down.
                                    </p>
                                </div>
                            </div>
                        </WizardSection>
                    </div>
                </div>
            </div>
        </div>
    );
}
