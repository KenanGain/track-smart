// ─────────────────────────────────────────────────────────────────────────────
// How a monitoring config reads in words — the vocabulary behind the Monitoring &
// Notifications block.
//
// Lifted out of the Default Compliances & Documents page so the driver application
// can use the very same control. What the application captures BECOMES a compliance
// record, so the alert set on it at hire has to be the alert the office sees
// afterwards: same bases, same reminder days, same channels, same wording. Two
// look-alike controls would drift, and the office would find settings it could not
// have made itself.
//
// Split from the block itself so that file exports only a component, which is what
// fast refresh needs to reload it cleanly.
// ─────────────────────────────────────────────────────────────────────────────

import type { SafetyRecord } from '@/pages/compliance/safety-software-catalog.data';
import type { MonitoringConfig, MonitorBasis } from '@/pages/compliance/compliance-data-store';

/** Reminder offsets offered, in days before the monitored date. 0 = "On the date". */
export const REMINDER_DAYS = [90, 60, 30, 15, 7, 0];
export const reminderLabel = (d: number) => (d === 0 ? 'On the date' : `${d} Days Before`);

/** Renewal cadence options (mirror the settings-catalog MonitoringSettings). */
export const RECURRENCE_OPTIONS: { id: string; label: string }[] = [
    { id: 'none', label: 'Does not recur' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'quarterly', label: 'Quarterly (Every 3 Months)' },
    { id: 'semiannually', label: 'Semi-Annually (Every 6 Months)' },
    { id: 'annually', label: 'Annually (Every 1 Year)' },
    { id: 'biennially', label: 'Every 2 Years' },
    { id: 'triennially', label: 'Every 3 Years' },
    { id: 'fiveyearly', label: 'Every 5 Years' },
];
export function recurrenceLabel(id: string): string { return RECURRENCE_OPTIONS.find(o => o.id === id)?.label ?? id; }

export const MONITOR_BASIS_LABEL: Record<MonitorBasis, string> = {
    issue: 'Issue date', expiry: 'Expiry date', custom: 'Custom date', status: 'Status',
};

/**
 * What to call the monitored date FOR THIS RECORD. The generic "Expiry date" is wrong for
 * anything that is reviewed or renewed rather than expiring — an MVR is monitored on its
 * next renew date, a CDL on its licence expiry — so the record's own `monitorType` names it.
 */
export const basisLabel = (record: SafetyRecord, b: MonitorBasis): string =>
    (b === 'expiry' ? (record.monitorType || MONITOR_BASIS_LABEL.expiry) : MONITOR_BASIS_LABEL[b]);

/** The date the alerts actually count back from, given the chosen basis. */
export function monitoredDateFor(cfg: MonitoringConfig, v: { issueDate: string; expiryDate: string }): string {
    if (cfg.basis === 'status') return '';
    return cfg.basis === 'issue' ? v.issueDate : cfg.basis === 'custom' ? cfg.customDate : v.expiryDate;
}

