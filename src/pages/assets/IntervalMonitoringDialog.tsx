// ─────────────────────────────────────────────────────────────────────────────
// IntervalMonitoringDialog — who gets told, and how early, about ONE rule on ONE unit.
//
// The switch on the interval's bar can turn the warnings off, and that is all a switch
// can say. Everything that makes a warning useful — how far ahead of the mileage, how
// many hours out, which days before the date, and down which channel — had no home on
// that page at all: it could only be reached by re-opening "last service", a form about
// something else entirely, and saving readings you did not come to change.
//
// So the same card that form wears is asked on its own, in a dialog, off the switch it
// belongs to. It reads the clocks the rule actually runs: a rule with no hour meter is
// not asked how many hours ahead to warn.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ReminderRow } from './LastServiceDialog';
import {
    reminderPoints, channelText, REMINDER_CHOICES, DEFAULT_REMINDERS,
    type ClockDue, type ReminderSettings,
} from './service-intervals';
import { cn } from '@/lib/utils';

export function IntervalMonitoringDialog({
    intervalName, assetLabel, clocks, unit = 'mi', counting = true, enrolled, onClose, onSave,
}: {
    intervalName: string;
    assetLabel: string;
    /**
     * Whether the rule is counting this unit at all.
     *
     * The same fact the tracking switch in the unit's list holds and the one on the
     * interval's bar reads — there is one of it, and this dialog is the third place it
     * shows. Not counting, there is no "before" to be warned in, so the switch says off
     * and cannot be moved from here: it is the rule that has to be switched on first.
     */
    counting?: boolean;
    /** The clocks this rule runs on this unit, already projected — so the schedule is real. */
    clocks: ClockDue[];
    unit?: 'mi' | 'km';
    enrolled?: ReminderSettings;
    onClose: () => void;
    onSave: (reminders: ReminderSettings) => void;
}) {
    const [reminders, setReminders] = useState<ReminderSettings>(enrolled ?? DEFAULT_REMINDERS);
    // What the other two switches show. A stored preference is not the same thing as
    // being watched, and only one of the two can be on screen.
    const on = counting && reminders.enabled;

    // Only the clocks that are counting. Asking how many hours ahead to warn about a rule
    // that goes by days is a question with no answer, and a checkbox nobody can act on.
    const runs = {
        miles: clocks.some((c) => c.unit === 'miles'),
        hours: clocks.some((c) => c.unit === 'engine_hours'),
        days: clocks.some((c) => c.unit === 'days'),
    };

    const toggle = (key: 'miles' | 'hours' | 'days', n: number) =>
        setReminders((r) => {
            const was = r[key] ?? [];
            return {
                ...r,
                [key]: was.includes(n) ? was.filter((x) => x !== n) : [...was, n].sort((a, b) => b - a),
            };
        });

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            {/* The app's dialog chrome: header and footer pinned, only the middle moves. */}
            <DialogContent className="flex max-h-[88vh] flex-col overflow-hidden p-0 sm:max-w-[860px]">
                <div className="flex shrink-0 items-start gap-3 border-b border-slate-200 px-6 py-5 pr-12">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Bell size={18} />
                    </span>
                    <div className="min-w-0">
                        <DialogHeader>
                            <DialogTitle>Monitoring &amp; Notifications</DialogTitle>
                            <DialogDescription>
                                How early you are warned before this falls due, and down which channel.
                            </DialogDescription>
                        </DialogHeader>
                        <p className="mt-1 text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">{intervalName}</span>
                            {' · '}
                            <span className="font-semibold text-slate-700">{assetLabel}</span>
                        </p>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-6 py-5">
                    <section className="rounded-xl border-y border-r border-l-4 border-slate-200 border-l-blue-600 bg-white">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                            <div className="flex items-center gap-2.5">
                                <Bell size={16} className="text-blue-600" />
                                <h3 className="text-sm font-bold text-slate-900">Monitoring &amp; Notifications</h3>
                            </div>
                            <div
                                className="flex items-center gap-2"
                                title={counting ? undefined : 'Nothing is counting yet, so there is nothing to warn you about'}
                            >
                                <span className="text-sm font-medium text-slate-600">
                                    {on ? 'Enabled' : 'Disabled'}
                                </span>
                                <Switch
                                    checked={on}
                                    disabled={!counting}
                                    onCheckedChange={(v) => setReminders((r) => ({ ...r, enabled: v }))}
                                />
                            </div>
                        </div>

                        {on ? (
                            <div className="space-y-4 px-4 py-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {runs.miles && (
                                        <ReminderRow
                                            label="Before mileage"
                                            options={REMINDER_CHOICES.miles}
                                            chosen={reminders.miles}
                                            onToggle={(n) => toggle('miles', n)}
                                            format={(n) => `${n.toLocaleString()} ${unit} before`}
                                        />
                                    )}
                                    {runs.hours && (
                                        <ReminderRow
                                            label="Before engine hours"
                                            options={REMINDER_CHOICES.hours}
                                            chosen={reminders.hours}
                                            onToggle={(n) => toggle('hours', n)}
                                            format={(n) => `${n} h before`}
                                        />
                                    )}
                                    {runs.days && (
                                        <ReminderRow
                                            label="Before the date"
                                            options={REMINDER_CHOICES.days}
                                            chosen={reminders.days}
                                            onToggle={(n) => toggle('days', n)}
                                            format={(n) => (n === 0 ? 'On the day' : `${n} days before`)}
                                        />
                                    )}
                                    <div>
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Notification channels
                                        </div>
                                        <div className="mt-1.5 flex flex-wrap gap-4">
                                            <label className="flex cursor-pointer items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={reminders.channels.email}
                                                    onChange={(e) => setReminders((r) => ({
                                                        ...r, channels: { ...r.channels, email: e.target.checked },
                                                    }))}
                                                    className="h-4 w-4 rounded accent-blue-600"
                                                />
                                                <span className="text-sm text-slate-700">Email</span>
                                            </label>
                                            <label className="flex cursor-pointer items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={reminders.channels.inApp}
                                                    onChange={(e) => setReminders((r) => ({
                                                        ...r, channels: { ...r.channels, inApp: e.target.checked },
                                                    }))}
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
                                        {clocks.length === 0 ? (
                                            <p className="mt-0.5 text-xs text-blue-700">
                                                Nothing is counting yet, so there is no "before" to warn you in.
                                                Say when this was last done and the schedule appears here.
                                            </p>
                                        ) : (
                                            <ul className="mt-1 space-y-0.5">
                                                {clocks.map((c) => {
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
                        ) : (
                            /* Off is a real answer, and it says what it means rather than
                               hiding the card and leaving you to guess what happens next. */
                            <p className="px-4 py-4 text-[13px] text-slate-500">
                                {counting
                                    ? `This rule still comes due on ${assetLabel} — you simply are not told before it does.`
                                    : `Nothing is counting on ${assetLabel} yet, so there is no "before" to warn you in. Say when it was last done and the warnings can be set.`}
                            </p>
                        )}
                    </section>
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
                        disabled={!counting}
                        onClick={() => onSave({ ...reminders, enabled: on })}
                        className={cn(
                            'rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors',
                            counting ? 'bg-blue-600 hover:bg-blue-700' : 'cursor-not-allowed bg-slate-300',
                        )}
                    >
                        Save monitoring
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
