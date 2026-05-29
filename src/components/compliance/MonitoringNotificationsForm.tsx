import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toggle } from '@/components/ui/toggle';
import {
    REMINDER_DAYS, reminderSummary,
    type MonitoringConfig, type MonitorBasedOn, type RenewalRecurrence,
} from '@/pages/compliance/compliance-monitoring.data';

const RECURRENCE_OPTIONS: { value: RenewalRecurrence; label: string }[] = [
    { value: 'annually', label: 'Annually (Every 1 Year)' },
    { value: 'biannually', label: 'Biannually (Every 2 Years)' },
    { value: 'quarterly', label: 'Quarterly (Every 3 Months)' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'none', label: 'No Recurrence' },
];

/** The "Monitoring & Notifications" card — controlled form for a MonitoringConfig. */
export function MonitoringNotificationsForm({ value, onChange }: {
    value: MonitoringConfig;
    onChange: (next: MonitoringConfig) => void;
}) {
    const set = (patch: Partial<MonitoringConfig>) => onChange({ ...value, ...patch });

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
            {/* Header + enable toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="h-6 w-1 rounded-full bg-blue-600" />
                    <h2 className="text-base font-bold text-slate-900">Monitoring &amp; Notifications</h2>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600">{value.enabled ? 'Enabled' : 'Disabled'}</span>
                    <Toggle checked={value.enabled} onCheckedChange={(v) => set({ enabled: v })} />
                </div>
            </div>

            {value.enabled && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Left column */}
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Monitor Based On</label>
                            <div className="flex gap-4">
                                {([
                                    { id: 'expiry', label: 'Expiry Date' },
                                    { id: 'issue_date', label: 'Issue Date' },
                                ] as { id: MonitorBasedOn; label: string }[]).map(o => (
                                    <label key={o.id} className="flex cursor-pointer items-center gap-2">
                                        <input
                                            type="radio"
                                            name="monitorBasedOn"
                                            checked={value.monitorBasedOn === o.id}
                                            onChange={() => set({ monitorBasedOn: o.id })}
                                            className="h-4 w-4 accent-blue-600"
                                        />
                                        <span className="text-sm text-slate-700">{o.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Renewal Recurrence</label>
                            <select
                                value={value.renewalRecurrence}
                                onChange={(e) => set({ renewalRecurrence: e.target.value as RenewalRecurrence })}
                                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {RECURRENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Right column */}
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Notification Reminders</label>
                            <div className="grid grid-cols-2 gap-2">
                                {REMINDER_DAYS.map(d => (
                                    <label key={d} className="flex cursor-pointer items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={!!value.reminders[d]}
                                            onChange={(e) => set({ reminders: { ...value.reminders, [d]: e.target.checked } })}
                                            className="h-4 w-4 rounded accent-blue-600"
                                        />
                                        <span className="text-sm text-slate-700">{d} Days Before</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Notification Channels</label>
                            <div className="flex flex-wrap gap-4">
                                {([
                                    { id: 'email', label: 'Email' },
                                    { id: 'inApp', label: 'In-App' },
                                    { id: 'sms', label: 'SMS' },
                                ] as { id: keyof MonitoringConfig['channels']; label: string }[]).map(c => (
                                    <label key={c.id} className="flex cursor-pointer items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={value.channels[c.id]}
                                            onChange={(e) => set({ channels: { ...value.channels, [c.id]: e.target.checked } })}
                                            className="h-4 w-4 rounded accent-blue-600"
                                        />
                                        <span className="text-sm text-slate-700">{c.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Projected schedule */}
                    <div className="md:col-span-2 flex gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        <div>
                            <h4 className="text-xs font-bold text-blue-900">Projected Notification Schedule</h4>
                            <p className={cn("mt-0.5 text-xs leading-snug text-blue-700")}>
                                Monitor {value.monitorBasedOn === 'expiry' ? 'Expiry Date' : 'Issue Date'}. Reminders at {reminderSummary(value)}.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
