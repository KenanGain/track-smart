// ─────────────────────────────────────────────────────────────────────────────
// LastServiceDialog — when was this last done, and who should be told before the next one.
//
// Asked from two places now: a rule’s own asset list, and an asset’s maintenance tab. Both
// ask the identical question, so they ask it with the identical form rather than with two
// that drift apart.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { Gauge, Clock, CalendarDays, Bell } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    projectClocks, soonestClock, reminderPoints, channelText,
    REMINDER_CHOICES, DEFAULT_REMINDERS,
    type AssetEnrollment, type AssetKind, type ClockDue, type MeterReading,
    type ReminderSettings,
} from './service-intervals';
import type { ServiceIntervals } from '@/types/service-types';
import { cn } from '@/lib/utils';

/**
 * One asset, as this page needs it.
 *
 * The page used to be handed a label and an odometer and work the rest out, which is how
 * every unit on it came to read "Trailer" with nothing on the clock: the ids it was
 * looking up belonged to a fleet that no task has ever pointed at. The caller owns the
 * fleet, so the caller answers.
 */
export interface IntervalAssetInfo {
    id: string;
    /** What people call it — the unit number. */
    label: string;
    kind?: AssetKind;
    /** "2021 Freightliner Cascadia". */
    description?: string;
    driver?: string;
    meter: MeterReading;
}

/** What switching an asset on asks for, in the clocks the rule actually runs. */
export interface LastService {
    odometer?: number;
    engineHours?: number;
    date?: string;
    /** When to speak up before the next one falls due. */
    reminders?: ReminderSettings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Starting an asset’s countdown — and being told before it ends
//
// Switching the rule on for an asset is one question: when was this last done? Asked once
// per clock the rule runs on, because a real PM rule runs on all three — 25,000 miles,
// 500 engine hours or 180 days, whichever comes first — and each is counted from its own
// last reading. Nothing else is asked: a rule that goes by days has no business wanting
// an odometer, and asking for one is how a form teaches people to type anything.
//
// The second half is the warning. "In 30 days" is no use on a rule that goes by miles, so
// the reminders are set in each clock’s own unit, and the form says in words where each
// one will land before you save it.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One clock, as a card: what it runs on, what it last read, where that puts it.
 *
 * Standing up rather than lying across, so three of them sit side by side and the whole
 * rule is one glance instead of a column you scroll.
 */
export function ClockField({ Icon, title, every, suffix, value, onChange, hint, children }: {
    Icon: React.ElementType;
    title: string;
    every: string;
    suffix?: string;
    value: string;
    onChange: (v: string) => void;
    hint?: React.ReactNode;
    /** The preview of where this lands, worked out by the caller. */
    children?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon size={16} />
                </span>
                <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-900">{title}</div>
                    <p className="truncate text-xs text-slate-500">{every}</p>
                </div>
            </div>

            <div className="relative mt-3">
                <input
                    type={suffix ? 'number' : 'date'}
                    min={suffix ? 0 : undefined}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={cn(
                        'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                        suffix && 'pr-10 tabular-nums',
                    )}
                />
                {suffix && (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">{suffix}</span>
                )}
            </div>
            {hint && <p className="mb-3 mt-1.5 text-xs text-slate-500">{hint}</p>}

            {/* Where this reading lands, along the bottom of its own card. */}
            {/* Pushed to the foot of the card, so three of them line up across. */}
            {children && <div className="mt-auto border-t border-slate-100 pt-2.5">{children}</div>}
        </div>
    );
}

/** A row of "N before" boxes for one clock. */
/** One clock's "warn me this far ahead" choices. Also worn by the monitoring dialog. */
export function ReminderRow({ label, options, chosen, onToggle, format }: {
    label: string;
    options: readonly number[];
    chosen: number[];
    onToggle: (n: number) => void;
    format: (n: number) => string;
}) {
    return (
        <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-2">
                {options.map((n) => (
                    <label key={n} className="flex cursor-pointer items-center gap-2 whitespace-nowrap">
                        <input
                            type="checkbox"
                            checked={chosen.includes(n)}
                            onChange={() => onToggle(n)}
                            className="h-4 w-4 rounded accent-blue-600"
                        />
                        <span className="text-sm text-slate-700">{format(n)}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

export function StartTrackingDialog({ asset, intervals, enrolled, editing, onClose, onConfirm }: {
    asset: IntervalAssetInfo;
    intervals?: ServiceIntervals;
    /** What was entered last time, when this is a correction rather than a start. */
    enrolled?: AssetEnrollment;
    editing?: boolean;
    onClose: () => void;
    onConfirm: (last: LastService) => void;
}) {
    const unit = intervals?.mileage?.unit === 'km' ? 'km' : 'mi';
    // The meter is kept in miles; a fleet that works in kilometres is shown kilometres.
    const meterInUnit = unit === 'km'
        ? Math.round(asset.meter.odometer / 0.621371)
        : asset.meter.odometer;

    const [odometer, setOdometer] = useState(
        intervals?.mileage ? String(enrolled?.lastOdometer ?? meterInUnit ?? '') : '');
    const [hours, setHours] = useState(
        intervals?.engineHours ? String(enrolled?.lastEngineHours ?? asset.meter.engineHours ?? '') : '');
    const [date, setDate] = useState(
        enrolled?.lastServiceDate ?? new Date().toISOString().slice(0, 10));
    const [reminders, setReminders] = useState<ReminderSettings>(
        enrolled?.reminders ?? DEFAULT_REMINDERS);

    const needsOdometer = !!intervals?.mileage;
    const needsHours = !!intervals?.engineHours;
    const needsDate = !!intervals?.days;
    const nothingAsked = !needsOdometer && !needsHours && !needsDate;
    const clockCount = [needsOdometer, needsHours, needsDate].filter(Boolean).length;

    const valid = (!needsOdometer || odometer.trim() !== '')
        && (!needsHours || hours.trim() !== '')
        && (!needsDate || !!date);

    /** What the readings on screen come to — recomputed as they are typed. */
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

    const toggle = (key: 'miles' | 'hours' | 'days', n: number) =>
        setReminders((r) => ({
            ...r,
            [key]: r[key].includes(n) ? r[key].filter((x) => x !== n) : [...r[key], n].sort((a, b) => b - a),
        }));

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="flex max-h-[88vh] flex-col overflow-hidden p-0 sm:max-w-[940px]">
                {/* Header — the app’s form chrome, in a dialog: icon tile, what this is, what it is about. */}
                <div className="flex shrink-0 items-start gap-3 border-b border-slate-200 px-6 py-5 pr-12">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Gauge size={18} />
                    </span>
                    <div className="min-w-0">
                        <DialogHeader>
                            <DialogTitle>
                                {editing ? `Last service — ${asset.label}` : `Start tracking ${asset.label}`}
                            </DialogTitle>
                            <DialogDescription>
                                {nothingAsked
                                    ? 'This interval has no clock, so its task is raised by hand.'
                                    : clockCount > 1
                                        ? `This interval runs on ${clockCount} clocks — whichever comes first is what falls due.`
                                        : 'When was this last serviced? The next one is counted from here.'}
                            </DialogDescription>
                        </DialogHeader>
                        <p className="mt-1 text-xs text-slate-500">
                            {asset.description ?? (asset.kind === 'truck' ? 'Truck' : 'Trailer')}
                            {asset.driver ? ` · ${asset.driver}` : ''}
                        </p>
                    </div>
                </div>

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-slate-50/60 px-6 py-5">
                    {/* ── Last service ── one card per clock, each with where it lands. */}
                    {!nothingAsked && (
                        <section className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="h-5 w-1 rounded-full bg-blue-600" />
                                <h3 className="text-sm font-bold text-slate-900">Last service</h3>
                            </div>

                            {/* One column per clock, side by side: a rule that runs on three is
                                three things to read at once, not a list to scroll. */}
                            <div className={cn(
                                'grid gap-3',
                                clockCount === 2 && 'sm:grid-cols-2',
                                clockCount >= 3 && 'sm:grid-cols-2 lg:grid-cols-3',
                            )}>
                            {needsOdometer && (
                                <ClockField
                                    Icon={Gauge}
                                    title="By mileage"
                                    every={`every ${intervals?.mileage?.every.toLocaleString()} ${unit}`}
                                    suffix={unit}
                                    value={odometer}
                                    onChange={setOdometer}
                                    hint={`Reads ${meterInUnit.toLocaleString()} ${unit} now`}
                                >
                                    <NextDue clock={preview.find((c) => c.unit === 'miles')} first={first} />
                                </ClockField>
                            )}

                            {needsHours && (
                                <ClockField
                                    Icon={Clock}
                                    title="By engine hours"
                                    every={`every ${intervals?.engineHours?.every.toLocaleString()} h`}
                                    suffix="h"
                                    value={hours}
                                    onChange={setHours}
                                    hint={`Reads ${asset.meter.engineHours.toLocaleString()} h now`}
                                >
                                    <NextDue clock={preview.find((c) => c.unit === 'engine_hours')} first={first} />
                                </ClockField>
                            )}

                            {needsDate && (
                                <ClockField
                                    Icon={CalendarDays}
                                    title="By days"
                                    every={`every ${intervals?.days?.every.toLocaleString()} days`}
                                    value={date}
                                    onChange={setDate}
                                    hint="The day it was last done"
                                >
                                    <NextDue clock={preview.find((c) => c.unit === 'days')} first={first} />
                                </ClockField>
                            )}
                            </div>

                            {clockCount > 1 && first && (
                                <p className="px-1 text-xs text-slate-500">
                                    On these readings it falls due first on{' '}
                                    <span className="font-semibold text-slate-700">{first.label.toLowerCase()}</span>
                                    {' · '}{first.remainingText}.
                                </p>
                            )}
                        </section>
                    )}

                    {/* ── Monitoring & Notifications ── the same card the rest of the app wears,
                        in the units this rule runs on. */}
                    {!nothingAsked && (
                        <section className="rounded-xl border-l-4 border-l-blue-600 border-y border-r border-slate-200 bg-white">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                    <Bell size={16} className="text-blue-600" />
                                    <h3 className="text-sm font-bold text-slate-900">Monitoring &amp; Notifications</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-600">
                                        {reminders.enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                    <Switch
                                        checked={reminders.enabled}
                                        onCheckedChange={(v) => setReminders((r) => ({ ...r, enabled: v }))}
                                    />
                                </div>
                            </div>

                            {reminders.enabled && (
                                <div className="space-y-4 px-4 py-4">
                                    <div className={cn(
                                        'grid grid-cols-1 gap-4 sm:grid-cols-2',
                                        clockCount >= 3 && 'xl:grid-cols-4',
                                    )}>
                                        {needsOdometer && (
                                            <ReminderRow
                                                label="Before mileage"
                                                options={REMINDER_CHOICES.miles}
                                                chosen={reminders.miles}
                                                onToggle={(n) => toggle('miles', n)}
                                                format={(n) => `${n.toLocaleString()} ${unit} before`}
                                            />
                                        )}
                                        {needsHours && (
                                            <ReminderRow
                                                label="Before engine hours"
                                                options={REMINDER_CHOICES.hours}
                                                chosen={reminders.hours}
                                                onToggle={(n) => toggle('hours', n)}
                                                format={(n) => `${n} h before`}
                                            />
                                        )}
                                        {needsDate && (
                                            <ReminderRow
                                                label="Before the date"
                                                options={REMINDER_CHOICES.days}
                                                chosen={reminders.days}
                                                onToggle={(n) => toggle('days', n)}
                                                format={(n) => (n === 0 ? 'On the day' : `${n} days before`)}
                                            />
                                        )}
                                        <div>
                                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Notification channels</div>
                                            <div className="mt-1.5 flex flex-wrap gap-4">
                                                <label className="flex cursor-pointer items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={reminders.channels.email}
                                                        onChange={(e) => setReminders((r) => ({ ...r, channels: { ...r.channels, email: e.target.checked } }))}
                                                        className="h-4 w-4 rounded accent-blue-600"
                                                    />
                                                    <span className="text-sm text-slate-700">Email</span>
                                                </label>
                                                <label className="flex cursor-pointer items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={reminders.channels.inApp}
                                                        onChange={(e) => setReminders((r) => ({ ...r, channels: { ...r.channels, inApp: e.target.checked } }))}
                                                        className="h-4 w-4 rounded accent-blue-600"
                                                    />
                                                    <span className="text-sm text-slate-700">In-App</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Where each warning lands, in words, before anything is saved. */}
                                    <div className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                                        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                                        <div className="min-w-0">
                                            <h4 className="text-xs font-bold text-blue-900">Projected Notification Schedule</h4>
                                            {preview.length === 0 ? (
                                                <p className="mt-0.5 text-xs text-blue-700">
                                                    Fill in the last service above and this will say exactly when you will be told.
                                                </p>
                                            ) : (
                                                <ul className="mt-1 space-y-0.5">
                                                    {preview.map((c) => {
                                                        const points = reminderPoints(c, reminders);
                                                        return (
                                                            <li key={c.unit} className="text-xs leading-snug text-blue-700">
                                                                <span className="font-semibold">{c.label}:</span>{' '}
                                                                due {c.dueText}
                                                                {points.length ? ` · warn at ${points.join(', ')}` : ' · nothing set'}
                                                            </li>
                                                        );
                                                    })}
                                                    <li className="pt-0.5 text-xs text-blue-700">via {channelText(reminders)}.</li>
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}
                </div>

                <DialogFooter className="mt-0 shrink-0 border-t border-slate-200 bg-white px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={!valid}
                        onClick={() => onConfirm({
                            odometer: needsOdometer && odometer.trim() !== '' ? Number(odometer) : undefined,
                            engineHours: needsHours && hours.trim() !== '' ? Number(hours) : undefined,
                            date: needsDate ? date : undefined,
                            reminders,
                        })}
                        className={cn(
                            'rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors',
                            valid ? 'bg-blue-600 hover:bg-blue-700' : 'cursor-not-allowed bg-slate-300',
                        )}
                    >
                        {editing ? 'Save' : 'Start tracking'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/** Where one clock lands on the readings typed so far, and whether it is the first to. */
export function NextDue({ clock, first }: { clock?: ClockDue; first?: ClockDue }) {
    if (!clock) {
        return <p className="text-[11px] text-slate-400">Fill this in to see where it lands.</p>;
    }
    const isFirst = first?.unit === clock.unit;
    return (
        <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Next due</div>
                <div className={cn('truncate text-sm font-bold tabular-nums', clock.over ? 'text-red-600' : 'text-slate-900')}>
                    {clock.dueText}
                </div>
                <div className={cn('text-[11px] font-semibold', clock.over ? 'text-red-600' : 'text-slate-500')}>
                    {clock.remainingText}
                </div>
            </div>
            {isFirst && (
                <span className="shrink-0 self-start rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                    First
                </span>
            )}
        </div>
    );
}
