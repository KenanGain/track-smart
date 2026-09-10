import { useEffect, useState } from 'react';
import type { SafetyRecord } from '@/pages/compliance/safety-software-catalog.data';

/**
 * User-created CUSTOM records for the "New Compliance & Documents" catalog.
 *
 * The system-default classification (`SAFETY_RECORDS`) is read-only. This store holds
 * extra records a carrier adds for their own documents / compliances (per Carrier, Asset
 * or Driver). They are merged into the Settings catalog AND surfaced on the Default
 * Compliances & Documents data page, where their data-entry form is defined by each
 * record's `customForm`.
 *
 * CARRIER-SCOPED: custom records belong to ONE carrier (account). The store is a map of
 * `accountId → SafetyRecord[]`, so switching the top carrier switcher re-scopes the list.
 *
 * Same localStorage + CustomEvent pattern as the other prototype stores.
 */

const KEY = 'safety-custom-records-v2';
/** Legacy global (non-carrier-scoped) store — records added before per-carrier scoping. */
const LEGACY_KEY = 'safety-custom-records-v1';
/** Tracks which accounts have had the retired demo records swept out (so it runs once). */
const PURGED_KEY = 'safety-custom-records-purged-v1';
const EVENT = 'safety-custom-records-change';
/** Bucket used when no carrier is selected (e.g. the page opened without an account). */
const NO_ACCOUNT = '_noacct';

export function newCustomRecordId(): string {
    return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

type Store = Record<string, SafetyRecord[]>;

function loadStore(): Store {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) return JSON.parse(raw) as Store;
    } catch { /* ignore */ }
    return {};
}

/**
 * One-time carry-over: records added under the old global store are moved — verbatim, so
 * nothing the user already created is lost — into the current carrier's bucket, then the
 * legacy key is cleared so it never runs again. Records without a `customForm` keep working
 * (VersionFields falls back to the built-in field rules for them).
 */
let legacyMigrated = false;
function migrateLegacyInto(acct: string) {
    if (legacyMigrated || acct === NO_ACCOUNT) return;
    let legacy: SafetyRecord[] = [];
    try {
        const raw = localStorage.getItem(LEGACY_KEY);
        if (raw) legacy = JSON.parse(raw) as SafetyRecord[];
    } catch { /* ignore */ }
    if (legacy.length) {
        const store = loadStore();
        store[acct] = [...legacy.map(r => ({ ...r, custom: true })), ...(store[acct] ?? [])];
        try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* ignore */ }
    }
    try { localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
    legacyMigrated = true;
}

/**
 * The two demo custom records ("Business License (Demo 1)", "Insurance Certificates (Demo 2)")
 * were seeded into every carrier's bucket so there was always something to open and edit.
 * They are gone now — but deleting the constants alone would leave the copies already written
 * to each carrier sitting in the catalog forever, so they are swept out once per browser.
 *
 * Only those two ids, and only once (tracked in `PURGED_KEY`): a record the user made
 * themselves is never touched, and a carrier who has already been swept is not swept again.
 */
const DEMO_IDS = ['custom-demo-1', 'custom-demo-2'];
function purgeDemosFrom(acct: string) {
    if (acct === NO_ACCOUNT) return;
    let purged: Record<string, boolean> = {};
    try { purged = JSON.parse(localStorage.getItem(PURGED_KEY) || '{}'); } catch { /* ignore */ }
    if (purged[acct]) return;
    const store = loadStore();
    const list = store[acct] ?? [];
    const kept = list.filter(r => !DEMO_IDS.includes(r.id));
    if (kept.length !== list.length) {
        store[acct] = kept;
        try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* ignore */ }
    }
    purged[acct] = true;
    try { localStorage.setItem(PURGED_KEY, JSON.stringify(purged)); } catch { /* ignore */ }
}

function loadFor(acct: string): SafetyRecord[] {
    migrateLegacyInto(acct);
    purgeDemosFrom(acct);
    const list = loadStore()[acct] ?? [];
    return list.map(r => ({ ...r, custom: true }));
}

function persistFor(acct: string, list: SafetyRecord[]) {
    const store = loadStore();
    store[acct] = list;
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* quota — best-effort for prototype */ }
    window.dispatchEvent(new CustomEvent(EVENT));
}

/** Hook: this carrier's custom records + add/update/remove. Pass the current account id. */
export function useCustomSafetyRecords(accountId?: string) {
    const acct = accountId || NO_ACCOUNT;
    const [records, setRecords] = useState<SafetyRecord[]>(() => loadFor(acct));

    useEffect(() => {
        const h = () => setRecords(loadFor(acct));
        h(); // re-read immediately when the carrier changes
        window.addEventListener(EVENT, h);
        window.addEventListener('storage', h);
        return () => {
            window.removeEventListener(EVENT, h);
            window.removeEventListener('storage', h);
        };
    }, [acct]);

    const add = (r: SafetyRecord) => persistFor(acct, [...loadFor(acct), { ...r, custom: true }]);
    const update = (r: SafetyRecord) => persistFor(acct, loadFor(acct).map(x => (x.id === r.id ? { ...r, custom: true } : x)));
    const remove = (id: string) => persistFor(acct, loadFor(acct).filter(x => x.id !== id));

    return { records, add, update, remove };
}
