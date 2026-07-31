import { useEffect, useState } from 'react';

/**
 * Activity log for the Default Compliance Monitoring page — records the actions a user
 * takes on an alert (renew / set next date, update status, remove from monitoring).
 * localStorage + CustomEvent, mirrors the other per-carrier stores. Append-only.
 */

export type MonitoringActionType = 'renewed' | 'status' | 'removed' | 'assigned' | 'requested' | 'notified';

export interface MonitoringAction {
    id: string;
    acct: string;
    recordId: string;
    subjectId: string;
    instanceName?: string;
    recordName: string;
    subjectLabel: string;
    type: MonitoringActionType;
    detail: string;
    at: string;   // ISO timestamp
    by: string;
}

const KEY = 'compliance-monitoring-actions-v1';
const EVENT = 'compliance-monitoring-actions-change';

function loadAll(): MonitoringAction[] {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) return JSON.parse(raw) as MonitoringAction[];
    } catch { /* ignore */ }
    return [];
}
function persist(list: MonitoringAction[]) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* quota — best-effort */ }
    window.dispatchEvent(new CustomEvent(EVENT));
}

export type NewMonitoringAction = Omit<MonitoringAction, 'id' | 'at' | 'acct' | 'by'> & { by?: string };

export function useMonitoringActions(acct: string) {
    const [all, setAll] = useState<MonitoringAction[]>(loadAll);
    useEffect(() => {
        const h = () => setAll(loadAll());
        window.addEventListener(EVENT, h);
        window.addEventListener('storage', h);
        return () => { window.removeEventListener(EVENT, h); window.removeEventListener('storage', h); };
    }, []);

    // Newest first, scoped to this carrier.
    const actions = all.filter(a => a.acct === acct).sort((a, b) => b.at.localeCompare(a.at));

    const log = (a: NewMonitoringAction) => {
        const entry: MonitoringAction = {
            ...a,
            acct,
            by: a.by ?? 'You',
            id: `ma-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            at: new Date().toISOString(),
        };
        persist([entry, ...loadAll()]);
    };

    return { actions, log };
}
