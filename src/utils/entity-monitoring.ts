// Per-entity (asset / driver) monitoring for the detail views.
//
// The Asset/Driver detail pages keep their own key-number catalog (KeyNumberConfig
// via useAppData), but monitoring is configured PER individual entity — Truck
// #A can monitor its plate while Truck #B doesn't. We reuse the existing
// per-scope monitoring store (compliance-monitoring.data) keyed by the entity id,
// with item keys `kn:<id>` / `doc:<id>`. When an entity has no override, we seed
// from the catalog config's embedded monitoring fields (or DEFAULT_MONITORING).

import {
    loadMonitoringConfigs, saveMonitoringConfigs, monitorItemKey, reminderSummary,
    DEFAULT_MONITORING, REMINDER_DAYS, type MonitoringConfig,
} from '@/pages/compliance/compliance-monitoring.data';

export type { MonitoringConfig };
export { reminderSummary };

/** A catalog config carrying the legacy embedded monitoring fields. */
interface MonitoringSeed {
    monitoringEnabled?: boolean;
    monitorBasedOn?: 'expiry' | 'issue_date';
    renewalRecurrence?: string;
    reminderDays?: Record<number, boolean>;
    notificationChannels?: { email: boolean; inApp: boolean; sms: boolean };
}

/** Map a catalog config's embedded monitoring fields → a MonitoringConfig. */
function seedToConfig(seed?: MonitoringSeed | null): MonitoringConfig {
    if (!seed) return { ...DEFAULT_MONITORING };
    return {
        enabled: seed.monitoringEnabled ?? DEFAULT_MONITORING.enabled,
        monitorBasedOn: seed.monitorBasedOn ?? DEFAULT_MONITORING.monitorBasedOn,
        renewalRecurrence: (seed.renewalRecurrence as MonitoringConfig['renewalRecurrence']) ?? DEFAULT_MONITORING.renewalRecurrence,
        reminders: seed.reminderDays ?? { ...DEFAULT_MONITORING.reminders },
        channels: seed.notificationChannels ?? { ...DEFAULT_MONITORING.channels },
    };
}

/**
 * Resolve the effective monitoring config for one item on one entity:
 * per-entity override → catalog seed → DEFAULT_MONITORING. `fallbackId` lets a
 * document fall back to its linked key number's config (shared monitoring).
 */
export function resolveEntityMonitoring(
    entityId: string,
    kind: 'kn' | 'doc',
    id: string,
    seedFromConfig?: MonitoringSeed | null,
    fallbackKey?: string,
): MonitoringConfig {
    const configs = loadMonitoringConfigs(entityId);
    const own = configs[monitorItemKey(kind, id)];
    if (own) return own;
    if (fallbackKey && configs[fallbackKey]) return configs[fallbackKey];
    return seedToConfig(seedFromConfig);
}

/**
 * Persist monitoring for one item on one entity. When `linkedId` is given (the
 * KN↔Doc partner) the SAME config is written under the partner key too, so a
 * linked key number and its document always share one monitoring schedule.
 */
export function setEntityMonitoring(
    entityId: string,
    kind: 'kn' | 'doc',
    id: string,
    cfg: MonitoringConfig,
    linkedId?: string | null,
): void {
    const configs = { ...loadMonitoringConfigs(entityId) };
    configs[monitorItemKey(kind, id)] = cfg;
    if (linkedId) {
        const partnerKind = kind === 'kn' ? 'doc' : 'kn';
        configs[monitorItemKey(partnerKind, linkedId)] = cfg;
    }
    saveMonitoringConfigs(entityId, configs);
}

/** Largest active reminder window (days before), for calculateComplianceStatus. */
export function maxReminderDays(cfg: MonitoringConfig): number {
    const on = REMINDER_DAYS.filter(d => cfg.reminders[d]);
    return on.length ? Math.max(...on) : 30;
}

export type AlertTone = 'ok' | 'warning' | 'danger' | 'muted';

/**
 * A compact "when does the alert fire" indicator for a row, derived from the
 * item's expiry + its monitoring schedule.
 */
export function nextAlertIndicator(
    expiryDate: string | null | undefined,
    cfg: MonitoringConfig,
): { text: string; tone: AlertTone } {
    if (!cfg.enabled) return { text: 'Monitoring off', tone: 'muted' };
    const onDays = REMINDER_DAYS.filter(d => cfg.reminders[d]);
    if (!expiryDate) {
        return onDays.length ? { text: reminderSummary(cfg), tone: 'muted' } : { text: 'No reminders', tone: 'muted' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: 'Expired', tone: 'danger' };
    const maxWindow = onDays.length ? Math.max(...onDays) : 0;
    if (diffDays <= maxWindow) return { text: `Reminder active · due in ${diffDays}d`, tone: 'warning' };
    return { text: `Reminds ${reminderSummary(cfg)}`, tone: 'ok' };
}
