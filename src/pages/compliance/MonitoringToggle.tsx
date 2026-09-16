// The Monitoring & Notifications block from a compliance record's form.
//
// Lifted out of the Default Compliances & Documents page so the driver application can use
// the very same control. What the application captures BECOMES a compliance record, so the
// alert set on it at hire has to be the alert the office sees afterwards: same bases, same
// reminder days, same channels, same wording. Two look-alike controls would drift, and the
// office would find settings it could not have made itself.

import { useState } from 'react';
import { Bell, CalendarClock, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isDateMonitored, type MonitoredRecord } from '@/pages/compliance/safety-software-catalog.data';
import type { MonitoringConfig, MonitorBasis } from '@/pages/compliance/compliance-data-store';
import {
    MONITOR_BASIS_LABEL, RECURRENCE_OPTIONS, REMINDER_DAYS,
    basisLabel, monitoredDateFor, recurrenceLabel, reminderLabel,
} from '@/pages/compliance/monitoring-schedule';

export function MonitoringToggle({ record, monitoring, issueDate, expiryDate, status, onChange }: {
    record: MonitoredRecord; monitoring: MonitoringConfig; issueDate: string; expiryDate: string; status: string; onChange: (cfg: MonitoringConfig) => void;
}) {
    const cfg = monitoring;
    const [open, setOpen] = useState(true);
    const dated = isDateMonitored(record);
    const monitored = monitoredDateFor(cfg, { issueDate, expiryDate });
    const toggleReminder = (d: number) => onChange({ ...cfg, reminders: cfg.reminders.includes(d) ? cfg.reminders.filter(x => x !== d) : [...cfg.reminders, d] });
    const toggleChannel = (k: 'email' | 'inApp') => onChange({ ...cfg, channels: { ...cfg.channels, [k]: !cfg.channels[k] } });
    // Switching basis: seed the custom date from the current monitored date so it's never blank.
    const pickBasis = (b: MonitorBasis) => onChange({ ...cfg, basis: b, customDate: b === 'custom' && !cfg.customDate ? (expiryDate || issueDate || '') : cfg.customDate });
    const basisOptions: { id: MonitorBasis; label: string }[] = [
        ...(record.tracksIssueDate ? [{ id: 'issue' as MonitorBasis, label: basisLabel(record, 'issue') }] : []),
        { id: 'expiry', label: basisLabel(record, 'expiry') },
        { id: 'custom', label: MONITOR_BASIS_LABEL.custom },
    ];
    const selCls = 'w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400';
    // Projected schedule summary line.
    const remDays = [...cfg.reminders].sort((a, b) => b - a);
    const dayParts = remDays.filter(d => d > 0);
    const onTheDate = remDays.includes(0);
    const reminderText = dayParts.length
        ? `Reminders ${dayParts.join(', ')} days before` + (onTheDate ? ' + on the date' : '')
        : (onTheDate ? 'Reminder on the date' : 'No reminders set');
    const channelText = [cfg.channels.email && 'Email', cfg.channels.inApp && 'In-App'].filter(Boolean).join(', ') || 'no channels';
    // Recurrence is how far past the ISSUE date the next one falls due. Monitoring an expiry
    // or a custom date needs no cadence — that date is already the deadline.
    const showRecurrence = cfg.basis === 'issue';
    const scheduleText = dated
        ? `Monitor ${basisLabel(record, cfg.basis).toLowerCase()}${monitored ? ` (${monitored})` : ''}. ${reminderText}${showRecurrence ? ` · repeats ${recurrenceLabel(cfg.recurrence)}` : ''} · via ${channelText}.`
        : `Notify whenever the status${status ? ` (${status})` : ''} changes · via ${channelText}.`;

    return (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-l-2 border-blue-500 bg-slate-50/70 px-3 py-2">
                <button type="button" onClick={() => setOpen(o => !o)} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-700">
                    <Bell size={13} className="text-blue-500" /> Monitoring &amp; Notifications
                    {cfg.enabled && (open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />)}
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">{cfg.enabled ? 'Enabled' : 'Off'}</span>
                    <button type="button" onClick={() => onChange({ ...cfg, enabled: !cfg.enabled })} aria-pressed={cfg.enabled}
                        className={cn('relative h-5 w-9 rounded-full transition-colors shrink-0', cfg.enabled ? 'bg-blue-600' : 'bg-slate-300')}>
                        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', cfg.enabled ? 'left-[18px]' : 'left-0.5')} />
                    </button>
                </div>
            </div>
            {cfg.enabled && open && (
                <div className="p-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                        {/* LEFT — what/when to monitor */}
                        <div className="space-y-3">
                            {dated ? (
                                <>
                                    <div>
                                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Monitor based on</div>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {basisOptions.map(o => (
                                                <label key={o.id} className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer">
                                                    <input type="radio" name={`mon-basis-${record.id}`} checked={cfg.basis === o.id} onChange={() => pickBasis(o.id)} className="border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                                                    {o.label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Date to monitor</div>
                                        {cfg.basis === 'custom' ? (
                                            <input type="date" value={cfg.customDate} onChange={e => onChange({ ...cfg, customDate: e.target.value })} className={selCls} />
                                        ) : (
                                            <div className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-[13px] font-semibold text-emerald-700"><CalendarClock size={14} /> {monitored || '—'}</div>
                                        )}
                                        {cfg.basis !== 'custom' && (
                                            <p className="mt-1 text-[10px] text-slate-400">Pulled from the {basisLabel(record, cfg.basis).toLowerCase()} above — pick “Custom date” to enter your own.</p>
                                        )}
                                    </div>
                                    {showRecurrence && (
                                        <div>
                                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Renewal recurrence</div>
                                            <select value={cfg.recurrence} onChange={e => onChange({ ...cfg, recurrence: e.target.value })} className={selCls}>
                                                {RECURRENCE_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div>
                                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Monitor based on</div>
                                    <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                                        <ShieldCheck size={14} className="text-slate-400" /> Status changes{status ? ` · currently ${status}` : ''}
                                    </div>
                                    <p className="mt-1 text-[10px] text-slate-400">This record has no expiry — you’re notified whenever its status changes.</p>
                                </div>
                            )}
                        </div>
                        {/* RIGHT — reminders + channels */}
                        <div className="space-y-3">
                            {dated && (
                                <div>
                                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Notification reminders</div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {REMINDER_DAYS.map(d => (
                                            <label key={d} className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer">
                                                <input type="checkbox" checked={cfg.reminders.includes(d)} onChange={() => toggleReminder(d)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                                                {reminderLabel(d)}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div>
                                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Notification channels</div>
                                <div className="flex items-center gap-4">
                                    {(['email', 'inApp'] as const).map(k => (
                                        <label key={k} className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer">
                                            <input type="checkbox" checked={cfg.channels[k]} onChange={() => toggleChannel(k)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                                            {k === 'email' ? 'Email' : 'In-App'}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Projected schedule summary */}
                    <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5">
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700"><Bell size={12} /> Projected Notification Schedule</div>
                        <p className="mt-1 text-[11px] leading-relaxed text-blue-700/90">{scheduleText}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
